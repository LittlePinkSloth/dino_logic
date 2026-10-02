/* generator.worker.js */

import {
    generateLevel
} from "./generator.js";

import {
    solveLevel
} from "./solver.js";


self.onmessage = event => {

    const data =
        event.data;

    if (
        !data ||
        typeof data !== "object"
    ) {
        return;
    }

    const {
        type,
        requestId,
        levelNumber,
        tubes,
        capacity
    } = data;


    /*
     * ========================================================
     * GÉNÉRATION D'UN NIVEAU
     * ========================================================
     */

    if (type === "generate") {

        try {

            const level =
                generateLevel(
                    levelNumber
                );

            level.number =
                levelNumber;

            self.postMessage({
                type: "generated",

                requestId,

                levelNumber,

                level
            });

        } catch (error) {

            self.postMessage({
                type: "error",

                requestId,

                levelNumber,

                error: {
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error),

                    stack:
                        error instanceof Error
                            ? error.stack
                            : null
                }
            });
        }

        return;
    }


    /*
     * ========================================================
     * VÉRIFICATION DE SOLVABILITÉ
     * ========================================================
     *
     * Cette opération peut effectuer un BFS complet jusqu'à
     * épuisement de l'espace d'états atteignable.
     *
     * Elle s'exécute entièrement dans le Worker et ne bloque
     * donc pas le thread principal.
     */

    if (type === "checkSolvable") {

        try {

            const result =
                solveLevel(
                    tubes,
                    capacity,
                    {
                        maxMoves: Infinity,
                        returnPath: false
                    }
                );

            self.postMessage({
                type:
                    "solvabilityChecked",

                requestId,

                solvable:
                    result.solved
            });

        } catch (error) {

            self.postMessage({
                type:
                    "solvabilityError",

                requestId,

                error: {
                    message:
                        error instanceof Error
                            ? error.message
                            : String(error),

                    stack:
                        error instanceof Error
                            ? error.stack
                            : null
                }
            });
        }

        return;
    }
};