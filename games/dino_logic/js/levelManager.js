import { generatePuzzle } from "./generator.js";
import { getDifficulty } from "./difficulty.js";
import { countSolutions } from "./solver.js";

const PREGENERATED_EIGHT_PUZZLE = {
    size: 8,
    zones: [
        0, 0, 0, 0, 0, 0, 1, 1,
        3, 3, 0, 0, 2, 1, 1, 1,
        3, 3, 0, 2, 2, 2, 2, 1,
        3, 3, 4, 4, 2, 2, 2, 1,
        3, 3, 4, 4, 2, 5, 1, 1,
        3, 3, 3, 4, 2, 5, 1, 1,
        4, 4, 3, 4, 7, 5, 6, 6,
        4, 4, 4, 4, 7, 7, 7, 6
    ],
    solution: [1, 6, 3, 0, 2, 5, 7, 4]
};

let nextRequestId = 0;
let preparedEightPuzzle = null;
let preparingEightPuzzle = null;

function generateInWorker(size) {
    return new Promise((resolve, reject) => {
        let worker;

        try {
            worker = new Worker(
                new URL("./generator.worker.js", import.meta.url),
                { type: "module" }
            );
        } catch (error) {
            reject(error);
            return;
        }

        const requestId = ++nextRequestId;

        worker.addEventListener("message", event => {
            const response = event.data;
            if (response.requestId !== requestId) return;

            worker.terminate();

            if (response.type === "generated") {
                resolve(response.level);
            } else {
                reject(new Error(response.error?.message ?? "Échec de génération."));
            }
        });

        worker.addEventListener("error", event => {
            worker.terminate();
            reject(new Error(event.message || "Worker de génération indisponible."));
        });

        worker.postMessage({
            type: "generate",
            requestId,
            levelNumber: size,
            size
        });
    });
}

function prefetchEightPuzzle() {
    if (preparedEightPuzzle || preparingEightPuzzle) return;

    preparingEightPuzzle = generateInWorker(8)
        .then(puzzle => {
            preparedEightPuzzle = puzzle;
        })
        .catch(() => {})
        .finally(() => {
            preparingEightPuzzle = null;
        });
}

function getReadyEightPuzzle() {
    const size = 8;
    const symmetry = Math.floor(Math.random() * 8);
    const zones = new Array(size * size);
    const solution = new Array(size);

    function transform(row, column) {
        switch (symmetry) {
            case 0: return [row, column];
            case 1: return [column, size - 1 - row];
            case 2: return [size - 1 - row, size - 1 - column];
            case 3: return [size - 1 - column, row];
            case 4: return [row, size - 1 - column];
            case 5: return [size - 1 - row, column];
            case 6: return [column, row];
            default: return [size - 1 - column, size - 1 - row];
        }
    }

    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            const [nextRow, nextColumn] = transform(row, column);
            zones[nextRow * size + nextColumn] =
                PREGENERATED_EIGHT_PUZZLE.zones[row * size + column];

            if (PREGENERATED_EIGHT_PUZZLE.solution[row] === column) {
                solution[nextRow] = nextColumn;
            }
        }
    }

    const solverResult =
        countSolutions(zones, size, 2);

    return {
        size,
        zones,
        solution,
        metadata: {
            solverNodes: solverResult.nodes,
            difficulty: getDifficulty(solverResult.nodes)
        }
    };
}

prefetchEightPuzzle();

export async function requestPuzzle(size) {
    if (size === 8) {
        if (preparedEightPuzzle) {
            const puzzle = preparedEightPuzzle;
            preparedEightPuzzle = null;
            prefetchEightPuzzle();
            return puzzle;
        }

        prefetchEightPuzzle();
        return getReadyEightPuzzle();
    }

    try {
        return await generateInWorker(size);
    } catch {
        return generatePuzzle(size);
    }
}