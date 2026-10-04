/* generator.worker.js */

import {
    generateLevel
} from "./generator.js";

import {
    solveLevel
} from "./solver.js";

import {
    canMixTube
} from "./rules.js";


function getUniquePermutations(items) {

    const permutations = [];
    const used = Array(items.length).fill(false);
    const current = [];
    const seen = new Set();

    function visit() {

        if (
            current.length === items.length
        ) {
            const key = JSON.stringify(current);

            if (!seen.has(key)) {
                seen.add(key);
                permutations.push([...current]);
            }

            return;
        }

        for (
            let index = 0;
            index < items.length;
            index++
        ) {
            if (used[index]) {
                continue;
            }

            used[index] = true;
            current.push(items[index]);
            visit();
            current.pop();
            used[index] = false;
        }
    }

    visit();

    return permutations;
}


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

            let bonusSolvable = false;
            const mixableTubeIndexes = [];

            if (!result.solved) {
                const bonusTubes = [
                    ...tubes,
                    {
                        type: "normal",
                        layers: [],
                        capacity: 1,
                        isBonus: true
                    }
                ];

                bonusSolvable =
                    solveLevel(
                        bonusTubes,
                        capacity,
                        {
                            maxMoves: Infinity,
                            returnPath: false
                        }
                    ).solved;

                for (
                    let tubeIndex = 0;
                    tubeIndex < tubes.length;
                    tubeIndex++
                ) {
                    const tube = tubes[tubeIndex];

                    if (
                        !canMixTube(tube, capacity)
                    ) {
                        continue;
                    }

                    const permutations =
                        getUniquePermutations(tube.layers);

                    const isSolvableByMix =
                        permutations.some(
                            layers => {
                                const candidateTubes =
                                    tubes.map(
                                        (candidate, index) => ({
                                            ...candidate,
                                            layers:
                                                index === tubeIndex
                                                    ? layers
                                                    : [...candidate.layers]
                                        })
                                    );

                                return solveLevel(
                                    candidateTubes,
                                    capacity,
                                    {
                                        maxMoves: Infinity,
                                        returnPath: false
                                    }
                                ).solved;
                            }
                        );

                    if (isSolvableByMix) {
                        mixableTubeIndexes.push(tubeIndex);
                        break;
                    }
                }
            }

            self.postMessage({
                type:
                    "solvabilityChecked",

                requestId,

                solvable:
                    result.solved,

                bonusSolvable,

                mixableTubeIndexes
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