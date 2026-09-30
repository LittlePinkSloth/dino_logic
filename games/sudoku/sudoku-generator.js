import { analyzeSudoku, countSolutions } from "./sudoku-solver.js";

const SIZE = 9;
const TARGET_GIVENS = { easy: 43, medium: 36, hard: 29 };

function shuffle(items) {
    for (let index = items.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
}

function candidates(grid, row, column) {
    const used = new Set();
    for (let index = 0; index < SIZE; index++) {
        used.add(grid[row][index]);
        used.add(grid[index][column]);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxColumn = Math.floor(column / 3) * 3;
    for (let boxY = 0; boxY < 3; boxY++) {
        for (let boxX = 0; boxX < 3; boxX++) used.add(grid[boxRow + boxY][boxColumn + boxX]);
    }
    return Array.from({ length: SIZE }, (_, index) => index + 1).filter(value => !used.has(value));
}

function fillGrid(grid) {
    let bestCell = null;
    let bestCandidates = null;
    for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
            if (grid[row][column]) continue;
            const options = candidates(grid, row, column);
            if (!bestCandidates || options.length < bestCandidates.length) {
                bestCell = [row, column];
                bestCandidates = options;
                if (options.length <= 1) break;
            }
        }
        if (bestCandidates?.length <= 1) break;
    }
    if (!bestCell) return true;
    if (bestCandidates.length === 0) return false;

    const [row, column] = bestCell;
    for (const value of shuffle(bestCandidates)) {
        grid[row][column] = value;
        if (fillGrid(grid)) return true;
        grid[row][column] = 0;
    }
    return false;
}

function generateSolution() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    fillGrid(grid);
    return grid;
}

function createUniquePuzzle(targetGivens) {
    const solution = generateSolution();
    const puzzle = solution.map(row => row.slice());
    const positions = shuffle(Array.from({ length: SIZE * SIZE }, (_, index) => index));
    let givens = SIZE * SIZE;

    for (const position of positions) {
        if (givens <= targetGivens) break;
        const row = Math.floor(position / SIZE);
        const column = position % SIZE;
        const value = puzzle[row][column];
        puzzle[row][column] = 0;
        if (countSolutions(puzzle, 2) === 1) givens--;
        else puzzle[row][column] = value;
    }

    return { puzzle, solution, givens };
}

function difficultyScore(puzzle, analysis) {
    const givens = puzzle.flat().filter(Boolean).length;
    const blanks = SIZE * SIZE - givens;
    return Math.round(blanks * 2 + analysis.decisions * 10 + analysis.backtracks * 8 + analysis.maxGuessDepth * 16);
}

export function generatePuzzle(difficulty, sampleCount = 5) {
    if (!Object.hasOwn(TARGET_GIVENS, difficulty)) throw new Error("Niveau de Sudoku inconnu.");
    const target = TARGET_GIVENS[difficulty];
    const samples = [];

    for (let sample = 0; sample < sampleCount; sample++) {
        const candidate = createUniquePuzzle(target);
        const analysis = analyzeSudoku(candidate.puzzle);
        samples.push({ ...candidate, score: difficultyScore(candidate.puzzle, analysis) });
    }

    samples.sort((left, right) => left.score - right.score);
    const selectedIndex = difficulty === "easy" ? 0 : difficulty === "hard" ? samples.length - 1 : Math.floor(samples.length / 2);
    const selected = samples[selectedIndex];
    return {
        difficulty,
        puzzle: selected.puzzle,
        solution: selected.solution,
        givens: selected.givens,
        score: selected.score
    };
}