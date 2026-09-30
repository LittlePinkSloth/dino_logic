const SIZE = 9;
const FULL_MASK = (1 << SIZE) - 1;

function boxIndex(row, column) {
    return Math.floor(row / 3) * 3 + Math.floor(column / 3);
}

function bitCount(mask) {
    let count = 0;
    while (mask) {
        mask &= mask - 1;
        count++;
    }
    return count;
}

export function isValidGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== SIZE ||
        grid.some(row => !Array.isArray(row) || row.length !== SIZE)) return false;

    const rows = Array(SIZE).fill(0);
    const columns = Array(SIZE).fill(0);
    const boxes = Array(SIZE).fill(0);
    for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
            const value = grid[row][column];
            if (!Number.isInteger(value) || value < 0 || value > SIZE) return false;
            if (!value) continue;
            const bit = 1 << (value - 1);
            const box = boxIndex(row, column);
            if ((rows[row] & bit) || (columns[column] & bit) || (boxes[box] & bit)) return false;
            rows[row] |= bit;
            columns[column] |= bit;
            boxes[box] |= bit;
        }
    }
    return true;
}

function createState(grid) {
    if (!isValidGrid(grid)) return null;
    const board = grid.map(row => row.slice());
    const rows = Array(SIZE).fill(0);
    const columns = Array(SIZE).fill(0);
    const boxes = Array(SIZE).fill(0);
    for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
            const value = board[row][column];
            if (!value) continue;
            const bit = 1 << (value - 1);
            rows[row] |= bit;
            columns[column] |= bit;
            boxes[boxIndex(row, column)] |= bit;
        }
    }
    return { board, rows, columns, boxes };
}

function search(state, limit, stats, guessDepth) {
    stats.nodes++;
    let bestRow = -1;
    let bestColumn = -1;
    let bestMask = 0;
    let bestCount = SIZE + 1;

    for (let row = 0; row < SIZE; row++) {
        for (let column = 0; column < SIZE; column++) {
            if (state.board[row][column]) continue;
            const mask = FULL_MASK & ~(
                state.rows[row] | state.columns[column] | state.boxes[boxIndex(row, column)]
            );
            const count = bitCount(mask);
            if (count === 0) return;
            if (count < bestCount) {
                bestRow = row;
                bestColumn = column;
                bestMask = mask;
                bestCount = count;
                if (count === 1) break;
            }
        }
        if (bestCount === 1) break;
    }

    if (bestRow === -1) {
        stats.solutions++;
        if (!stats.solution) stats.solution = state.board.map(row => row.slice());
        return;
    }

    const nextGuessDepth = guessDepth + (bestCount > 1 ? 1 : 0);
    if (bestCount > 1) {
        stats.decisions++;
        stats.maxGuessDepth = Math.max(stats.maxGuessDepth, nextGuessDepth);
    }
    const box = boxIndex(bestRow, bestColumn);
    while (bestMask && stats.solutions < limit) {
        const bit = bestMask & -bestMask;
        bestMask &= bestMask - 1;
        const value = 32 - Math.clz32(bit);
        state.board[bestRow][bestColumn] = value;
        state.rows[bestRow] |= bit;
        state.columns[bestColumn] |= bit;
        state.boxes[box] |= bit;
        const before = stats.solutions;
        search(state, limit, stats, nextGuessDepth);
        if (stats.solutions === before) stats.backtracks++;
        state.board[bestRow][bestColumn] = 0;
        state.rows[bestRow] ^= bit;
        state.columns[bestColumn] ^= bit;
        state.boxes[box] ^= bit;
    }
}

function analyze(grid, limit) {
    const state = createState(grid);
    const stats = { solutions: 0, solution: null, nodes: 0, decisions: 0, backtracks: 0, maxGuessDepth: 0 };
    if (state) search(state, Math.max(1, limit), stats, 0);
    return stats;
}

export function countSolutions(grid, limit = 2) {
    return analyze(grid, limit).solutions;
}

export function solveSudoku(grid) {
    return analyze(grid, 1).solution;
}

export function analyzeSudoku(grid) {
    const stats = analyze(grid, 1);
    return {
        solution: stats.solution,
        nodes: stats.nodes,
        decisions: stats.decisions,
        backtracks: stats.backtracks,
        maxGuessDepth: stats.maxGuessDepth
    };
}

export function findConflictingCells(grid) {
    const conflicts = new Set();
    if (!Array.isArray(grid) || grid.length !== SIZE) return conflicts;

    const inspect = cells => {
        const positionsByValue = new Map();
        for (const [row, column] of cells) {
            const value = grid[row]?.[column];
            if (!Number.isInteger(value) || value === 0) continue;
            const positions = positionsByValue.get(value) || [];
            positions.push(row * SIZE + column);
            positionsByValue.set(value, positions);
        }
        for (const positions of positionsByValue.values()) {
            if (positions.length > 1) positions.forEach(position => conflicts.add(position));
        }
    };

    for (let index = 0; index < SIZE; index++) {
        inspect(Array.from({ length: SIZE }, (_, cell) => [index, cell]));
        inspect(Array.from({ length: SIZE }, (_, cell) => [cell, index]));
    }
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxColumn = 0; boxColumn < 3; boxColumn++) {
            inspect(Array.from({ length: SIZE }, (_, cell) => [
                boxRow * 3 + Math.floor(cell / 3),
                boxColumn * 3 + cell % 3
            ]));
        }
    }
    return conflicts;
}