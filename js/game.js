
import { generatePuzzle } from "./generator.js";


/*
 * ============================================================
 * ÉTAT DU JEU
 * ============================================================
 */

let currentPuzzle = null;

let placed = [];

let marked = [];

let history = [];


/*
 * ============================================================
 * INITIALISER UNE PARTIE
 * ============================================================
 */

export async function initializeGame() {

    currentPuzzle =
        await generatePuzzle();


    const cellCount =
        currentPuzzle.size *
        currentPuzzle.size;


    placed =
        new Array(cellCount)
            .fill(false);


    marked =
        new Array(cellCount)
            .fill(false);


    history = [];
}


/*
 * ============================================================
 * ACCÈS AU PUZZLE
 * ============================================================
 */

export function getCurrentPuzzle() {

    return currentPuzzle;
}


/*
 * ============================================================
 * ÉTAT DES CASES
 * ============================================================
 */

export function getPlaced() {

    return [...placed];
}

/*
 * ============================================================
 * ACCÈS AUX CASES MARQUÉES
 * ============================================================
 */

export function getMarked() {

    return [...marked];
}


/*
 * ============================================================
 * MARQUER / DÉMARQUER UNE CASE
 * ============================================================
 *
 * Les marques sont purement visuelles.
 *
 * Elles ne sont jamais prises en compte par le solveur
 * ou les règles du jeu.
 * ============================================================
 */

export function toggleMark(index) {

    if (
        !currentPuzzle ||
        index < 0 ||
        index >= marked.length
    ) {
        return;
    }


    /*
     * Une case contenant un chat ne peut pas
     * avoir une croix.
     */

    if (placed[index]) {
        return;
    }


    marked[index] =
        !marked[index];
}

/*
 * ============================================================
 * CHANGER UNE CASE
 * ============================================================
 */

export function toggleCell(index) {

    if (
        !currentPuzzle
    ) {
        return;
    }


    if (
        index < 0 ||
        index >= placed.length
    ) {
        return;
    }


    /*
     * Sauvegarde de l'état complet.
     */

    history.push({
        placed: [...placed],
        marked: [...marked]
    });


    /*
     * Un chat remplace automatiquement une croix.
     */

    marked[index] = false;


    /*
     * Place ou retire le chat.
     */

    placed[index] =
        !placed[index];
}


/*
 * ============================================================
 * EFFACER
 * ============================================================
 */
export function clearBoard() {

    history.push({
        placed: [...placed],
        marked: [...marked]
    });


    placed =
        new Array(
            currentPuzzle.size *
            currentPuzzle.size
        ).fill(false);


    marked =
        new Array(
            currentPuzzle.size *
            currentPuzzle.size
        ).fill(false);
}


/*
 * ============================================================
 * ANNULER
 * ============================================================
 */

export function undo() {

    if (
        history.length === 0
    ) {
        return false;
    }


    const previous =
        history.pop();


    placed =
        previous.placed;


    marked =
        previous.marked;


    return true;
}


/*
 * ============================================================
 * NOUVELLE PARTIE
 * ============================================================
 */

export async function newPuzzle() {

    currentPuzzle =
        await generatePuzzle();


    const cellCount =
        currentPuzzle.size *
        currentPuzzle.size;


    placed =
        new Array(cellCount)
            .fill(false);


    marked =
        new Array(cellCount)
            .fill(false);


    history = [];
}


/*
 * ============================================================
 * VOISINS
 * ============================================================
 */

function getNeighbors(index) {

    const size =
        currentPuzzle.size;


    const row =
        Math.floor(index / size);

    const column =
        index % size;


    const neighbors = [];


    for (
        let dr = -1;
        dr <= 1;
        dr++
    ) {

        for (
            let dc = -1;
            dc <= 1;
            dc++
        ) {

            if (
                dr === 0 &&
                dc === 0
            ) {

                continue;
            }


            const r =
                row + dr;

            const c =
                column + dc;


            if (
                r >= 0 &&
                r < size &&
                c >= 0 &&
                c < size
            ) {

                neighbors.push(
                    r * size + c
                );
            }
        }
    }


    return neighbors;
}


/*
 * ============================================================
 * VÉRIFIER UNE CASE
 * ============================================================
 */

export function isValidCell(index) {

    if (
        !placed[index]
    ) {

        return true;
    }


    const size =
        currentPuzzle.size;


    const zones =
        currentPuzzle.zones;


    const row =
        Math.floor(index / size);

    const column =
        index % size;


    let rowCount = 0;

    let columnCount = 0;

    let zoneCount = 0;


    /*
     * Ligne / colonne / zone.
     */

    for (
        let i = 0;
        i < placed.length;
        i++
    ) {

        if (
            !placed[i]
        ) {

            continue;
        }


        const r =
            Math.floor(i / size);

        const c =
            i % size;


        if (
            r === row
        ) {

            rowCount++;
        }


        if (
            c === column
        ) {

            columnCount++;
        }


        if (
            zones[i] ===
            zones[index]
        ) {

            zoneCount++;
        }
    }


    if (
        rowCount > 1 ||
        columnCount > 1 ||
        zoneCount > 1
    ) {

        return false;
    }


    /*
     * Adjacent / diagonale.
     */

    for (
        const neighbor
        of getNeighbors(index)
    ) {

        if (
            placed[neighbor]
        ) {

            return false;
        }
    }


    return true;
}


/*
 * ============================================================
 * VÉRIFIER LA GRILLE
 * ============================================================
 */

export function isValidBoard() {

    for (
        let i = 0;
        i < placed.length;
        i++
    ) {

        if (
            placed[i] &&
            !isValidCell(i)
        ) {

            return false;
        }
    }


    return true;
}


/*
 * ============================================================
 * NOMBRE DE DINOS
 * ============================================================
 */

export function countDinos() {

    return placed.filter(
        Boolean
    ).length;
}


/*
 * ============================================================
 * VICTOIRE
 * ============================================================
 *
 * Comme le générateur garantit une solution unique,
 * nous n'avons plus besoin de comparer avec une solution
 * pré-enregistrée.
 *
 * Il suffit que :
 *
 * - toutes les lignes aient un chat
 * - toutes les colonnes aient un chat
 * - toutes les zones aient un chat
 * - aucun chat ne soit adjacent
 *
 * ============================================================
 */

export function isSolved() {

    const size =
        currentPuzzle.size;


    /*
     * Il faut exactement SIZE dinos.
     */

    if (
        countDinos() !== size
    ) {

        return false;
    }


    /*
     * Toutes les règles doivent être respectées.
     */

    if (
        !isValidBoard()
    ) {

        return false;
    }


    return true;
}


/*
 * ============================================================
 * ÉTAT COMPLET POUR L'INTERFACE
 * ============================================================
 */

export function getGameState() {

    return {

        size:
            currentPuzzle.size,

        placed:
            [...placed],

        marked:
            [...marked],

        puzzle:
            currentPuzzle,

        dinos:
            countDinos(),

        valid:
            isValidBoard(),

        solved:
            isSolved(),

        canUndo:
            history.length > 0
    };
}

