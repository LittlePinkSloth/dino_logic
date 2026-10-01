import { generatePuzzle } from "./generator.js";

self.addEventListener("message", async event => {
    const { type, requestId, levelNumber, size } = event.data;
    if (type !== "generate") return;

    try {
        const level = await generatePuzzle(size ?? levelNumber);
        self.postMessage({
            type: "generated",
            requestId,
            levelNumber: levelNumber ?? size,
            level
        });
    } catch (error) {
        self.postMessage({
            type: "error",
            requestId,
            levelNumber: levelNumber ?? size,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
});