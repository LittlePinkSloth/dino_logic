/* ui.js */

import {
    getGameState,
    selectTube,
    pourTube,
    restartGame,
    consumeUnlockedTubes,
    onGameStateChange
} from "./game.js";

import { initGameShell } from "../../../common/ui/game-shell.js";
import { showSuccessAnimation } from "../../../common/ui/success-animation.js";
import {
    readStatistics,
    writeStatistics
} from "../../../common/storage/statistics.js";


let boardElement;
let specialLegendElement;

let nextLevelButton;
let restartButton;

let onNextLevel = null;

let loadingNextLevel = false;
let gameShell;
let trackedLevelNumber = null;
let lastSolvedState = false;

const STATISTICS_KEY = "waterPuzzleProgress";
const progress = loadProgress();


/*
 * ============================================================
 * INITIALISATION
 * ============================================================
 */

export function initUI(nextLevelCallback) {

    boardElement =
        document.getElementById("board");

    specialLegendElement =
        document.getElementById("special-legend");

    /*
     * Les anciens éléments de niveau/statut peuvent encore
     * exister dans le HTML. On les supprime complètement
     * plutôt que de simplement les masquer.
     */
    document
        .querySelector(".level-info")
        ?.remove();

    document
        .getElementById("status")
        ?.remove();

    if (
        !boardElement ||
        !specialLegendElement
    ) {
        throw new Error(
            "Les éléments nécessaires à l'interface sont introuvables."
        );
    }

    onNextLevel =
        nextLevelCallback;

    gameShell = initGameShell({
        helpItems: [
            "Touchez une fiole, puis une autre pour y verser la couleur du dessus.",
            "Une fiole ne peut recevoir que la même couleur ou être vide. Le jeu verse autant de couches identiques que possible dans la place disponible.",
            "Triez toutes les couleurs pour terminer le niveau.",
            "La fiole gelée se débloque lorsqu'une fiole voisine est pleine et monochrome.",
            "La fiole cachée se débloque lorsqu'une fiole pleine et monochrome de sa couleur cible apparaît n'importe où sur le plateau.",
            "La fiole de pierre ne peut pas servir de fiole source."
        ],
        getStatistics: () => [
            {
                label: "Niveaux terminés",
                value: progress.completedLevels
            }
        ]
    });

    nextLevelButton =
        document.createElement("button");

    nextLevelButton.type =
        "button";

    nextLevelButton.className =
        "next-level-button";

    nextLevelButton.textContent =
        "Niveau suivant";

    nextLevelButton.style.display =
        "none";

    nextLevelButton.addEventListener(
        "click",
        handleNextLevelClick
    );

    boardElement.after(
        nextLevelButton
    );

    restartButton =
        document.createElement("button");

    restartButton.type =
        "button";

    restartButton.className =
        "restart-button";

    restartButton.textContent =
        "Recommencer";

    restartButton.style.display =
        "none";

    restartButton.addEventListener(
        "click",
        handleRestartClick
    );

    nextLevelButton.after(
        restartButton
    );

    boardElement.addEventListener(
        "click",
        handleBoardClick
    );

    /*
     * La vérification de solvabilité est asynchrone.
     * Lorsque le Worker détermine qu'une partie est perdue,
     * le board est simplement marqué visuellement comme perdu.
     */
    onGameStateChange(
        () => {
            render();
        }
    );
}


/*
 * ============================================================
 * BOUTON NIVEAU SUIVANT
 * ============================================================
 */

async function handleNextLevelClick() {

    if (
        loadingNextLevel
    ) {
        return;
    }

    if (
        typeof onNextLevel !== "function"
    ) {
        return;
    }

    loadingNextLevel = true;

    nextLevelButton.disabled = true;

    try {

        await onNextLevel();

        loadingNextLevel = false;

        render();

    } catch (error) {

        console.error(
            "Impossible de charger le niveau suivant :",
            error
        );

        loadingNextLevel = false;

        nextLevelButton.disabled = false;

        render();
    }
}


/*
 * ============================================================
 * BOUTON RECOMMENCER
 * ============================================================
 */

function handleRestartClick() {

    restartGame();

    loadingNextLevel = false;

    render();
}


/*
 * ============================================================
 * CLIC SUR UNE FIOLE
 * ============================================================
 */

function handleBoardClick(event) {

    const tubeElement =
        event.target.closest(".tube");

    if (!tubeElement) {
        return;
    }

    const index =
        Number(
            tubeElement.dataset.index
        );

    const state =
        getGameState();

    if (
        state.solved ||
        state.lost ||
        loadingNextLevel
    ) {
        return;
    }

    if (
        state.selectedTube === null
    ) {

        selectTube(index);

        render();

        return;
    }

    const sourceIndex =
        state.selectedTube;

    if (
        sourceIndex === index
    ) {

        selectTube(null);

        render();

        return;
    }

    const success =
        pourTube(
            sourceIndex,
            index
        );

    const unlockedTubes =
        success
            ? consumeUnlockedTubes()
            : [];

    if (!success) {
        selectTube(index);
    }

    render();

    if (
        unlockedTubes.length > 0
    ) {

        animateUnlockedTubes(
            unlockedTubes
        );
    }
}


/*
 * ============================================================
 * ANIMATION DES FIOLES DÉBLOQUÉES
 * ============================================================
 */

function animateUnlockedTubes(
    unlockedTubes
) {

    unlockedTubes.forEach(
        unlockedTube => {

            const tubeElement =
                boardElement.querySelector(
                    `.tube[data-index="${unlockedTube.index}"]`
                );

            if (!tubeElement) {
                return;
            }

            void tubeElement.offsetWidth;

            const animationClass =
                unlockedTube.type === "hidden"
                    ? "tube-unlock-hidden"
                    : "tube-unlock-frozen";

            const effectClass =
                unlockedTube.type === "hidden"
                    ? "unlock-effect-hidden"
                    : "unlock-effect-frozen";

            tubeElement.classList.add(
                animationClass
            );

            const effect =
                document.createElement("span");

            effect.className =
                `unlock-effect ${effectClass}`;

            effect.setAttribute(
                "aria-hidden",
                "true"
            );

            tubeElement.appendChild(
                effect
            );

            window.setTimeout(
                () => {

                    tubeElement.classList.remove(
                        animationClass
                    );

                    effect.remove();

                },
                700
            );
        }
    );
}


/*
 * ============================================================
 * RENDU GLOBAL
 * ============================================================
 */

export function render() {

    const state =
        getGameState();

    trackLevelCompletion(state);

    renderBoard(state);

    renderNextLevelButton(state);

    renderRestartButton(state);
}



/*
 * ============================================================
 * PLATEAU
 * ============================================================
 */

function renderBoard(state) {

    boardElement.innerHTML = "";
    boardElement.dataset.tubeCount = state.tubeInfo.length;

    boardElement.classList.toggle(
        "is-lost",
        state.lost
    );

    state.tubeInfo.forEach(
        (tube, index) => {

            const tubeElement =
                document.createElement("button");

            tubeElement.type =
                "button";

            tubeElement.className =
                "tube";

            tubeElement.dataset.index =
                index;

            tubeElement.classList.add(
                `tube-${tube.type}`
            );

            if (
                state.selectedTube === index
            ) {

                tubeElement.classList.add(
                    "selected"
                );
            }

            if (
                tube.layers.length === 0
            ) {

                tubeElement.classList.add(
                    "empty"
                );
            }

            tubeElement.setAttribute(
                "aria-label",
                getTubeLabel(tube, index)
            );

            /*
             * Une fiole hidden conserve son contenu dans
             * le moteur mais ne l'affiche pas.
             *
             * Elle affiche à la place sa couleur cible.
             */

            if (
                tube.type === "hidden"
            ) {

                renderHiddenTarget(
                    tubeElement,
                    tube.targetColor
                );

            } else {

                tube.layers.forEach(
                    color => {

                        const water =
                            document.createElement("div");

                        water.className =
                            "water";

                        water.dataset.color =
                            color;

                        water.style.backgroundColor =
                            getColorValue(color);

                        tubeElement.appendChild(
                            water
                        );
                    }
                );
            }

            /*
             * Les petits marqueurs ronds précédemment affichés
             * dans les fioles sont volontairement supprimés.
             *
             * Ils étaient susceptibles d'être masqués ou coupés
             * par les couches d'eau les plus hautes.
             */

            boardElement.appendChild(
                tubeElement
            );
        }
    );

    boardElement.classList.add("is-ready");
    renderSpecialLegend(state);
}


function getTubeLabel(tube, index) {

    const typeNames = {
        normal: "classique",
        stone: "de pierre, inutilisable comme source",
        frozen: "gelée, bloquée",
        hidden: "cachée"
    };

    const colors = tube.type === "hidden"
        ? `couleur cible ${getColorName(tube.targetColor)}`
        : tube.layers.length > 0
            ? `couleurs visibles ${[...tube.layers].reverse().map(getColorName).join(", ")}`
            : "vide";

    return `Fiole ${index + 1}, ${typeNames[tube.type] ?? "spéciale"}, ${colors}`;
}


function getTubeMarker(type) {

    return {
        stone: "◆",
        frozen: "❄",
        hidden: "✦"
    }[type] ?? "";
}


function renderSpecialLegend(state) {

    const specialTypes = [...new Set(
        state.tubeInfo
            .map(tube => tube.type)
            .filter(type => type !== "normal")
    )];

    const labels = {
        stone: "Pierre",
        frozen: "Gelée",
        hidden: "Cachée"
    };

    specialLegendElement.replaceChildren();
    specialLegendElement.hidden = specialTypes.length === 0;

    for (const type of specialTypes) {

        const item =
            document.createElement("li");

        const marker =
            document.createElement("span");

        marker.className =
            `legend-marker marker-${type}`;

        marker.textContent =
            getTubeMarker(type);

        marker.setAttribute(
            "aria-hidden",
            "true"
        );

        item.append(
            marker,
            document.createTextNode(labels[type])
        );

        specialLegendElement.append(item);
    }
}


/*
 * ============================================================
 * ÉTIQUETTE DE COULEUR HIDDEN
 * ============================================================
 */

function renderHiddenTarget(
    tubeElement,
    targetColor
) {

    const label =
        document.createElement("span");

    label.className =
        "hidden-target-label";

    label.textContent =
        getColorName(targetColor);

    label.dataset.color =
        targetColor ?? "";

    label.setAttribute(
        "aria-label",
        `Couleur cible : ${getColorName(targetColor)}`
    );

    tubeElement.appendChild(
        label
    );
}


/*
 * ============================================================
 * COULEURS
 * ============================================================
 */

function getColorValue(color) {

    const colors = {

        red: "#ef6461",

        blue: "#5b8def",

        green: "#61b56b",

        yellow: "#f2c94c",

        purple: "#9b6fd3",

        orange: "#ee9650"
    };

    return (
        colors[color] ??
        "#999999"
    );
}


function getColorName(color) {

    const names = {

        red: "ROUGE",

        blue: "BLEU",

        green: "VERT",

        yellow: "JAUNE",

        purple: "VIOLET",

        orange: "ORANGE"
    };

    return (
        names[color] ??
        "?"
    );
}




/*
 * ============================================================
 * BOUTON NIVEAU SUIVANT
 * ============================================================
 */

function renderNextLevelButton(state) {

    if (
        state.solved
    ) {

        nextLevelButton.style.display =
            "block";

        nextLevelButton.disabled =
            loadingNextLevel;

        return;
    }

    nextLevelButton.style.display =
        "none";

    nextLevelButton.disabled =
        false;
}


/*
 * ============================================================
 * BOUTON RECOMMENCER
 * ============================================================
 */

function renderRestartButton(state) {

    if (
        state.lost
    ) {

        restartButton.style.display =
            "block";

        return;
    }

    restartButton.style.display =
        "none";
}


/*
 * ============================================================
 * UTILITAIRE
 * ============================================================
 */



function trackLevelCompletion(state) {

    if (trackedLevelNumber !== state.level.number) {
        trackedLevelNumber = state.level.number;
        lastSolvedState = false;
    }

    if (state.solved && !lastSolvedState) {
        progress.completedLevels++;
        writeStatistics(STATISTICS_KEY, progress);
        gameShell.renderStatistics();
        showSuccessAnimation();
    }

    lastSolvedState = state.solved;
}


function loadProgress() {

    return readStatistics(
        STATISTICS_KEY,
        () => ({ completedLevels: 0 }),
        stored => ({
            currentLevel:
                Number.isSafeInteger(stored.currentLevel) &&
                stored.currentLevel > 0
                    ? stored.currentLevel
                    : 1,

            completedLevels:
                Number.isSafeInteger(stored.completedLevels) &&
                stored.completedLevels >= 0
                    ? stored.completedLevels
                    : 0
        })
    );
}