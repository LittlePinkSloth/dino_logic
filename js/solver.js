
/*
 * ============================================================
 * SOLVEUR
 * ============================================================
 *
 * Le solveur cherche les solutions possibles d'un puzzle.
 *
 * Règles :
 *
 * - exactement un chat par ligne
 * - exactement un chat par colonne
 * - exactement un chat par zone
 * - aucun chat adjacent, diagonales comprises
 *
 * Le solveur peut s'arrêter après 2 solutions.
 *
 * Cela permet de répondre à la question :
 *
 *     "Ce puzzle possède-t-il une solution unique ?"
 *
 * ============================================================
 */


/*
 * ============================================================
 * VOISINS
 * ============================================================
 */

function getNeighbors(index, size) {

    const row = Math.floor(index / size);

    const column = index % size;

    const neighbors = [];


    for (let dr = -1; dr <= 1; dr++) {

        for (let dc = -1; dc <= 1; dc++) {

            if (dr === 0 && dc === 0) {
                continue;
            }


            const r = row + dr;

            const c = column + dc;


            if (
                r >= 0 &&
                r < size &&
                c >= 0 &&
                c < size
            ) {

                neighbors.push(
                    r * size + c
                );
            }
        }
    }


    return neighbors;
}


/*
 * ============================================================
 * COMPTER LES SOLUTIONS
 * ============================================================
 *
 * Retourne :
 *
 * {
 *     count: nombre de solutions trouvées,
 *     nodes: nombre de recherches effectuées
 * }
 *
 * maxSolutions permet de s'arrêter rapidement.
 *
 * Pour vérifier l'unicité :
 *
 *     maxSolutions = 2
 *
 * ============================================================
 */

export function countSolutions(
    zones,
    size,
    maxSolutions = 2
) {

    const cellCount =
        size * size;


    /*
     * Une solution sera représentée par :
     *
     * solution[row] = column
     */

    const solution =
        new Array(size).fill(-1);


    /*
     * Colonnes déjà utilisées.
     */

    const usedColumns =
        new Set();


    /*
     * Zones déjà utilisées.
     */

    const usedZones =
        new Set();


    /*
     * Cases contenant déjà un chat.
     */

    const placedCells =
        new Set();


    let solutionCount = 0;

    let nodes = 0;


    /*
     * ----------------------------------------------------------
     * Vérifie si une case peut recevoir un chat.
     * ----------------------------------------------------------
     */

    function canPlace(index) {

        const column =
            index % size;

        const zone =
            zones[index];


        /*
         * Une seule case par colonne.
         */

        if (
            usedColumns.has(column)
        ) {
            return false;
        }


        /*
         * Une seule case par zone.
         */

        if (
            usedZones.has(zone)
        ) {
            return false;
        }


        /*
         * Pas de voisin.
         */

        const neighbors =
            getNeighbors(index, size);


        for (
            const neighbor
            of neighbors
        ) {

            if (
                placedCells.has(neighbor)
            ) {
                return false;
            }
        }


        return true;
    }


    /*
     * ----------------------------------------------------------
     * Trouve les candidats d'une ligne.
     * ----------------------------------------------------------
     */

    function getCandidates(row) {

        const candidates = [];


        for (
            let column = 0;
            column < size;
            column++
        ) {

            const index =
                row * size + column;


            if (
                canPlace(index)
            ) {

                candidates.push(index);
            }
        }


        return candidates;
    }


    /*
     * ----------------------------------------------------------
     * Recherche récursive.
     * ----------------------------------------------------------
     */

    function search(rowsLeft) {

        /*
         * On a trouvé une solution.
         */

        if (
            rowsLeft.length === 0
        ) {

            solutionCount++;

            return;
        }


        /*
         * Arrêt dès qu'on connaît suffisamment
         * de solutions.
         */

        if (
            solutionCount >= maxSolutions
        ) {

            return;
        }


        /*
         * ------------------------------------------------------
         * MRV :
         *
         * On choisit la ligne ayant le moins de possibilités.
         *
         * Cela réduit énormément la recherche.
         * ------------------------------------------------------
         */

        let selectedRow = -1;

        let selectedCandidates = null;


        for (
            const row
            of rowsLeft
        ) {

            const candidates =
                getCandidates(row);


            /*
             * Une ligne sans possibilité signifie
             * qu'il n'y a pas de solution dans cette branche.
             */

            if (
                candidates.length === 0
            ) {

                return;
            }


            if (
                selectedCandidates === null ||
                candidates.length <
                selectedCandidates.length
            ) {

                selectedRow = row;

                selectedCandidates =
                    candidates;
            }
        }


        /*
         * ------------------------------------------------------
         * Tester chaque candidat.
         * ------------------------------------------------------
         */

        for (
            const index
            of selectedCandidates
        ) {

            nodes++;


            const column =
                index % size;

            const zone =
                zones[index];


            /*
             * Placement.
             */

            placedCells.add(index);

            usedColumns.add(column);

            usedZones.add(zone);

            solution[selectedRow] =
                column;


            /*
             * Nouvelle liste de lignes.
             */

            const nextRows =
                rowsLeft.filter(
                    row =>
                        row !== selectedRow
                );


            search(nextRows);


            /*
             * Annulation du placement.
             */

            placedCells.delete(index);

            usedColumns.delete(column);

            usedZones.delete(zone);

            solution[selectedRow] = -1;


            /*
             * Deux solutions suffisent
             * pour savoir que le puzzle n'est
             * pas unique.
             */

            if (
                solutionCount >= maxSolutions
            ) {

                return;
            }
        }
    }


    /*
     * Toutes les lignes doivent être remplies.
     */

    const rows =
        Array.from(
            { length: size },
            (_, index) => index
        );


    search(rows);


    return {
        count: solutionCount,
        nodes
    };
}


/*
 * ============================================================
 * SOLUTION UNIQUE ?
 * ============================================================
 */

export function hasUniqueSolution(
    zones,
    size
) {

    const result =
        countSolutions(
            zones,
            size,
            2
        );


    return result.count === 1;
}

