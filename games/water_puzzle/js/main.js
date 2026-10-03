/* main.js */

import { generateLevel } from "./generator.js";

import {
    initializeGame
} from "./game.js";

import {
    initUI,
    render
} from "./ui.js";

import {
    levelManager
} from "./levelManager.js";

import {
    readStatistics,
    writeStatistics
} from "../../../common/storage/statistics.js";


const STATISTICS_KEY = "waterPuzzleProgress";


/*
 * ============================================================
 * ÉTAT DU JEU
 * ============================================================
 



let currentLevelNumber = loadProgress().currentLevel;*/
let currentLevelNumber = 150;

/*
 * ============================================================
 * CHARGEMENT D'UN NIVEAU
 * ============================================================
 */

function loadLevel(level) {

    level.number =
        currentLevelNumber;

    initializeGame(level);

    saveCurrentLevel();

    render();

    /*
     * Prépare immédiatement le niveau suivant
     * pendant que le joueur joue.
     */

    levelManager.generateNextLevel(
        currentLevelNumber + 1
    );
}


/*
 * ============================================================
 * NIVEAU SUIVANT
 * ============================================================
 */

async function nextLevel() {

    currentLevelNumber++;

    const levelNumber =
        currentLevelNumber;

    const level =
        await levelManager.waitForLevel(
            levelNumber
        );

    /*
     * Sécurité contre une éventuelle navigation
     * pendant l'attente.
     */

    if (
        levelNumber !==
        currentLevelNumber
    ) {
        return;
    }

    loadLevel(level);
}


/*
 * ============================================================
 * POINT D'ENTRÉE
 * ============================================================
 */

function main() {

    initUI(nextLevel);

    /*
     * Le premier niveau reste synchrone.
     */

    const level =
        generateLevel(
            currentLevelNumber
        );

    loadLevel(level);
}


/*
 * ============================================================
 * LANCEMENT
 * ============================================================
 */

main();


function loadProgress() {

    return readStatistics(
        STATISTICS_KEY,
        () => ({ completedLevels: 0, currentLevel: 1 }),
        stored => ({
            completedLevels:
                Number.isSafeInteger(stored.completedLevels) &&
                stored.completedLevels >= 0
                    ? stored.completedLevels
                    : 0,
            currentLevel:
                Number.isSafeInteger(stored.currentLevel) &&
                stored.currentLevel > 0
                    ? stored.currentLevel
                    : 1
        })
    );
}


function saveCurrentLevel() {

    const progress = loadProgress();
    progress.currentLevel = currentLevelNumber;
    writeStatistics(STATISTICS_KEY, progress);
}