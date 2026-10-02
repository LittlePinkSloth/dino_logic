/* levelManager.js */

class LevelManager {

    constructor() {

        this.worker = null;

        this.nextLevel = null;
        this.nextLevelNumber = null;

        this.requestId = 0;

        this.pendingRequest = null;

        this.waiters = new Map();
    }

    createWorker() {

        if (this.worker) {
            return;
        }

        this.worker =
            new Worker(
                new URL("./generator.worker.js", import.meta.url),
                {
                    type: "module"
                }
            );

        this.worker.addEventListener(
            "message",
            event => {
                this.handleWorkerMessage(
                    event.data
                );
            }
        );

        this.worker.addEventListener(
            "error",
            error => {
                this.handleWorkerError(error);
            }
        );
    }

    generateNextLevel(levelNumber) {

        if (
            this.isNextLevelReady(levelNumber) ||
            this.isGenerating(levelNumber)
        ) {
            return;
        }

        this.createWorker();

        const requestId =
            ++this.requestId;

        this.pendingRequest = {
            requestId,
            levelNumber
        };

        this.worker.postMessage({
            type: "generate",
            requestId,
            levelNumber
        });
    }

    waitForLevel(levelNumber) {

        if (
            this.isNextLevelReady(levelNumber)
        ) {
            const level =
                this.nextLevel;

            this.nextLevel = null;
            this.nextLevelNumber = null;

            return Promise.resolve(level);
        }

        if (
            !this.isGenerating(levelNumber)
        ) {
            this.generateNextLevel(
                levelNumber
            );
        }

        return new Promise(
            (resolve, reject) => {

                const existing =
                    this.waiters.get(levelNumber);

                const waiter = {
                    resolve,
                    reject
                };

                if (existing) {

                    existing.push(waiter);

                } else {

                    this.waiters.set(
                        levelNumber,
                        [waiter]
                    );
                }
            }
        );
    }

    handleWorkerMessage(message) {

        if (
            !message ||
            typeof message !== "object"
        ) {
            return;
        }

        if (
            message.type === "generated"
        ) {
            this.handleGeneratedLevel(
                message
            );

            return;
        }

        if (
            message.type === "error"
        ) {
            this.handleGenerationError(
                message
            );
        }
    }

    handleGeneratedLevel(message) {

        if (!this.pendingRequest) {
            return;
        }

        if (
            message.requestId !==
            this.pendingRequest.requestId
        ) {
            return;
        }

        if (
            message.levelNumber !==
            this.pendingRequest.levelNumber
        ) {
            return;
        }

        this.nextLevel =
            message.level;

        this.nextLevelNumber =
            message.levelNumber;

        this.pendingRequest = null;

        const resolvers =
            this.waiters.get(
                message.levelNumber
            );

        if (!resolvers) {
            return;
        }

        this.waiters.delete(
            message.levelNumber
        );

        const level =
            this.nextLevel;

        this.nextLevel = null;
        this.nextLevelNumber = null;

        resolvers.forEach(
            waiter =>
                waiter.resolve(level)
        );
    }

    handleGenerationError(message) {

        if (!this.pendingRequest) {
            return;
        }

        if (
            message.requestId !==
            this.pendingRequest.requestId
        ) {
            return;
        }

        const levelNumber =
            message.levelNumber;

        console.error(
            "Erreur lors de la génération du niveau",
            levelNumber,
            message.error
        );

        this.pendingRequest = null;

        const waiters =
            this.waiters.get(levelNumber);

        if (!waiters) {
            return;
        }

        this.waiters.delete(levelNumber);

        const error =
            new Error(
                message.error?.message ??
                "Erreur lors de la génération du niveau."
            );

        waiters.forEach(
            waiter =>
                waiter.reject(error)
        );
    }

    handleWorkerError(error) {

        console.error(
            "Erreur du Level Generator Worker :",
            error
        );

        const pending =
            this.pendingRequest;

        this.pendingRequest = null;

        if (this.worker) {
            this.worker.terminate();
        }

        this.worker = null;

        if (!pending) {
            return;
        }

        const waiters =
            this.waiters.get(
                pending.levelNumber
            );

        if (!waiters) {
            return;
        }

        this.waiters.delete(
            pending.levelNumber
        );

        const workerError =
            new Error(
                "Le Worker de génération a rencontré une erreur."
            );

        waiters.forEach(
            waiter =>
                waiter.reject(workerError)
        );
    }

    isNextLevelReady(levelNumber) {

        return (
            this.nextLevel !== null &&
            this.nextLevelNumber === levelNumber
        );
    }

    isGenerating(levelNumber) {

        return (
            this.pendingRequest !== null &&
            this.pendingRequest.levelNumber === levelNumber
        );
    }

    cancelGeneration() {

        this.requestId++;

        const pending =
            this.pendingRequest;

        this.pendingRequest = null;

        if (this.worker) {
            this.worker.terminate();
        }

        this.worker = null;

        if (!pending) {
            return;
        }

        const waiters =
            this.waiters.get(
                pending.levelNumber
            );

        if (!waiters) {
            return;
        }

        this.waiters.delete(
            pending.levelNumber
        );

        const error =
            new Error(
                "Génération annulée."
            );

        waiters.forEach(
            waiter =>
                waiter.reject(error)
        );
    }

    destroy() {

        if (this.worker) {
            this.worker.terminate();
        }

        this.worker = null;

        this.nextLevel = null;
        this.nextLevelNumber = null;
        this.pendingRequest = null;

        this.waiters.clear();
    }
}

export const levelManager =
    new LevelManager();