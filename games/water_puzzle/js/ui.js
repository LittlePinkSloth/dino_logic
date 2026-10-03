/* ui.js */

import {
    getGameState,
    selectTube,
    pourTube,
    addBonusTube,
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
let bonusTubeButton;
let controlsElement;

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

    controlsElement =
        document.createElement("div");

    controlsElement.className =
        "game-controls";

    boardElement.after(
        controlsElement
    );

    gameShell = initGameShell({
        helpItems: [
            "Touchez une fiole, puis une autre pour y verser la couleur du dessus.",
            "Une fiole ne peut recevoir que la même couleur ou être vide. Le jeu verse autant de couches identiques que possible dans la place disponible.",
            "Une fiole pleine et monochrome est terminée et ne peut plus être utilisée.",
            "Triez toutes les couleurs pour terminer le niveau.",
            "Après une défaite, une fiole bonus d'une case peut être ajoutée jusqu'à la victoire.",
            "Des fioles particulières peuvent apparaître. Leur règle est indiquée dans la légende sous le plateau."
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

    controlsElement.append(
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

    controlsElement.append(
        restartButton
    );

    bonusTubeButton =
        document.createElement("button");

    bonusTubeButton.type =
        "button";

    bonusTubeButton.className =
        "bonus-tube-button";

    bonusTubeButton.textContent =
        "Ajouter une fiole bonus";

    bonusTubeButton.style.display =
        "none";

    bonusTubeButton.addEventListener(
        "click",
        handleBonusTubeClick
    );

    controlsElement.append(
        bonusTubeButton
    );

    boardElement.addEventListener(
        "click",
        handleBoardClick
    );

    specialLegendElement.addEventListener(
        "click",
        handleSpecialLegendClick
    );

    document.addEventListener(
        "pointerdown",
        closeSpecialLegendOnOutsideClick
    );

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeSpecialLegendTooltips();
            }
        }
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


function handleBonusTubeClick() {

    if (
        addBonusTube()
    ) {
        render();
    }
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

            tubeElement.classList.toggle(
                "tube-bonus",
                tube.isBonus === true
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

    const typeName = tube.isBonus
        ? "bonus, capacité 1 case"
        : typeNames[tube.type] ?? "spéciale";

    return `Fiole ${index + 1}, ${typeName}, ${colors}`;
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

    const descriptions = {
        stone: "Vide au début, une fiole de pierre ne peut jamais servir de source, mais peut recevoir des couleurs.",
        frozen: "Bloquée comme source et destination jusqu'à ce qu'une fiole pleine et monochrome immédiatement voisine, sur la même rangée, la dégèle.",
        hidden: "Son contenu est masqué jusqu'à ce qu'une fiole pleine et monochrome de la couleur cible apparaisse sur le plateau."
    };

    specialLegendElement.replaceChildren();
    specialLegendElement.hidden = specialTypes.length === 0;

    for (const type of specialTypes) {

        const item =
            document.createElement("li");

        item.className =
            "special-legend-item";

        const trigger =
            document.createElement("button");

        trigger.type =
            "button";

        trigger.className =
            "legend-trigger";

        trigger.setAttribute(
            "aria-label",
            `${labels[type]} : afficher la règle particulière`
        );

        trigger.setAttribute(
            "aria-expanded",
            "false"
        );

        const tooltipId =
            `legend-rule-${type}`;

        trigger.setAttribute(
            "aria-describedby",
            tooltipId
        );

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

        const label =
            document.createElement("span");

        label.textContent =
            labels[type];

        trigger.append(
            marker,
            label
        );

        const tooltip =
            document.createElement("span");

        tooltip.id =
            tooltipId;

        tooltip.className =
            "legend-tooltip";

        tooltip.setAttribute(
            "role",
            "tooltip"
        );

        tooltip.textContent =
            descriptions[type];

        item.append(
            trigger,
            tooltip
        );

        specialLegendElement.append(
            item
        );
    }
}


function handleSpecialLegendClick(event) {

    const trigger =
        event.target.closest(".legend-trigger");

    if (!trigger) {
        return;
    }

    const item =
        trigger.closest(".special-legend-item");

    const shouldOpen =
        !item.classList.contains("is-open");

    closeSpecialLegendTooltips();

    item.classList.toggle(
        "is-open",
        shouldOpen
    );

    trigger.setAttribute(
        "aria-expanded",
        String(shouldOpen)
    );
}


function closeSpecialLegendOnOutsideClick(event) {

    if (
        !specialLegendElement.contains(event.target)
    ) {
        closeSpecialLegendTooltips();
    }
}


function closeSpecialLegendTooltips() {

    specialLegendElement
        .querySelectorAll(".special-legend-item.is-open")
        .forEach(item => {
            item.classList.remove("is-open");
            item
                .querySelector(".legend-trigger")
                ?.setAttribute("aria-expanded", "false");
        });
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

        bonusTubeButton.style.display =
            "block";

        return;
    }

    restartButton.style.display =
        "none";

    bonusTubeButton.style.display =
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