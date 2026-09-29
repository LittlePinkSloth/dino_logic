export function getDifficulty(solverNodes) {

    if (solverNodes <= 20) {
        return "découverte";
    }

    if (solverNodes <= 50) {
        return "facile";
    }

    if (solverNodes <= 150) {
        return "normal";
    }

    return "difficile";
}


export function getHeroicTimeLimit(difficulty) {

    if (
        difficulty === "découverte" ||
        difficulty === "facile"
    ) {
        return 2 * 60 * 1000;
    }

    if (difficulty === "normal") {
        return 5 * 60 * 1000;
    }

    return 10 * 60 * 1000;
}