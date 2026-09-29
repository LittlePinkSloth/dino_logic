import { generatePuzzle } from "./generator.js";

/*

* ============================================================
* ÉTAT DU JEU
* ============================================================
  */

let currentPuzzle = null;

let placed = [];

let marked = [];

let incorrect = [];

let lives = 3;

let history = [];

/*

* ============================================================
* CONSTANTES
* ============================================================
  */

const INITIAL_LIVES = 3;

const DEFAULT_SIZE = 6;

/*

* ============================================================
* INITIALISER UNE PARTIE
* ============================================================
  */

export async function initializeGame(
size = DEFAULT_SIZE
) {


currentPuzzle =
    await generatePuzzle(size);


const cellCount =
    currentPuzzle.size *
    currentPuzzle.size;


placed =
    new Array(cellCount)
        .fill(false);


marked =
    new Array(cellCount)
        .fill(false);


incorrect =
    new Array(cellCount)
        .fill(false);


lives =
    INITIAL_LIVES;


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
* ACCÈS AUX CASES INCORRECTES
* ============================================================
  */

export function getIncorrect() {


return [...incorrect];


}

/*

* ============================================================
* ACCÈS AUX VIES
* ============================================================
  */

export function getLives() {


return lives;


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
 * Une case contenant un dino ne peut pas
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
* VÉRIFIER SI UN DINO EST CORRECT
* ============================================================
*
* La solution est stockée sous la forme :
*
* solution[row] = column
* ============================================================
  */

function isCorrectPlacement(index) {


const size =
    currentPuzzle.size;


const row =
    Math.floor(index / size);

const column =
    index % size;


return (
    currentPuzzle.solution[row] ===
    column
);


}

/*

* ============================================================
* SAUVEGARDER L'ÉTAT
* ============================================================
  */

function saveHistory() {


history.push({

    placed:
        [...placed],

    marked:
        [...marked],

    incorrect:
        [...incorrect],

    lives:
        lives
});


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


/*
 * Une partie terminée ne permet plus
 * de placer ou retirer de dinos.
 */

if (
    isGameOver()
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
 * Si le joueur retire un dino,
 * il n'y a pas de nouvelle erreur à évaluer.
 */

if (placed[index]) {

    saveHistory();


    placed[index] = false;

    incorrect[index] = false;


    return;
}


/*
 * Sauvegarde de l'état complet
 * avant le nouveau placement.
 */

saveHistory();


/*
 * Un dino remplace automatiquement
 * une croix.
 */

marked[index] = false;


/*
 * Place le dino.
 */

placed[index] = true;


/*
 * Vérifier immédiatement si le dino
 * correspond à la solution.
 */

if (
    !isCorrectPlacement(index)
) {

    incorrect[index] = true;

    lives--;
}


}

/*

* ============================================================
* EFFACER
* ============================================================
  */

export function clearBoard() {


saveHistory();


const cellCount =
    currentPuzzle.size *
    currentPuzzle.size;


placed =
    new Array(cellCount)
        .fill(false);


marked =
    new Array(cellCount)
        .fill(false);


incorrect =
    new Array(cellCount)
        .fill(false);


/*
 * Effacer le plateau ne rend pas les vies perdues.
 */


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


incorrect =
    previous.incorrect;


lives =
    previous.lives;


return true;


}

/*

* ============================================================
* NOUVELLE PARTIE
* ============================================================
  */

export async function newPuzzle(
size = DEFAULT_SIZE
) {


currentPuzzle =
    await generatePuzzle(size);


const cellCount =
    currentPuzzle.size *
    currentPuzzle.size;


placed =
    new Array(cellCount)
        .fill(false);


marked =
    new Array(cellCount)
        .fill(false);


incorrect =
    new Array(cellCount)
        .fill(false);


lives =
    INITIAL_LIVES;


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
* Une grille est résolue lorsque :
*
* * toutes les lignes ont un dino
* * toutes les colonnes ont un dino
* * toutes les zones ont un dino
* * aucun dino n'est adjacent
* * tous les dinos sont corrects
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


/*
 * Tous les dinos doivent correspondre
 * à la solution.
 */

for (
    let i = 0;
    i < placed.length;
    i++
) {

    if (
        placed[i] &&
        !isCorrectPlacement(i)
    ) {

        return false;
    }
}


return true;


}

/*

* ============================================================
* PARTIE PERDUE
* ============================================================
  */

export function isGameOver() {


return lives <= 0;


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

    incorrect:
        [...incorrect],

    lives:
        lives,

    puzzle:
        currentPuzzle,

    dinos:
        countDinos(),

    valid:
        isValidBoard(),

    solved:
        isSolved(),

    gameOver:
        isGameOver(),

    canUndo:
        history.length > 0
};


}
