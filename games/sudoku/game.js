import {
    countSolutions,
    findConflictingCells,
    isValidGrid,
    solveSudoku
} from "./sudoku-solver.js";
import { initGameShell } from "../../common/ui/game-shell.js";
import { showSuccessAnimation } from "../../common/ui/success-animation.js";
import {
    readStatistics,
    writeStatistics
} from "../../common/storage/statistics.js";

const SIZE = 9;
const STORAGE_KEY = "littlePinkSloth.sudoku.v1";
const STATISTICS_KEY = "littlePinkSloth.sudoku.stats.v1";
const LEVEL_NAMES = { easy: "Facile", medium: "Moyen", hard: "Difficile" };
const statistics = readStatistics(
    STATISTICS_KEY,
    () => ({ completedPuzzles: 0 }),
    saved => ({
        completedPuzzles: Number.isSafeInteger(saved?.completedPuzzles) && saved.completedPuzzles >= 0
            ? saved.completedPuzzles
            : 0
    })
);
const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#game-status");
const levelElement = document.querySelector("#current-level");
const newButton = document.querySelector("#new-grid");
const checkButton = document.querySelector("#check-grid");
const difficultyButtons = [...document.querySelectorAll("[data-difficulty]")];
const numberButtons = [...document.querySelectorAll("[data-value]")];
const eraseButton = document.querySelector("#erase");
const cells = [];

let puzzle = null;
let solution = null;
let current = null;
let currentDifficulty = "easy";
let selectedDifficulty = "easy";
let puzzleCompleted = false;
let selectedCell = 40;
let validation = null;
let generating = false;
let activeWorker = null;

const gameShell = initGameShell({
    statisticsLabel: "Afficher la progression",
    statisticsTitle: "Progression",
    helpItems: [
        "Complète la grille 9 × 9 avec les chiffres de 1 à 9.",
        "Chaque ligne, colonne et carré 3 × 3 utilise chaque chiffre une seule fois.",
        "Sélectionne une case vide, puis choisis un chiffre."
    ],
    getStatistics: () => [
        { label: "Grilles résolues", value: statistics.completedPuzzles },
        { label: "Niveau actuel", value: LEVEL_NAMES[currentDifficulty] }
    ]
});

function hasGridValues(grid) {
    return Array.isArray(grid) && grid.length === SIZE && grid.every(row =>
        Array.isArray(row) && row.length === SIZE && row.every(value =>
            Number.isInteger(value) && value >= 0 && value <= SIZE
        )
    );
}

for (let index = 0; index < SIZE * SIZE; index++) {
    const cell = document.createElement("button");
    cell.className = "sudoku-cell";
    cell.type = "button";
    cell.setAttribute("role", "gridcell");
    cell.dataset.index = String(index);
    cell.addEventListener("click", () => {
        selectedCell = index;
        render();
    });
    cells.push(cell);
    boardElement.append(cell);
}

function setStatus(message, kind = "") {
    statusElement.textContent = message;
    statusElement.className = `game-status${kind ? ` ${kind}` : ""}`;
}

function saveGame() {
    if (!puzzle || !current || !solution) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            puzzle,
            current,
            solution,
            currentDifficulty,
            selectedDifficulty,
            puzzleCompleted
        }));
    } catch {
        setStatus("La sauvegarde locale est indisponible.", "error");
    }
}

function validSavedGame(saved) {
    if (!saved || !isValidGrid(saved.puzzle) || !hasGridValues(saved.current) ||
        !isValidGrid(saved.solution) || !Object.hasOwn(LEVEL_NAMES, saved.currentDifficulty) ||
        !Object.hasOwn(LEVEL_NAMES, saved.selectedDifficulty)) return false;
    if (saved.solution.some(row => row.some(value => value === 0))) return false;
    if (countSolutions(saved.puzzle, 2) !== 1) return false;
    const expected = solveSudoku(saved.puzzle);
    if (!expected || expected.some((row, rowIndex) => row.some((value, column) => value !== saved.solution[rowIndex][column]))) {
        return false;
    }
    return saved.puzzle.every((row, rowIndex) => row.every((value, column) =>
        !value || (saved.current[rowIndex][column] === value && saved.solution[rowIndex][column] === value)
    ));
}

function loadGame() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!validSavedGame(saved)) return false;
        puzzle = saved.puzzle;
        current = saved.current;
        solution = saved.solution;
        currentDifficulty = saved.currentDifficulty;
        selectedDifficulty = saved.selectedDifficulty;
        puzzleCompleted = saved.puzzleCompleted === true;
        return true;
    } catch {
        return false;
    }
}

function cellText(index) {
    const row = Math.floor(index / SIZE);
    const column = index % SIZE;
    const value = current[row][column];
    const label = value ? `, ${value}` : ", vide";
    return `Ligne ${row + 1}, colonne ${column + 1}${label}${puzzle[row][column] ? ", chiffre initial" : ""}`;
}

function render() {
    const selectedRow = Math.floor(selectedCell / SIZE);
    const selectedColumn = selectedCell % SIZE;
    const selectedValue = current?.[selectedRow]?.[selectedColumn] || 0;

    cells.forEach((cell, index) => {
        const row = Math.floor(index / SIZE);
        const column = index % SIZE;
        const value = current[row][column];
        const given = puzzle[row][column] !== 0;
        const related = row === selectedRow || column === selectedColumn ||
            (Math.floor(row / 3) === Math.floor(selectedRow / 3) && Math.floor(column / 3) === Math.floor(selectedColumn / 3));
        cell.textContent = value ? String(value) : "";
        cell.disabled = generating;
        cell.tabIndex = index === selectedCell ? 0 : -1;
        cell.setAttribute("aria-label", cellText(index));
        cell.setAttribute("aria-selected", String(index === selectedCell));
        cell.classList.toggle("given", given);
        cell.classList.toggle("related", related && index !== selectedCell);
        cell.classList.toggle("same-value", Boolean(selectedValue && value === selectedValue && index !== selectedCell));
        cell.classList.toggle("selected", index === selectedCell);
        cell.classList.toggle("wrong", Boolean(validation?.wrong.has(index)));
        cell.classList.toggle("conflict", Boolean(validation?.conflicts.has(index)));
        cell.classList.toggle("checked-correct", Boolean(validation && value && !validation.wrong.has(index) && !validation.conflicts.has(index)));
    });

    levelElement.textContent = LEVEL_NAMES[currentDifficulty];
    gameShell.renderStatistics();
    difficultyButtons.forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.difficulty === selectedDifficulty));
        button.disabled = generating;
    });
    numberButtons.forEach(button => { button.disabled = generating; });
    eraseButton.disabled = generating;
    newButton.disabled = generating;
    checkButton.disabled = generating;
}

function evaluateGrid() {
    const conflicts = findConflictingCells(current);
    const wrong = new Set();
    let empty = 0;
    for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
            const index = row * SIZE + column;
            if (!current[row][column]) empty++;
            else if (current[row][column] !== solution[row][column]) wrong.add(index);
        }
    }
    validation = { wrong, conflicts };
    const errors = new Set([...wrong, ...conflicts]).size;
    render();

    if (empty === 0 && errors === 0) {
        if (!puzzleCompleted) {
            puzzleCompleted = true;
            statistics.completedPuzzles++;
            writeStatistics(STATISTICS_KEY, statistics);
            saveGame();
            gameShell.renderStatistics();
            showSuccessAnimation();
        }
        setStatus("Sudoku terminé !", "success");
    } else if (errors) {
        setStatus(`${errors} erreur${errors === 1 ? "" : "s"}${empty ? ` · ${empty} case${empty === 1 ? "" : "s"} vide${empty === 1 ? "" : "s"}` : ""}.`, "error");
    } else {
        setStatus(`Aucune erreur · ${empty} case${empty === 1 ? "" : "s"} à remplir.`);
    }
}

function enterValue(value) {
    if (generating || !puzzle) return;
    const row = Math.floor(selectedCell / SIZE);
    const column = selectedCell % SIZE;
    if (puzzle[row][column]) return;
    current[row][column] = value;
    validation = null;
    saveGame();
    render();
    setStatus("");
    if (current.every(line => line.every(Boolean))) evaluateGrid();
}

function createPuzzle(difficulty) {
    return new Promise((resolve, reject) => {
        const requestId = `${Date.now()}-${Math.random()}`;
        const worker = new Worker(new URL("./sudoku-worker.js", import.meta.url), { type: "module" });
        activeWorker = worker;
        const timeout = setTimeout(() => {
            worker.terminate();
            activeWorker = null;
            reject(new Error("La génération de la grille a pris trop de temps."));
        }, 30000);

        worker.addEventListener("message", event => {
            if (event.data.requestId !== requestId) return;
            clearTimeout(timeout);
            worker.terminate();
            activeWorker = null;
            if (event.data.error) reject(new Error(event.data.error));
            else resolve(event.data.puzzle);
        });
        worker.addEventListener("error", event => {
            clearTimeout(timeout);
            worker.terminate();
            activeWorker = null;
            reject(new Error(event.message || "Impossible de générer une grille."));
        });
        worker.postMessage({ difficulty, requestId });
    });
}

async function startNewGame() {
    if (generating) return;
    generating = true;
    render();
    setStatus("Création de la grille…", "loading");
    try {
        const game = await createPuzzle(selectedDifficulty);
        if (countSolutions(game.puzzle, 2) !== 1 || !isValidGrid(game.solution)) {
            throw new Error("La grille générée n'a pas pu être validée.");
        }
        puzzle = game.puzzle;
        current = game.puzzle.map(row => row.slice());
        solution = game.solution;
        currentDifficulty = game.difficulty;
        puzzleCompleted = false;
        selectedCell = 40;
        validation = null;
        saveGame();
        setStatus(`${LEVEL_NAMES[currentDifficulty]} · ${game.givens} chiffres donnés.`);
    } catch (error) {
        setStatus(error.message, "error");
    } finally {
        generating = false;
        render();
    }
}

document.querySelector(".number-pad").addEventListener("click", event => {
    const button = event.target.closest("[data-value]");
    if (button) enterValue(Number(button.dataset.value));
});

eraseButton.addEventListener("click", () => enterValue(0));
checkButton.addEventListener("click", evaluateGrid);
newButton.addEventListener("click", startNewGame);
difficultyButtons.forEach(button => button.addEventListener("click", () => {
    selectedDifficulty = button.dataset.difficulty;
    saveGame();
    render();
    if (selectedDifficulty !== currentDifficulty) {
        setStatus(`Niveau choisi : ${LEVEL_NAMES[selectedDifficulty]}. Lance une nouvelle grille.`);
    }
}));

document.addEventListener("keydown", event => {
    if (!puzzle || generating || event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^[1-9]$/.test(event.key)) enterValue(Number(event.key));
    else if (event.key === "Backspace" || event.key === "Delete") enterValue(0);
    else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SIZE, ArrowDown: SIZE }[event.key];
        selectedCell = (selectedCell + movement + SIZE * SIZE) % (SIZE * SIZE);
        render();
        cells[selectedCell].focus();
    }
});

if (loadGame()) {
    render();
    evaluateGrid();
} else {
    current = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    puzzle = current.map(row => row.slice());
    solution = puzzle.map(row => row.slice());
    render();
    startNewGame();
}