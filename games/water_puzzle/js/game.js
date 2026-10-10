/* game.js */

import {
    getPossibleMoves
} from "./solver.js";

import {
    areSameRowNeighbors,
    assertLevelLimits,
    canBeDestination,
    canBeSource,
    canUnlockOtherTubes,
    canMixTube,
    getTubeCapacity,
    isMonochromeFull,
    isTubeClosed,
    normalizeMysteryLayers
} from "./rules.js";


const DEFAULT_CAPACITY = 4;


/*
 * ============================================================
 * WORKER DE VÉRIFICATION DE SOLVABILITÉ
 * ============================================================
 *
 * Cette instance est dédiée aux vérifications du plateau
 * courant afin de ne pas perturber le Worker de génération.
 */

const solvabilityWorker =
    new Worker(
        new URL("./generator.worker.js", import.meta.url),
        {
            type: "module"
        }
    );


let solvabilityRequestId = 0;
let bonusTubeSolvable = false;
let mixableTubeIndexes = [];


/*
 * ============================================================
 * NOTIFICATION DE CHANGEMENT D'ÉTAT
 * ============================================================
 *
 * Le Worker peut modifier l'état du jeu de manière
 * asynchrone. L'UI doit donc être prévenue lorsque le résultat
 * d'une vérification arrive.
 */

const stateChangeListeners =
    new Set();


export function onGameStateChange(callback) {

    if (
        typeof callback !== "function"
    ) {
        return () => {};
    }

    stateChangeListeners.add(
        callback
    );

    return () => {

        stateChangeListeners.delete(
            callback
        );
    };
}


function notifyGameStateChanged() {

    for (
        const callback
        of stateChangeListeners
    ) {

        try {

            callback();

        } catch (error) {

            console.error(
                "Erreur dans un listener d'état du jeu :",
                error
            );
        }
    }
}


/*
 * ============================================================
 * ÉTAT DU JEU
 * ============================================================
 */

let tubes = [];
let initialTubes = [];

let capacity = DEFAULT_CAPACITY;

let selectedTube = null;
let moves = 0;

let lost = false;


/*
 * Indices des fioles qui viennent d'être débloquées.
 * L'UI les consomme juste après le versement pour lancer
 * l'animation au même moment que la validation de la condition.
 */

let pendingUnlockedTubes = [];


let levelInfo = {
    number: 1,
    difficulty: "normal",
    solutionMoves: null,
    colors: []
};


/*
 * ============================================================
 * MODÈLE DES FIOLES
 * ============================================================
 */

function createTube(layers = []) {

    return {
        type: "normal",
        layers: [...layers],
        mysteryLayers: layers.map(() => false)
    };
}


function normalizeTube(tube) {

    if (Array.isArray(tube)) {
        return createTube(tube);
    }

    if (
        tube &&
        typeof tube === "object"
    ) {
        return {
            ...tube,

            type:
                tube.type ??
                "normal",

            layers:
                Array.isArray(tube.layers)
                    ? [...tube.layers]
                    : [],

            mysteryLayers:
                normalizeMysteryLayers(tube),

            targetColor:
                tube.targetColor ??
                null
        };
    }

    return createTube();
}


function cloneTubes(sourceTubes) {

    return sourceTubes.map(
        tube => ({
            ...tube,

            layers:
                [...tube.layers],

            mysteryLayers:
                [...tube.mysteryLayers]
        })
    );
}


/*
 * ============================================================
 * INITIALISATION
 * ============================================================
 */

export function initializeGame(level) {

    assertLevelLimits(
        level.tubes
    );

    capacity =
        level.capacity ??
        DEFAULT_CAPACITY;

    tubes =
        level.tubes.map(
            tube =>
                normalizeTube(tube)
        );

    initialTubes =
        cloneTubes(tubes);

    selectedTube = null;

    moves = 0;

    lost = false;
    bonusTubeSolvable = false;
    mixableTubeIndexes = [];

    pendingUnlockedTubes = [];

    /*
     * Invalide toutes les éventuelles vérifications
     * provenant d'un état précédent.
     */
    solvabilityRequestId++;

    levelInfo = {
        number:
            level.number ??
            1,

        difficulty:
            level.difficulty ??
            "normal",

        solutionMoves:
            level.solutionMoves ??
            null,

        colors:
            level.colors
                ? [...level.colors]
                : []
    };

    /*
     * Certaines fioles peuvent être immédiatement débloquées
     * dès la création du niveau.
     */
    unblockEligibleTubes();

    /*
     * Le niveau vient d'être généré par le générateur, qui
     * garantit déjà qu'il possède une solution.
     *
     * On ne lance donc aucune recherche BFS ici.
     */
}


/*
 * ============================================================
 * RECOMMENCER LE NIVEAU
 * ============================================================
 */

export function restartGame() {

    tubes =
        cloneTubes(initialTubes);

    selectedTube = null;

    moves = 0;

    lost = false;
    bonusTubeSolvable = false;
    mixableTubeIndexes = [];

    pendingUnlockedTubes = [];

    /*
     * Invalide toutes les éventuelles vérifications
     * provenant du plateau précédent.
     */
    solvabilityRequestId++;

    /*
     * Recalcule les éventuels déblocages.
     */
    unblockEligibleTubes();
}


/*
 * ============================================================
 * FIOLE BONUS APRÈS DÉFAITE
 * ============================================================
 */

export function addBonusTube() {

    if (
        !lost ||
        !bonusTubeSolvable ||
        isSolved()
    ) {
        return false;
    }

    bonusTubeSolvable = false;

    const bonusTube = {
        type: "normal",
        layers: [],
        mysteryLayers: [],
        capacity: 1,
        isBonus: true
    };

    tubes.push(bonusTube);

    initialTubes.push({
        ...bonusTube,
        layers: [],
        mysteryLayers: []
    });

    selectedTube = null;

    updateLostState();

    return true;
}


/*
 * ============================================================
 * LECTURE DE L'ÉTAT
 * ============================================================
 */

export function getTubes() {

    return tubes.map(
        tube =>
            [...tube.layers]
    );
}


export function getTubeInfo() {

    return tubes.map(
        tube => ({
            ...tube,

            layers:
                [...tube.layers],

            mysteryLayers:
                [...tube.mysteryLayers]
        })
    );
}


export function getSelectedTube() {

    return selectedTube;
}


export function getMoves() {

    return moves;
}


export function getCapacity() {

    return capacity;
}


export function getLevelInfo() {

    return {
        number:
            levelInfo.number,

        difficulty:
            levelInfo.difficulty,

        solutionMoves:
            levelInfo.solutionMoves,

        colors:
            [...levelInfo.colors]
    };
}


/*
 * ============================================================
 * DÉBLOCAGE AUTOMATIQUE
 * ============================================================
 *
 * FIOLE GELÉE
 * -----------
 * Une fiole gelée devient normale dès qu'une fiole
 * immédiatement voisine est pleine et monochrome.
 *
 * FIOLE HIDDEN
 * ------------
 * Une fiole hidden devient normale dès qu'une fiole
 * quelconque du plateau est pleine et monochrome dans
 * sa couleur cible (`targetColor`).
 *
 * La fiole hidden n'utilise donc plus la proximité.
 */


/*
 * Vérifie qu'une fiole est pleine et monochrome.
 */

function isTubeMonochromeFull(index) {

    const tube =
        tubes[index];

    return isMonochromeFull(
        tube,
        capacity
    );
}


/*
 * Retourne la couleur d'une fiole pleine et monochrome.
 * Retourne null si la fiole n'est pas monochrome et pleine.
 */

function getMonochromeColor(index) {

    if (
        !isTubeMonochromeFull(index)
    ) {
        return null;
    }

    return tubes[index].layers[0];
}


/*
 * Vérifie si une fiole pleine et monochrome est immédiatement
 * voisine de la fiole indiquée.
 *
 * Cette fonction reste exclusivement utilisée par `frozen`.
 */

function hasFullNeighbor(index) {

    return tubes.some(
        (candidate, candidateIndex) =>
            canUnlockOtherTubes(candidate) &&
            areSameRowNeighbors(index, candidateIndex) &&
            isTubeMonochromeFull(candidateIndex)
    );
}


/*
 * Vérifie si une fiole pleine et monochrome correspondant
 * à la couleur cible d'une fiole hidden existe n'importe où
 * sur le plateau.
 */

function hasTargetColorTube(index) {

    const tube =
        tubes[index];

    if (!tube) {
        return false;
    }

    const targetColor =
        tube.targetColor;

    if (!targetColor) {
        return false;
    }

    return tubes.some(
        (candidateTube, candidateIndex) => {

            if (
                candidateIndex === index
            ) {
                return false;
            }

            return (
                canUnlockOtherTubes(candidateTube) &&
                getMonochromeColor(candidateIndex) ===
                targetColor
            );
        }
    );
}


/*
 * Vérifie si une fiole bloquée peut être utilisée.
 *
 * frozen :
 *     fiole monochrome pleine immédiatement voisine
 *
 * hidden :
 *     fiole monochrome pleine de la couleur cible,
 *     n'importe où sur le plateau
 */

function canUseBlockedTube(index) {

    const tube =
        tubes[index];

    if (!tube) {
        return false;
    }

    if (tube.type === "frozen") {

        return hasFullNeighbor(index);
    }

    if (tube.type === "hidden") {

        return hasTargetColorTube(index);
    }

    return true;
}


/*
 * Débloque toutes les fioles dont la condition est remplie.
 *
 * La boucle continue jusqu'à ce qu'aucun nouveau déblocage
 * ne soit possible.
 */

function unblockEligibleTubes() {

    let unlockedSomething = true;

    while (unlockedSomething) {

        unlockedSomething = false;

        tubes.forEach(
            (tube, index) => {

                if (
                    tube.type !== "frozen" &&
                    tube.type !== "hidden"
                ) {
                    return;
                }

                if (
                    !canUseBlockedTube(index)
                ) {
                    return;
                }

                const previousType =
                    tube.type;

                tube.type = "normal";

                pendingUnlockedTubes.push({
                    index,
                    type: previousType
                });

                unlockedSomething = true;
            }
        );
    }
}


/*
 * Retourne les fioles débloquées depuis le dernier appel.
 * Chaque entrée contient l'indice et le type avant déblocage.
 */

export function consumeUnlockedTubes() {

    const unlocked =
        [...pendingUnlockedTubes];

    pendingUnlockedTubes = [];

    return unlocked;
}


/*
 * ============================================================
 * VÉRIFICATION DE SOLVABILITÉ DANS LE WORKER
 * ============================================================
 */

function checkSolvabilityInWorker() {

    const requestId =
        solvabilityRequestId;

    solvabilityWorker.postMessage({
        type: "checkSolvable",

        requestId,

        tubes:
            cloneTubes(tubes),

        capacity
    });
}


function hasImpossibleGiantCompletion() {

    const giantIndex =
        tubes.findIndex(
            tube =>
                tube.type === "giant"
        );

    if (giantIndex < 0) {
        return false;
    }

    const giant =
        tubes[giantIndex];

    if (isMonochromeFull(giant, capacity)) {
        return false;
    }

    const colorCounts = new Map();

    for (const tube of tubes) {
        for (const color of tube.layers) {
            colorCounts.set(
                color,
                (colorCounts.get(color) ?? 0) + 1
            );
        }
    }

    return tubes.some(
        (tube, index) =>
            index !== giantIndex &&
            isMonochromeFull(tube, capacity) &&
            (colorCounts.get(tube.layers[0]) ?? 0) >
                DEFAULT_CAPACITY
    );
}


/*
 * Réception des résultats du Worker de solvabilité.
 */

solvabilityWorker.onmessage =
    event => {

        const data =
            event.data;

        if (
            !data ||
            typeof data !== "object"
        ) {
            return;
        }

        if (
            data.type ===
            "solvabilityChecked"
        ) {

            /*
             * Une réponse ancienne ne doit jamais modifier
             * l'état du plateau actuel.
             */
            if (
                data.requestId !==
                solvabilityRequestId
            ) {
                return;
            }

            /*
             * Le plateau a pu devenir résolu entre-temps.
             */
            if (isSolved()) {

                lost = false;
                bonusTubeSolvable = false;
                mixableTubeIndexes = [];

                notifyGameStateChanged();

                return;
            }

            if (hasImpossibleGiantCompletion()) {
                lost = true;
                bonusTubeSolvable = false;
                notifyGameStateChanged();
                return;
            }

            lost =
                !data.solvable;
            bonusTubeSolvable =
                lost &&
                data.bonusSolvable === true;
            mixableTubeIndexes =
                lost &&
                Array.isArray(data.mixableTubeIndexes)
                    ? data.mixableTubeIndexes.filter(
                        index =>
                            Number.isSafeInteger(index) &&
                            index >= 0 &&
                            index < tubes.length
                    )
                    : [];

            /*
             * Le résultat arrive de manière asynchrone.
             * L'UI doit donc être explicitement prévenue.
             */
            notifyGameStateChanged();

            return;
        }


        if (
            data.type ===
            "solvabilityError"
        ) {

            if (
                data.requestId !==
                solvabilityRequestId
            ) {
                return;
            }

            console.error(
                "Erreur du Worker de solvabilité :",
                data.error
            );

            /*
             * Une erreur technique ne doit jamais être
             * considérée comme une défaite.
             */
            lost = false;
            bonusTubeSolvable = false;
            mixableTubeIndexes = [];

            notifyGameStateChanged();

            return;
        }
    };


solvabilityWorker.onerror =
    error => {

        console.error(
            "Erreur du Worker de solvabilité :",
            error
        );

        lost = false;
        bonusTubeSolvable = false;
        mixableTubeIndexes = [];

        notifyGameStateChanged();
    };


/*
 * ============================================================
 * DÉTECTION DE DÉFAITE
 * ============================================================
 *
 * Le Worker vérifie si l'état possède une solution, puis teste
 * l'ajout d'une fiole bonus si le plateau est perdu.
 */

function updateLostState() {

    /*
     * Chaque nouvel état invalide les réponses précédentes.
     */
    solvabilityRequestId++;
    bonusTubeSolvable = false;
    mixableTubeIndexes = [];

    if (isSolved()) {

        lost = false;

        notifyGameStateChanged();

        return;
    }

    if (hasImpossibleGiantCompletion()) {
        lost = true;
        bonusTubeSolvable = false;
        mixableTubeIndexes = [];
        notifyGameStateChanged();
        return;
    }

    /*
     * Le Worker vérifie si le plateau est solvable et, en cas
     * de défaite, si l'ajout d'une fiole bonus permet une victoire.
     */
    lost = false;
    bonusTubeSolvable = false;

    notifyGameStateChanged();

    checkSolvabilityInWorker();
}


/*
 * ============================================================
 * SÉLECTION
 * ============================================================
 */

export function selectTube(index) {

    if (index === null) {

        selectedTube = null;

        notifyGameStateChanged();

        return;
    }

    if (
        index < 0 ||
        index >= tubes.length
    ) {
        return;
    }

    const tube =
        tubes[index];

    if (tube.layers.length === 0) {

        selectedTube = null;

        return;
    }

    if (
        isTubeClosed(tube, capacity)
    ) {
        selectedTube = null;
        return;
    }

    if (
        tube.type === "stone" ||
        tube.type === "giant"
    ) {

        selectedTube = null;

        return;
    }

    /*
     * Garde-fou pour une fiole déjà éligible au moment
     * de sa sélection.
     */

    if (
        tube.type === "frozen" ||
        tube.type === "hidden"
    ) {

        if (
            !canUseBlockedTube(index)
        ) {

            selectedTube = null;

            return;
        }

        const previousType =
            tube.type;

        tube.type = "normal";

        pendingUnlockedTubes.push({
            index,
            type: previousType
        });

        /*
         * Cette sélection débloque une fiole.
         * Le plateau doit donc être réévalué.
         */
        updateLostState();
    }

    selectedTube = index;
}


/*
 * ============================================================
 * VALIDATION D'UN VERSEMENT
 * ============================================================
 */

function canPour(
    sourceIndex,
    targetIndex
) {

    if (
        sourceIndex === targetIndex
    ) {
        return false;
    }

    const source =
        tubes[sourceIndex];

    const target =
        tubes[targetIndex];

    if (!source || !target) {
        return false;
    }

    if (source.layers.length === 0) {
        return false;
    }

    if (
        isTubeClosed(source, capacity) ||
        isTubeClosed(target, capacity)
    ) {
        return false;
    }

    if (!canBeSource(source)) {
        return false;
    }

    const targetCapacity =
        getTubeCapacity(
            target,
            capacity
        );

    if (
        target.layers.length >= targetCapacity
    ) {
        return false;
    }

    const sourceColor =
        source.layers[
            source.layers.length - 1
        ];

    if (!canBeDestination(target, sourceColor)) {
        return false;
    }

    const targetColor =
        target.layers[
            target.layers.length - 1
        ];

    if (
        target.layers.length > 0 &&
        targetColor !== sourceColor
    ) {
        return false;
    }

    return true;
}


/*
 * ============================================================
 * VERSEMENT
 * ============================================================
 */

export function pourTube(
    sourceIndex,
    targetIndex
) {

    if (
        !canPour(
            sourceIndex,
            targetIndex
        )
    ) {
        return false;
    }

    const source =
        tubes[sourceIndex];

    const target =
        tubes[targetIndex];

    const color =
        source.layers[
            source.layers.length - 1
        ];

    let amount = 1;

    while (
        amount < source.layers.length &&
        source.layers[
            source.layers.length - 1 - amount
        ] === color
    ) {

        amount++;
    }

    const freeSpace =
        getTubeCapacity(target, capacity) -
        target.layers.length;

    const amountToPour =
        Math.min(
            amount,
            freeSpace
        );

    for (
        let i = 0;
        i < amountToPour;
        i++
    ) {

        target.layers.push(
            source.layers.pop()
        );

        target.mysteryLayers.push(
            source.mysteryLayers.pop()
        );
    }

    revealTopMystery(source);
    revealTopMystery(target);

    moves++;

    selectedTube = null;

    /*
     * Le plateau vient de changer :
     * validation immédiate des déblocages.
     */
    unblockEligibleTubes();

    /*
     * Puis vérification de la solvabilité.
     *
     * Le BFS éventuel est maintenant exécuté dans le Worker.
     */
    updateLostState();

    return true;
}


function revealTopMystery(tube) {

    const topIndex =
        tube.mysteryLayers.length - 1;

    if (
        topIndex >= 0 &&
        tube.mysteryLayers[topIndex]
    ) {
        tube.mysteryLayers[topIndex] = false;
    }
}


function shuffleLayers(layers) {

    const shuffled = [...layers];

    for (
        let index = shuffled.length - 1;
        index > 0;
        index--
    ) {
        const swapIndex =
            Math.floor(Math.random() * (index + 1));

        [
            shuffled[index],
            shuffled[swapIndex]
        ] = [
            shuffled[swapIndex],
            shuffled[index]
        ];
    }

    return shuffled;
}


export function mixTube(index) {

    const tube =
        tubes[index];

    if (
        !canMixTube(tube, capacity) ||
        (
            lost &&
            !mixableTubeIndexes.includes(index)
        )
    ) {
        return false;
    }

    const layers =
        tube.layers.map(
            (color, layerIndex) => ({
                color,
                mystery: tube.mysteryLayers[layerIndex]
            })
        );

    const mixedLayers =
        shuffleLayers(layers);

    const unchanged =
        mixedLayers.every(
            (layer, layerIndex) =>
                layer.color === layers[layerIndex].color &&
                layer.mystery === layers[layerIndex].mystery
        );

    if (
        unchanged
    ) {
        const differentLayerIndex =
            mixedLayers.findIndex(
                layer =>
                    layer.color !== mixedLayers[0].color ||
                    layer.mystery !== mixedLayers[0].mystery
            );

        if (
            differentLayerIndex > 0
        ) {
            [
                mixedLayers[0],
                mixedLayers[differentLayerIndex]
            ] = [
                mixedLayers[differentLayerIndex],
                mixedLayers[0]
            ];
        }
    }

    tube.layers =
        mixedLayers.map(layer => layer.color);

    tube.mysteryLayers =
        mixedLayers.map(layer => layer.mystery);

    revealTopMystery(tube);

    selectedTube = null;
    moves++;

    updateLostState();

    return true;
}


/*
 * ============================================================
 * VICTOIRE
 * ============================================================
 */

function isTubeSolved(tube) {

    const layers =
        tube.layers;

    if (tube.type === "giant") {
        return isMonochromeFull(tube, capacity);
    }

    if (layers.length === 0) {
        return true;
    }

    return isTubeClosed(
        tube,
        capacity
    );
}


export function isSolved() {

    return tubes.every(
        tube =>
            isTubeSolved(tube)
    );
}


/*
 * ============================================================
 * ÉTAT COMPLET
 * ============================================================
 */

export function getGameState() {

    const solved =
        isSolved();

    return {
        tubes:
            getTubes(),

        tubeInfo:
            getTubeInfo(),

        mixableTubeIndexes:
            [...mixableTubeIndexes],

        capacity,

        selectedTube,

        moves,

        solved,

        lost:
            solved
                ? false
                : lost,

        bonusTubeSolvable:
            lost &&
            bonusTubeSolvable,

        level:
            getLevelInfo()
    };
}