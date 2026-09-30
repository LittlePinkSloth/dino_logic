import { generatePuzzle } from "./sudoku-generator.js";

self.addEventListener("message", event => {
    const { difficulty, requestId } = event.data;
    try {
        const puzzle = generatePuzzle(difficulty);
        self.postMessage({ requestId, puzzle });
    } catch (error) {
        self.postMessage({ requestId, error: error.message });
    }
});