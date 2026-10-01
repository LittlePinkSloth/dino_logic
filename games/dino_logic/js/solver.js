/*
 * ============================================================
 * SOLVEUR
 * ============================================================
 *
 * Le solveur cherche les solutions possibles d'un puzzle.
 *
 * Règles :
 *
 * - exactement un dino par ligne
 * - exactement un dino par colonne
 * - exactement un dino par zone
 * - aucun dino adjacent, diagonales comprises
 *
 * Le solveur peut s'arrêter après 2 solutions.
 *
 * ============================================================
 */


/*
 * ============================================================
 * COMPTER LES SOLUTIONS
 * ============================================================
 */

export function countSolutions(
    zones,
    size,
    maxSolutions = 2
) {

    /*
     * solution[row] = colonne du dino.
     *
     * -1 = ligne non encore affectée.
     */
    const solution =
        new Int16Array(size);

    solution.fill(-1);


    /*
     * Colonnes et zones utilisées.
     *
     * 0 = libre
     * 1 = utilisée
     */
    const usedColumns =
        new Uint8Array(size);

    const usedZones =
        new Uint8Array(size);


    /*
     * Lignes encore disponibles.
     */
    const activeRows =
        new Uint8Array(size);

    activeRows.fill(1);


    let rowsLeft = size;

    let solutionCount = 0;

    let nodes = 0;


    /*
     * ----------------------------------------------------------
     * Vérifie si une case peut recevoir un dino.
     * ----------------------------------------------------------
     *
     * Comme une solution possède exactement un dino
     * par ligne, une case ne peut être adjacente
     * qu'au dino de la ligne précédente ou suivante.
     *
     * Il n'est donc plus nécessaire de parcourir
     * les 8 voisins de la cellule.
     */

    function canPlace(
        row,
        column
    ) {

        /*
         * Une seule case par colonne.
         */
        if (
            usedColumns[column]
        ) {

            return false;
        }


        const index =
            row * size + column;


        const zone =
            zones[index];


        /*
         * Une seule case par zone.
         */
        if (
            usedZones[zone]
        ) {

            return false;
        }


        /*
         * Ligne précédente.
         */
        if (
            row > 0
        ) {

            const previousColumn =
                solution[row - 1];


            if (
                previousColumn !== -1 &&
                Math.abs(
                    previousColumn -
                    column
                ) <= 1
            ) {

                return false;
            }
        }


        /*
         * Ligne suivante.
         *
         * Le MRV peut avoir rempli cette ligne
         * avant la ligne courante.
         */
        if (
            row + 1 < size
        ) {

            const nextColumn =
                solution[row + 1];


            if (
                nextColumn !== -1 &&
                Math.abs(
                    nextColumn -
                    column
                ) <= 1
            ) {

                return false;
            }
        }


        return true;
    }


    /*
     * ----------------------------------------------------------
     * Recherche récursive avec MRV.
     * ----------------------------------------------------------
     */

    function search() {

        /*
         * Toutes les lignes sont remplies.
         */
        if (
            rowsLeft === 0
        ) {

            solutionCount++;

            return;
        }


        /*
         * Deux solutions suffisent.
         */
        if (
            solutionCount >= maxSolutions
        ) {

            return;
        }


        /*
         * ------------------------------------------------------
         * MRV
         *
         * Chercher la ligne ayant le moins de possibilités.
         * ------------------------------------------------------
         */

        let selectedRow = -1;

        let selectedCount =
            size + 1;

        let selectedColumns = [];


        for (
            let row = 0;
            row < size;
            row++
        ) {

            if (
                !activeRows[row]
            ) {

                continue;
            }


            const candidates = [];


            for (
                let column = 0;
                column < size;
                column++
            ) {

                if (
                    canPlace(
                        row,
                        column
                    )
                ) {

                    candidates.push(
                        column
                    );
                }
            }

            const count =
                candidates.length;


            /*
             * Une ligne sans possibilité
             * rend la branche impossible.
             */
            if (
                count === 0
            ) {

                return;
            }


            if (
                count < selectedCount
            ) {

                selectedCount =
                    count;

                selectedRow =
                    row;

                selectedColumns =
                    candidates;


                /*
                 * On ne peut pas faire mieux
                 * que 1 candidat.
                 */
                if (
                    count === 1
                ) {

                    break;
                }
            }
        }


        /*
         * ------------------------------------------------------
         * Tester les candidats.
         * ------------------------------------------------------
         */

        for (
            const column
            of selectedColumns
        ) {


            nodes++;


            const index =
                selectedRow * size +
                column;


            const zone =
                zones[index];


            /*
             * Placement.
             */

            solution[selectedRow] =
                column;

            activeRows[selectedRow] =
                0;

            rowsLeft--;


            usedColumns[column] =
                1;

            usedZones[zone] =
                1;


            /*
             * Recherche suivante.
             */

            search();


            /*
             * Annulation.
             */

            usedColumns[column] =
                0;

            usedZones[zone] =
                0;


            rowsLeft++;

            activeRows[selectedRow] =
                1;

            solution[selectedRow] =
                -1;


            /*
             * Deux solutions suffisent.
             */

            if (
                solutionCount >= maxSolutions
            ) {

                return;
            }
        }
    }


    /*
     * Lancer la recherche.
     */

    search();


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