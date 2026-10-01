import { countSolutions } from "./solver.js";
import { getDifficulty } from "./difficulty.js";


/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const DEFAULT_SIZE = 6;


/*
 * Nombre de tentatives effectuées
 * avant de rendre la main au navigateur.
 */

const ATTEMPTS_PER_BATCH = 20;


/*
 * ============================================================
 * OUTILS ALÉATOIRES
 * ============================================================
 */

function randomInt(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;
}


function shuffle(
    array
) {

    const result =
        [...array];


    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            randomInt(
                0,
                i
            );


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
 *
 * Pré-calculés une seule fois pour une génération.
 */

function buildOrthogonalNeighbors(
    size
) {

    const cellCount =
        size * size;


    const neighbors =
        new Array(
            cellCount
        );


    for (
        let index = 0;
        index < cellCount;
        index++
    ) {

        const row =
            Math.floor(
                index / size
            );


        const column =
            index % size;


        const result = [];


        if (
            row > 0
        ) {

            result.push(
                index - size
            );
        }


        if (
            row + 1 < size
        ) {

            result.push(
                index + size
            );
        }


        if (
            column > 0
        ) {

            result.push(
                index - 1
            );
        }


        if (
            column + 1 < size
        ) {

            result.push(
                index + 1
            );
        }


        neighbors[index] =
            result;
    }


    return neighbors;
}


/*
 * ============================================================
 * GÉNÉRATION D'UNE SOLUTION
 * ============================================================
 *
 * On construit une solution avec :
 *
 * - 1 dino par ligne
 * - 1 dino par colonne
 * - aucun contact, diagonale comprise
 *
 * Les lignes sont construites dans l'ordre.
 *
 * Le nouveau dino ne peut donc être adjacent
 * qu'au dino de la ligne précédente.
 *
 * ============================================================
 */

function generateSolution(
    size
) {

    const solution =
        new Int16Array(size);

    solution.fill(-1);


    const usedColumns =
        new Uint8Array(size);


    function search(
        row
    ) {

        /*
         * Solution complète.
         */

        if (
            row === size
        ) {

            return true;
        }


        /*
         * Ordre aléatoire des colonnes.
         */

        const columns =
            shuffle(
                Array.from(
                    {
                        length: size
                    },
                    (_, i) => i
                )
            );


        /*
         * Colonne du dino précédent.
         */

        const previousColumn =
            row > 0
                ? solution[row - 1]
                : -1;


        for (
            const column
            of columns
        ) {

            /*
             * Colonne déjà utilisée.
             */

            if (
                usedColumns[column]
            ) {

                continue;
            }


            /*
             * Même colonne / diagonale
             * avec la ligne précédente.
             */

            if (
                previousColumn !== -1 &&
                Math.abs(
                    column -
                    previousColumn
                ) <= 1
            ) {

                continue;
            }


            /*
             * Placement.
             */

            solution[row] =
                column;

            usedColumns[column] =
                1;


            if (
                search(
                    row + 1
                )
            ) {

                return true;
            }


            /*
             * Retour arrière.
             */

            solution[row] =
                -1;

            usedColumns[column] =
                0;
        }


        return false;
    }


    if (
        !search(0)
    ) {

        return null;
    }


    return Array.from(
        solution
    );
}


/*
 * ============================================================
 * GÉNÉRATION DES ZONES
 * ============================================================
 *
 * Cette partie reste volontairement très proche
 * du générateur original.
 *
 * Optimisations :
 *
 * - voisins pré-calculés ;
 * - sélection des 3 plus petites frontières
 *   sans Array.map().sort().
 *
 * On conserve notamment la suppression de la cellule
 * dans toutes les frontières, car c'est une mécanique
 * simple et sûre.
 * ============================================================
 */

function generateRegions(
    solution,
    size,
    regionCount,
    orthogonalNeighbors
) {

    const zones =
        new Int16Array(
            size * size
        );

    zones.fill(-1);


    const frontiers =
        Array.from(
            {
                length:
                    regionCount
            },
            () => new Set()
        );


    const sizes =
        new Uint16Array(
            regionCount
        );


    /*
     * Chaque dino devient la graine
     * d'une zone différente.
     */

    for (
        let zone = 0;
        zone < regionCount;
        zone++
    ) {

        const index =
            zone * size +
            solution[zone];


        zones[index] =
            zone;

        sizes[zone] =
            1;
    }


    /*
     * Initialiser les frontières.
     */

    for (
        let zone = 0;
        zone < regionCount;
        zone++
    ) {

        const index =
            zone * size +
            solution[zone];


        for (
            const neighbor
            of orthogonalNeighbors[index]
        ) {

            if (
                zones[neighbor] === -1
            ) {

                frontiers[zone].add(
                    neighbor
                );
            }
        }
    }


    let assigned =
        regionCount;

    /*
     * Faire grandir les zones.
     */

    while (
        assigned <
        size * size
    ) {

        /*
         * Chercher les trois plus petites
         * frontières.
         *
         * Cela remplace :
         *
         * available.map().filter().sort()
         */

        let best0 = -1;
        let size0 = Infinity;

        let best1 = -1;
        let size1 = Infinity;

        let best2 = -1;
        let size2 = Infinity;


        for (
            let zone = 0;
            zone < regionCount;
            zone++
        ) {

            const frontierSize =
                frontiers[zone].size;

            if (
                frontierSize === 0
            ) {

                continue;
            }


            if (
                frontierSize <
                size0
            ) {

                size2 =
                    size1;

                best2 =
                    best1;


                size1 =
                    size0;

                best1 =
                    best0;


                size0 =
                    frontierSize;

                best0 =
                    zone;

            } else if (
                frontierSize <
                size1
            ) {

                size2 =
                    size1;

                best2 =
                    best1;


                size1 =
                    frontierSize;

                best1 =
                    zone;

            } else if (
                frontierSize <
                size2
            ) {

                size2 =
                    frontierSize;

                best2 =
                    zone;
            }
        }


        /*
         * Plus aucune zone ne peut grandir.
         */

        if (
            best0 === -1
        ) {

            return null;
        }


        let candidateCount =
            1;


        if (
            best1 !== -1
        ) {

            candidateCount =
                2;
        }


        if (
            best2 !== -1
        ) {

            candidateCount =
                3;
        }


        /*
         * Choisir une des trois plus petites.
         */

        const selectedIndex =
            randomInt(
                0,
                candidateCount - 1
            );


        const zone =
            selectedIndex === 0
                ? best0
                : selectedIndex === 1
                    ? best1
                    : best2;


        /*
         * Choisir une cellule aléatoire
         * de la frontière.
         */

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
         * La cellule peut avoir été prise.
         */

        if (
            zones[cell] !== -1
        ) {

            frontiers[zone].delete(
                cell
            );

            continue;
        }


        /*
         * Attribuer la cellule.
         */

        zones[cell] =
            zone;

        sizes[zone]++;

        assigned++;


        /*
         * Retirer cette cellule de toutes
         * les frontières.
         */

        for (
            const frontierSet
            of frontiers
        ) {

            frontierSet.delete(
                cell
            );
        }


        /*
         * Ajouter ses voisins à la frontière.
         */

        for (
            const neighbor
            of orthogonalNeighbors[cell]
        ) {

            if (
                zones[neighbor] === -1
            ) {

                frontiers[zone].add(
                    neighbor
                );
            }
        }
    }


    /*
     * Eviter les zones trop déséquilibrées.
     */

    let minSize =
        Infinity;

    let maxSize =
        0;


    for (
        let zone = 0;
        zone < regionCount;
        zone++
    ) {

        if (
            sizes[zone] <
            minSize
        ) {

            minSize =
                sizes[zone];
        }


        if (
            sizes[zone] >
            maxSize
        ) {

            maxSize =
                sizes[zone];
        }
    }


    if (
        minSize < 3 ||
        maxSize > 12
    ) {

        return null;
    }


    return Array.from(
        zones
    );
}


/*
 * ============================================================
 * VALIDATION DE LA SOLUTION ET DES ZONES
 * ============================================================
 *
 * Cette validation est volontairement explicite.
 *
 * Pour chaque ligne :
 *
 * - une colonne différente ;
 * - une zone différente ;
 * - le dino de la ligne X est dans la zone X.
 *
 * Cette dernière propriété est fondamentale :
 *
 *     solution[row]
 *     ↓
 *     zone[row * size + solution[row]] === row
 *
 * ============================================================
 */

function isValidGeneratedPuzzle(
    zones,
    solution,
    size
) {

    const usedColumns =
        new Uint8Array(size);


    const usedZones =
        new Uint8Array(size);


    for (
        let row = 0;
        row < size;
        row++
    ) {

        const column =
            solution[row];


        /*
         * Colonne valide.
         */

        if (
            column < 0 ||
            column >= size
        ) {

            return false;
        }


        /*
         * Une seule fois par colonne.
         */

        if (
            usedColumns[column]
        ) {

            return false;
        }


        usedColumns[column] =
            1;


        const index =
            row * size +
            column;


        const zone =
            zones[index];


        /*
         * Zone valide.
         */

        if (
            zone < 0 ||
            zone >= size
        ) {

            return false;
        }


        /*
         * Une seule fois par zone.
         */

        if (
            usedZones[zone]
        ) {

            return false;
        }


        usedZones[zone] =
            1;


        /*
         * Le dino de cette ligne doit
         * être dans la zone correspondante.
         */

        if (
            zone !== row
        ) {

            return false;
        }


        /*
         * Pas de contact avec le dino
         * de la ligne précédente.
         */

        if (
            row > 0
        ) {

            const previousColumn =
                solution[row - 1];


            if (
                Math.abs(
                    previousColumn -
                    column
                ) <= 1
            ) {

                return false;
            }
        }
    }


    return true;
}


/*
 * ============================================================
 * VÉRIFIER LA CONNEXITÉ DES ZONES
 * ============================================================
 */

function areRegionsConnected(
    zones,
    size,
    regionCount,
    orthogonalNeighbors
) {

    for (
        let zone = 0;
        zone < regionCount;
        zone++
    ) {

        let start = -1;

        let cellCount = 0;


        /*
         * Trouver une cellule de départ
         * et compter les cellules de la zone.
         */

        for (
            let index = 0;
            index < zones.length;
            index++
        ) {

            if (
                zones[index] === zone
            ) {

                if (
                    start === -1
                ) {

                    start =
                        index;
                }

                cellCount++;
            }
        }


        if (
            start === -1
        ) {

            return false;
        }


        /*
         * BFS.
         */

        const visited =
            new Uint8Array(
                zones.length
            );


        const queue =
            new Int16Array(
                zones.length
            );


        let head = 0;

        let tail = 0;


        queue[tail++] =
            start;

        visited[start] =
            1;


        while (
            head < tail
        ) {

            const current =
                queue[head++];


            for (
                const neighbor
                of orthogonalNeighbors[current]
            ) {

                if (
                    zones[neighbor] !== zone
                ) {

                    continue;
                }


                if (
                    visited[neighbor]
                ) {

                    continue;
                }


                visited[neighbor] =
                    1;


                queue[tail++] =
                    neighbor;
            }
        }


        if (
            tail !== cellCount
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

function tryGeneratePuzzle(
    size,
    orthogonalNeighbors
) {

    /*
     * Le nombre de zones est égal
     * au nombre de dinos.
     */

    const regionCount =
        size;


    /*
     * ----------------------------------------------------------
     * 1. Solution
     * ----------------------------------------------------------
     */

    const solution =
        generateSolution(
            size
        );


    if (
        !solution
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * 2. Zones
     * ----------------------------------------------------------
     */

    const zones =
        generateRegions(
            solution,
            size,
            regionCount,
            orthogonalNeighbors
        );


    if (
        !zones
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * 3. Validation explicite
     * ----------------------------------------------------------
     */

    if (
        !isValidGeneratedPuzzle(
            zones,
            solution,
            size
        )
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * 4. Connexité
     * ----------------------------------------------------------
     */

    if (
        !areRegionsConnected(
            zones,
            size,
            regionCount,
            orthogonalNeighbors
        )
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * 5. Unicité
     * ----------------------------------------------------------
     */

    const result =
        countSolutions(
            zones,
            size,
            2
        );


    /*
     * Exactement une solution.
     */

    if (
        result.count !== 1
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * Puzzle valide
     * ----------------------------------------------------------
     */

    return {

        size,

        zones,

        solution:
            solution.map(
                column =>
                    column
            ),

        metadata: {

            solverNodes:
                result.nodes,

            difficulty:
                getDifficulty(
                    result.nodes
                )
        }
    };
}


/*
 * ============================================================
 * GÉNÉRATEUR ASYNCHRONE
 * ============================================================
 */

export async function generatePuzzle(
    size = DEFAULT_SIZE
) {

    /*
     * Vérification de la taille.
     */

    if (
        !Number.isInteger(size) ||
        size < 4
    ) {

        throw new Error(
            "La taille de la grille doit être un entier supérieur ou égal à 4."
        );
    }


    /*
     * Les voisins ne dépendent que de la taille.
     *
     * On les calcule donc une seule fois.
     */

    const orthogonalNeighbors =
        buildOrthogonalNeighbors(
            size
        );

    while (
        true
    ) {

        /*
         * Quelques tentatives avant
         * de rendre la main au navigateur.
         */

        for (
            let i = 0;
            i < ATTEMPTS_PER_BATCH;
            i++
        ) {

            const puzzle =
                tryGeneratePuzzle(
                    size,
                    orthogonalNeighbors
                );


            if (
                puzzle
            ) {

                return puzzle;
            }
        }


        /*
         * Donner une respiration au navigateur.
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