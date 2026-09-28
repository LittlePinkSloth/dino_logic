
import { countSolutions } from "./solver.js";


/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const SIZE = 6;

const REGION_COUNT = 6;


/*
 * On limite volontairement le nombre de tentatives
 * par génération.
 *
 * Le générateur est appelé plusieurs fois si nécessaire.
 */

const ATTEMPTS_PER_BATCH = 20;


/*
 * ============================================================
 * OUTILS ALÉATOIRES
 * ============================================================
 */

function randomInt(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function shuffle(array) {

    const result = [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j = randomInt(0, i);


        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }


    return result;
}


/*
 * ============================================================
 * VOISINS ORTHOGONAUX
 * ============================================================
 */

function getOrthogonalNeighbors(index) {

    const row =
        Math.floor(index / SIZE);

    const column =
        index % SIZE;


    const result = [];


    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
    ];


    for (
        const [dr, dc]
        of directions
    ) {

        const r = row + dr;

        const c = column + dc;


        if (
            r >= 0 &&
            r < SIZE &&
            c >= 0 &&
            c < SIZE
        ) {

            result.push(
                r * SIZE + c
            );
        }
    }


    return result;
}


/*
 * ============================================================
 * VOISINS AVEC DIAGONALES
 * ============================================================
 */

function getNeighbors(index) {

    const row =
        Math.floor(index / SIZE);

    const column =
        index % SIZE;


    const result = [];


    for (
        let dr = -1;
        dr <= 1;
        dr++
    ) {

        for (
            let dc = -1;
            dc <= 1;
            dc++
        ) {

            if (
                dr === 0 &&
                dc === 0
            ) {
                continue;
            }


            const r = row + dr;

            const c = column + dc;


            if (
                r >= 0 &&
                r < SIZE &&
                c >= 0 &&
                c < SIZE
            ) {

                result.push(
                    r * SIZE + c
                );
            }
        }
    }


    return result;
}


/*
 * ============================================================
 * GÉNÉRATION D'UNE SOLUTION
 * ============================================================
 *
 * On construit une solution avec :
 *
 * - 1 chat par ligne
 * - 1 chat par colonne
 * - aucun contact, diagonale comprise
 * ============================================================
 */

function generateSolution() {

    const solution = [];

    const usedColumns =
        new Set();


    function search(row) {

        if (
            row === SIZE
        ) {

            return true;
        }


        const columns =
            shuffle(
                Array.from(
                    { length: SIZE },
                    (_, i) => i
                )
            );


        for (
            const column
            of columns
        ) {

            if (
                usedColumns.has(column)
            ) {

                continue;
            }


            const index =
                row * SIZE + column;


            /*
             * Vérifier les chats déjà placés.
             */

            let conflict = false;


            for (
                const other
                of solution
            ) {

                if (
                    getNeighbors(index)
                        .includes(other)
                ) {

                    conflict = true;

                    break;
                }
            }


            if (conflict) {
                continue;
            }


            solution.push(index);

            usedColumns.add(column);


            if (
                search(row + 1)
            ) {

                return true;
            }


            solution.pop();

            usedColumns.delete(column);
        }


        return false;
    }


    return search(0)
        ? solution
        : null;
}


/*
 * ============================================================
 * GÉNÉRATION DES ZONES
 * ============================================================
 */

function generateRegions(solution) {

    const zones =
        new Array(
            SIZE * SIZE
        ).fill(-1);


    const frontiers =
        Array.from(
            { length: REGION_COUNT },
            () => new Set()
        );


    const sizes =
        new Array(REGION_COUNT)
            .fill(1);


    /*
     * Chaque chat devient la graine
     * d'une zone différente.
     */

    solution.forEach(
        (index, zone) => {

            zones[index] = zone;
        }
    );


    /*
     * Initialiser les frontières.
     */

    solution.forEach(
        (index, zone) => {

            for (
                const neighbor
                of getOrthogonalNeighbors(index)
            ) {

                if (
                    zones[neighbor] === -1
                ) {

                    frontiers[zone]
                        .add(neighbor);
                }
            }
        }
    );


    let assigned =
        solution.length;


    /*
     * Faire grandir les zones.
     */

    while (
        assigned < SIZE * SIZE
    ) {

        const available =
            frontiers
                .map(
                    (frontier, zone) => ({
                        zone,
                        size: frontier.size
                    })
                )
                .filter(
                    item =>
                        item.size > 0
                );


        if (
            available.length === 0
        ) {

            return null;
        }


        /*
         * Trier les régions par taille.
         *
         * Les petites régions sont prioritaires.
         */

        available.sort(
            (a, b) =>
                sizes[a.zone] -
                sizes[b.zone]
        );


        /*
         * On choisit très souvent une petite zone,
         * mais avec une part d'aléatoire.
         */

        const candidateCount =
            Math.min(
                3,
                available.length
            );


        const selected =
            available[
                randomInt(
                    0,
                    candidateCount - 1
                )
            ];


        const zone =
            selected.zone;


        const frontier =
            Array.from(
                frontiers[zone]
            );


        const cell =
            frontier[
                randomInt(
                    0,
                    frontier.length - 1
                )
            ];


        /*
         * La case peut avoir été prise.
         */

        if (
            zones[cell] !== -1
        ) {

            frontiers[zone]
                .delete(cell);

            continue;
        }


        /*
         * Attribuer la case.
         */

        zones[cell] = zone;

        sizes[zone]++;

        assigned++;


        /*
         * Retirer cette case de toutes les frontières.
         */

        for (
            const frontierSet
            of frontiers
        ) {

            frontierSet.delete(cell);
        }


        /*
         * Ajouter ses voisins à la frontière.
         */

        for (
            const neighbor
            of getOrthogonalNeighbors(cell)
        ) {

            if (
                zones[neighbor] === -1
            ) {

                frontiers[zone]
                    .add(neighbor);
            }
        }
    }


    /*
     * Éviter les zones trop déséquilibrées.
     */

    const minSize =
        Math.min(...sizes);

    const maxSize =
        Math.max(...sizes);


    if (
        minSize < 3 ||
        maxSize > 12
    ) {

        return null;
    }


    return zones;
}


/*
 * ============================================================
 * VÉRIFIER LA CONNEXITÉ DES ZONES
 * ============================================================
 */

function areRegionsConnected(zones) {

    for (
        let zone = 0;
        zone < REGION_COUNT;
        zone++
    ) {

        const cells = [];


        for (
            let i = 0;
            i < zones.length;
            i++
        ) {

            if (
                zones[i] === zone
            ) {

                cells.push(i);
            }
        }


        if (
            cells.length === 0
        ) {

            return false;
        }


        const visited =
            new Set([
                cells[0]
            ]);


        const queue =
            [cells[0]];


        while (
            queue.length > 0
        ) {

            const current =
                queue.shift();


            for (
                const neighbor
                of getOrthogonalNeighbors(current)
            ) {

                if (
                    zones[neighbor] !== zone
                ) {

                    continue;
                }


                if (
                    visited.has(neighbor)
                ) {

                    continue;
                }


                visited.add(neighbor);

                queue.push(neighbor);
            }
        }


        if (
            visited.size !==
            cells.length
        ) {

            return false;
        }
    }


    return true;
}


/*
 * ============================================================
 * TENTATIVE DE GÉNÉRATION
 * ============================================================
 */

function tryGeneratePuzzle() {

    /*
     * 1. Solution.
     */

    const solution =
        generateSolution();


    if (!solution) {
        return null;
    }


    /*
     * 2. Zones.
     */

    const zones =
        generateRegions(solution);


    if (!zones) {
        return null;
    }


    /*
     * 3. Sécurité : zones continues.
     */

    if (
        !areRegionsConnected(zones)
    ) {

        return null;
    }


    /*
     * 4. Unicité.
     */

    const result =
        countSolutions(
            zones,
            SIZE,
            2
        );


    /*
     * Nous voulons exactement
     * une solution.
     */

    if (
        result.count !== 1
    ) {

        return null;
    }


    return {

        size: SIZE,

        zones,

        solution:
            solution.map(
                index =>
                    index % SIZE
            ),

        metadata: {
            solverNodes:
                result.nodes
        }
    };
}


/*
 * ============================================================
 * GÉNÉRATEUR ASYNCHRONE
 * ============================================================
 *
 * C'est la partie importante.
 *
 * On laisse le navigateur reprendre la main entre
 * les groupes de tentatives.
 * ============================================================
 */

export async function generatePuzzle() {

    while (true) {

        /*
         * Faire seulement quelques tentatives
         * avant de rendre la main au navigateur.
         */

        for (
            let i = 0;
            i < ATTEMPTS_PER_BATCH;
            i++
        ) {

            const puzzle =
                tryGeneratePuzzle();


            if (puzzle) {

                return puzzle;
            }
        }


        /*
         * Donner au navigateur une respiration.
         *
         * Sans cela, une longue génération pourrait
         * bloquer complètement l'interface.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    0
                )
        );
    }
}

