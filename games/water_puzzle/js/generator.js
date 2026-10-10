/* generator.js */

import {
    getPossibleMoves,
    solveLevel
} from "./solver.js";

import {
    areSameRowNeighbors,
    assertLevelLimits,
    canBeDestination,
    canBeSource,
    canUnlockOtherTubes,
    getTubeCapacity,
    isMonochromeFull
} from "./rules.js";


const CAPACITY = 4;


/*
 * ============================================================
 * DIFFICULTÉ
 * ============================================================
 */

const MIN_SOLUTION_MOVES = 7;
const CONSTRUCTIVE_SCRAMBLE_MOVES = 18;
const MAX_CONSTRUCTIVE_SCRAMBLE_ATTEMPTS = 60;
const GENERATION_CANDIDATE_COUNT = 12;
const MAX_CANDIDATE_ATTEMPTS = 400;
const MAX_MECHANIC_SELECTION_ATTEMPTS = 8;
const MAX_DIFFICULTY_CHECK_NODES = 1500;
const MAX_LEVEL_DIFFICULTY_NODES = 6000;


function hasMixedInitialTubes(tubes) {

    return tubes.every(
        tube => {

            if (tube.type === "giant") {
                return true;
            }

            return !isMonochromeFull(tube, CAPACITY);
        }
    );
}


function scoreInitialBoard(tubes) {

    return tubes.reduce(
        (score, tube) => {

            if (
                tube.type === "giant" ||
                tube.layers.length === 0
            ) {
                return score;
            }

            const uniqueColors =
                new Set(tube.layers).size;

            let repeatedNeighbors = 0;

            for (
                let index = 1;
                index < tube.layers.length;
                index++
            ) {
                if (
                    tube.layers[index] ===
                    tube.layers[index - 1]
                ) {
                    repeatedNeighbors++;
                }
            }

            const fullTubeBonus =
                tube.layers.length === CAPACITY
                    ? 6
                    : 0;

            const fourColorBonus =
                tube.layers.length === CAPACITY &&
                uniqueColors === CAPACITY
                    ? 24
                    : 0;

            const monochromePenalty =
                uniqueColors === 1 &&
                tube.layers.length === CAPACITY
                    ? 8
                    : 0;

            return score +
                uniqueColors * 3 +
                fullTubeBonus -
                repeatedNeighbors * 2 +
                fourColorBonus -
                monochromePenalty;
        },
        0
    );
}


const COLORS = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange"
];


/*
 * ============================================================
 * NOMBRE DE COULEURS
 * ============================================================
 */

function getColorCount(
    levelNumber
) {

    if (levelNumber < 7) {
        return 3;
    }

    if (levelNumber < 12) {
        return 4;
    }

    if (levelNumber < 17) {
        return 5;
    }

    return 6;
}


function getAvailableMechanics(levelNumber) {

    return [
        { name: "stone", unlocksAt: 5 },
        { name: "frozen", unlocksAt: 10 },
        { name: "mystery", unlocksAt: 15 },
        { name: "hidden", unlocksAt: 20 },
        { name: "conditional", unlocksAt: 25 },
        { name: "giant", unlocksAt: 30 }
    ].filter(
        mechanic =>
            levelNumber >= mechanic.unlocksAt
    );
}


function chooseMechanics(levelNumber) {

    const available =
        getAvailableMechanics(levelNumber);

    if (available.length === 0) {
        return {};
    }

    const isIntroductionLevel =
        available.some(
            mechanic =>
                mechanic.unlocksAt === levelNumber
        );

    let selectedCount = 1;

    if (!isIntroductionLevel) {
        const selection = Math.random();

        if (selection < 0.5) {
            selectedCount = 1;
        } else if (selection < 0.85) {
            selectedCount = 2;
        } else {
            selectedCount = available.length;
        }
    }

    selectedCount =
        Math.min(selectedCount, available.length);

    const selected = [];

    if (isIntroductionLevel) {
        selected.push(
            available.find(
                mechanic =>
                    mechanic.unlocksAt === levelNumber
            )
        );
    }

    const remaining =
        available.filter(
            mechanic =>
                !selected.includes(mechanic)
        );

    while (selected.length < selectedCount) {
        const index =
            randomInt(0, remaining.length - 1);

        selected.push(
            remaining.splice(index, 1)[0]
        );
    }

    return Object.fromEntries(
        selected.map(
            mechanic =>
                [mechanic.name, true]
        )
    );
}


function getMinimumConstructedMoves(levelNumber) {

    return Math.min(
        13,
        MIN_SOLUTION_MOVES +
            Math.floor(Math.max(0, levelNumber - 1) / 5)
    );
}


function chooseColors(
    levelNumber
) {

    const colorCount =
        getColorCount(
            levelNumber
        );

    return COLORS.slice(
        0,
        colorCount
    );
}


/*
 * ============================================================
 * NOMBRE DE FIOLES
 * ============================================================
 */

function getExtraTubeCount() {

    return 2;
}


/*
 * ============================================================
 * FIOLES SPÉCIALES
 * ============================================================
 */

function shouldUseStone(
    levelNumber
) {

    if (
        levelNumber < 5
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseFrozen(
    levelNumber
) {

    if (
        levelNumber < 10
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseHidden(
    levelNumber
) {

    if (
        levelNumber < 20
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseMystery(
    levelNumber
) {

    if (
        levelNumber < 15
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseConditional(
    levelNumber
) {

    if (
        levelNumber < 25
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseGiant(
    levelNumber
) {

    if (
        levelNumber < 30
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


/*
 * ============================================================
 * COULEURS
 * ============================================================
 */

function createColorLayers(
    colors,
    giantColor = null,
    giantMultiplier = 1
) {

    const layers = [];

    for (
        const color of colors
    ) {

        for (
            let i = 0;
            i < CAPACITY * (
                color === giantColor
                    ? giantMultiplier
                    : 1
            );
            i++
        ) {

            layers.push(
                color
            );
        }
    }

    return layers;
}


function shuffleLayers(
    layers
) {

    for (
        let i = layers.length - 1;
        i > 0;
        i--
    ) {

        const j =
            randomInt(
                0,
                i
            );

        [
            layers[i],
            layers[j]
        ] = [
            layers[j],
            layers[i]
        ];
    }
}


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function randomInt(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (
            max - min + 1
        )
    ) + min;
}


/*
 * ============================================================
 * VALIDATION DES FIOLES SPÉCIALES
 * ============================================================
 */

function hasOneOfEachColor(
    layers,
    colors
) {

    if (
        layers.length !== CAPACITY
    ) {
        return false;
    }

    if (
        colors.length !== CAPACITY
    ) {
        return false;
    }

    const uniqueColors =
        new Set(layers);

    return (
        uniqueColors.size === CAPACITY
    );
}


/*
 * ============================================================
 * BLOCAGE CUMULÉ FROZEN + HIDDEN
 * ============================================================
 *
 * Lorsque frozen et hidden sont présentes simultanément,
 * leurs contenus ne doivent pas, à eux deux, contenir au moins
 * une occurrence de chaque couleur du niveau.
 *
 * Sinon, les deux fioles peuvent se retrouver mutuellement
 * responsables de toutes les couleurs nécessaires à leur
 * libération, créant une boucle de dépendance.
 */

function specialTubesCoverAllColors(
    tubes,
    colors,
    selectedIndexes
) {

    if (
        selectedIndexes.length < 2
    ) {
        return false;
    }

    const specialColors =
        new Set();

    for (
        const index of selectedIndexes
    ) {

        for (
            const color of tubes[index].layers
        ) {

            specialColors.add(
                color
            );
        }
    }

    return colors.every(
        color =>
            specialColors.has(color)
    );
}


/*
 * ============================================================
 * CRÉATION DES FIOLES COLORÉES
 * ============================================================
 */

function createColorTubes(
    layers
) {

    const tubes = [];

    let layerIndex = 0;

    for (
        let tubeIndex = 0;
        tubeIndex < layers.length / CAPACITY;
        tubeIndex++
    ) {

        const tube = {

            type: "normal",

            layers: [],

            mysteryLayers: [],

            targetColor: null
        };

        for (
            let i = 0;
            i < CAPACITY;
            i++
        ) {

            tube.layers.push(
                layers[layerIndex]
            );

            tube.mysteryLayers.push(false);

            layerIndex++;
        }

        tubes.push(
            tube
        );
    }

    return tubes;
}


function addMysteryLayers(tubes) {

    const candidates = [];

    tubes.forEach(
        (tube, tubeIndex) => {
            for (
                let layerIndex = 1;
                layerIndex < tube.layers.length - 1;
                layerIndex++
            ) {
                candidates.push({
                    tubeIndex,
                    layerIndex
                });
            }
        }
    );

    if (
        candidates.length === 0
    ) {
        return false;
    }

    const mysteryCount =
        randomInt(
            1,
            Math.min(2, candidates.length)
        );

    for (
        let count = 0;
        count < mysteryCount;
        count++
    ) {
        const candidateIndex =
            randomInt(0, candidates.length - 1);

        const candidate =
            candidates.splice(candidateIndex, 1)[0];

        tubes[candidate.tubeIndex]
            .mysteryLayers[candidate.layerIndex] = true;
    }

    return true;
}


/*
 * ============================================================
 * FIOLES SPÉCIALES
 * ============================================================
 */

function getSpecialTubeIndexes(
    tubes,
    colors,
    specialTubeCount
) {

    const availableIndexes = [];

    for (
        let index = 0;
        index < tubes.length;
        index++
    ) {

        if (
            !hasOneOfEachColor(
                tubes[index].layers,
                colors
            )
        ) {

            availableIndexes.push(
                index
            );
        }
    }

    if (
        availableIndexes.length <
        specialTubeCount
    ) {

        return null;
    }

    return availableIndexes;
}


function chooseSpecialIndexes(
    availableIndexes,
    useFrozen,
    useHidden
) {

    const selectedIndexes = [];

    const candidates = [
        ...availableIndexes
    ];

    if (
        useFrozen
    ) {

        const randomIndex =
            randomInt(
                0,
                candidates.length - 1
            );

        const frozenIndex =
            candidates[randomIndex];

        selectedIndexes.push({
            type: "frozen",
            index: frozenIndex
        });

        candidates.splice(
            randomIndex,
            1
        );
    }

    if (
        useHidden
    ) {

        const randomIndex =
            randomInt(
                0,
                candidates.length - 1
            );

        const hiddenIndex =
            candidates[randomIndex];

        selectedIndexes.push({
            type: "hidden",
            index: hiddenIndex
        });
    }

    return selectedIndexes;
}


/*
 * ============================================================
 * CRÉATION DES FIOLES
 * ============================================================
 */

function createShuffledTubes(
    colors,
    useStone,
    useFrozen,
    useHidden,
    useConditional,
    useGiant
) {

    const giantColor =
        useGiant
            ? colors[randomInt(0, colors.length - 1)]
            : null;

    const giantMultiplier =
        useGiant
            ? randomInt(2, 3)
            : 1;

    const layers =
        createColorLayers(
            colors,
            giantColor,
            giantMultiplier
        );

    const specialTubeCount =
        (
            useFrozen ? 1 : 0
        ) +
        (
            useHidden ? 1 : 0
        );

    let tubes = null;
    let selectedIndexes = null;

    /*
     * Pour chaque tentative, on cherche simultanément :
     *
     * - suffisamment de fioles admissibles ;
     * - aucune configuration cumulée dangereuse
     *   pour frozen + hidden.
     */

    for (
        let attempt = 0;
        attempt < 50;
        attempt++
    ) {

        const candidateLayers =
            [...layers];

        shuffleLayers(
            candidateLayers
        );

        const candidateTubes =
            createColorTubes(
                candidateLayers
            );

        if (
            specialTubeCount === 0
        ) {

            tubes =
                candidateTubes;

            break;
        }

        const availableIndexes =
            getSpecialTubeIndexes(
                candidateTubes,
                colors,
                specialTubeCount
            );

        if (
            !availableIndexes
        ) {
            continue;
        }

        const candidateSelectedIndexes =
            chooseSpecialIndexes(
                availableIndexes,
                useFrozen,
                useHidden
            );

        const selectedIndexValues =
            candidateSelectedIndexes.map(
                selected =>
                    selected.index
            );

        if (
            specialTubesCoverAllColors(
                candidateTubes,
                colors,
                selectedIndexValues
            )
        ) {
            continue;
        }

        tubes =
            candidateTubes;

        selectedIndexes =
            candidateSelectedIndexes;

        break;
    }

    /*
     * Fallback déterministe.
     */

    if (
        !tubes
    ) {

        const fallbackLayers =
            [...layers];

        tubes =
            createColorTubes(
                fallbackLayers
            );

        const availableIndexes =
            getSpecialTubeIndexes(
                tubes,
                colors,
                specialTubeCount
            );

        if (
            availableIndexes
        ) {

            selectedIndexes =
                chooseSpecialIndexes(
                    availableIndexes,
                    useFrozen,
                    useHidden
                );
        }
    }

    /*
     * ========================================================
     * PLACEMENT FROZEN / HIDDEN
     * ========================================================
     */

    if (
        selectedIndexes
    ) {

        for (
            const selected of selectedIndexes
        ) {

            tubes[
                selected.index
            ].type =
                selected.type;
        }

        /*
         * Une hidden reçoit toujours une couleur cible.
         */

        const hiddenTube =
            selectedIndexes.find(
                selected =>
                    selected.type === "hidden"
            );

        if (
            hiddenTube
        ) {

            const targetColor =
                colors[
                    randomInt(
                        0,
                        colors.length - 1
                    )
                ];

            tubes[
                hiddenTube.index
            ].targetColor =
                targetColor;
        }
    }

    /*
     * ========================================================
     * FIOLES SUPPLÉMENTAIRES
     * ========================================================
     */

    if (
        useStone
    ) {

        tubes.push({

            type: "stone",

            layers: [],

            mysteryLayers: [],

            targetColor: null
        });

    } else {

        tubes.push({

            type: "normal",

            layers: [],

            mysteryLayers: [],

            targetColor: null
        });
    }

    if (useConditional) {

        const availableConditionalIndexes =
            tubes
                .map((tube, index) => ({
                    tube,
                    index
                }))
                .filter(
                    ({ tube }) =>
                        tube.type === "normal" &&
                        tube.layers.length > 0
                )
                .map(
                    ({ index }) =>
                        index
                );

        if (availableConditionalIndexes.length > 0) {

            const conditionalIndex =
                availableConditionalIndexes[
                    randomInt(
                        0,
                        availableConditionalIndexes.length - 1
                    )
                ];

            tubes[conditionalIndex].type =
                "conditional";

            tubes[conditionalIndex].targetColor =
                colors[
                    randomInt(
                        0,
                        colors.length - 1
                    )
                ];
        }
    }

    tubes.push({

        type: "normal",

        layers: [],

        mysteryLayers: [],

        targetColor: null
    });

    if (useGiant) {

        tubes.push({
            type: "giant",
            layers: [],
            mysteryLayers: [],
            capacity: CAPACITY * giantMultiplier,
            targetColor: null
        });
    }

    return tubes;
}


/*
 * ============================================================
 * CRÉATION D'UN NIVEAU CANDIDAT
 * ============================================================
 */

function createCandidateLevel(
    levelNumber
) {

    const colors =
        chooseColors(
            levelNumber
        );

    const useStone =
        shouldUseStone(
            levelNumber
        );

    const useFrozen =
        shouldUseFrozen(
            levelNumber
        );

    const useHidden =
        shouldUseHidden(
            levelNumber
        );

    const useMystery =
        shouldUseMystery(
            levelNumber
        );

    const useConditional =
        shouldUseConditional(
            levelNumber
        );

    const useGiant =
        shouldUseGiant(
            levelNumber
        );

    const tubes =
        createShuffledTubes(
            colors,
            useStone,
            useFrozen,
            useHidden,
            useConditional,
            useGiant
        );

    if (
        useMystery
    ) {
        addMysteryLayers(tubes);
    }

    assertLevelLimits(tubes);

    return {

        capacity:
            CAPACITY,

        tubes
    };
}


function cloneTubes(tubes) {

    return tubes.map(
        tube => ({
            ...tube,
            layers: [...tube.layers],
            mysteryLayers: [...tube.mysteryLayers]
        })
    );
}


function thawConstructedTubes(tubes) {

    let changed = true;

    while (changed) {
        changed = false;

        for (
            let index = 0;
            index < tubes.length;
            index++
        ) {
            const tube = tubes[index];
            let canThaw = false;

            if (tube.type === "frozen") {
                canThaw = tubes.some(
                    (neighbor, neighborIndex) =>
                        neighborIndex !== index &&
                        areSameRowNeighbors(index, neighborIndex) &&
                        canUnlockOtherTubes(neighbor) &&
                        isMonochromeFull(neighbor, CAPACITY)
                );
            } else if (
                tube.type === "hidden" &&
                tube.targetColor
            ) {
                canThaw = tubes.some(
                    (candidate, candidateIndex) =>
                        candidateIndex !== index &&
                        canUnlockOtherTubes(candidate) &&
                        isMonochromeFull(candidate, CAPACITY) &&
                        candidate.layers[0] === tube.targetColor
                );
            }

            if (canThaw) {
                tube.type = "normal";
                changed = true;
            }
        }
    }
}


function replayConstructedSolution(tubes, reverseMoves) {

    const replayTubes =
        cloneTubes(tubes);

    thawConstructedTubes(replayTubes);

    for (
        let moveIndex = reverseMoves.length - 1;
        moveIndex >= 0;
        moveIndex--
    ) {
        const reverseMove = reverseMoves[moveIndex];

        const forwardMove =
            getPossibleMoves(
                replayTubes,
                CAPACITY
            ).find(
                move =>
                    move.sourceIndex === reverseMove.sourceIndex &&
                    move.targetIndex === reverseMove.destinationIndex &&
                    move.amount === reverseMove.amount
            );

        if (!forwardMove) {
            return false;
        }

        const source =
            replayTubes[forwardMove.sourceIndex];
        const target =
            replayTubes[forwardMove.targetIndex];

        for (
            let layer = 0;
            layer < forwardMove.amount;
            layer++
        ) {
            target.layers.push(source.layers.pop());
            target.mysteryLayers.push(source.mysteryLayers.pop());
        }

        const sourceMysteryIndex =
            source.mysteryLayers.length - 1;
        const targetMysteryIndex =
            target.mysteryLayers.length - 1;

        if (sourceMysteryIndex >= 0) {
            source.mysteryLayers[sourceMysteryIndex] = false;
        }
        if (targetMysteryIndex >= 0) {
            target.mysteryLayers[targetMysteryIndex] = false;
        }

        thawConstructedTubes(replayTubes);
    }

    return replayTubes.every(
        tube =>
            tube.type === "giant"
                ? isMonochromeFull(tube, CAPACITY)
                : tube.layers.length === 0 ||
                    isMonochromeFull(tube, CAPACITY)
    );
}


function applyBlockedMechanics(
    tubes,
    reverseMoves,
    colors,
    useFrozen,
    useHidden
) {

    const candidates =
        tubes
            .map((tube, index) => ({ tube, index }))
            .filter(
                ({ tube }) =>
                    tube.type === "normal" &&
                    tube.layers.length > 0 &&
                    !isMonochromeFull(tube, CAPACITY)
            );

    for (
        let attempt = 0;
        attempt < 60;
        attempt++
    ) {
        const available =
            [...candidates];

        shuffleLayers(available);

        if (
            available.length <
            Number(useFrozen) + Number(useHidden)
        ) {
            break;
        }

        const candidateTubes =
            cloneTubes(tubes);

        let nextIndex = 0;

        if (useFrozen) {
            candidateTubes[available[nextIndex].index].type =
                "frozen";
            nextIndex++;
        }

        if (useHidden) {
            const hiddenTube =
                candidateTubes[available[nextIndex].index];

            hiddenTube.type = "hidden";
            hiddenTube.targetColor =
                colors[randomInt(0, colors.length - 1)];
        }

        if (
            replayConstructedSolution(
                candidateTubes,
                reverseMoves
            )
        ) {
            for (
                let index = 0;
                index < tubes.length;
                index++
            ) {
                tubes[index] = candidateTubes[index];
            }
            return true;
        }
    }

    return false;
}


function createConstructiveCandidateLevel(
    levelNumber,
    mechanics
) {

    const useGiant =
        mechanics.giant === true;

    const colors =
        chooseColors(levelNumber);

    const useConditional =
        mechanics.conditional === true;
    const useStone =
        mechanics.stone === true;
    const useFrozen =
        mechanics.frozen === true;
    const useHidden =
        mechanics.hidden === true;
    const useMystery =
        mechanics.mystery === true;

    const giantMultiplier =
        useGiant
            ? randomInt(2, 3)
            : 1;

    const giantColor =
        useGiant
            ? colors[randomInt(0, colors.length - 1)]
            : null;

    let tubes = [];
    let giantTube = null;

    for (const color of colors) {

        if (
            color === giantColor
        ) {
            giantTube = {
                type: "giant",
                layers: Array(
                    CAPACITY * giantMultiplier
                ).fill(color),
                mysteryLayers: Array(
                    CAPACITY * giantMultiplier
                ).fill(false),
                capacity: CAPACITY * giantMultiplier,
                targetColor: null
            };

            continue;
        }

        tubes.push({
            type: "normal",
            layers: Array(CAPACITY).fill(color),
            mysteryLayers: Array(CAPACITY).fill(false),
            targetColor: null
        });
    }

    if (giantTube) {
        tubes.push(giantTube);
    }

    if (useConditional) {

        const conditionalCandidates =
            tubes
                .map((tube, index) => ({
                    tube,
                    index
                }))
                .filter(
                    ({ tube }) =>
                        tube.type === "normal"
                );

        const selected =
            conditionalCandidates[
                randomInt(
                    0,
                    conditionalCandidates.length - 1
                )
            ];

        const color =
            selected.tube.layers[0];

        selected.tube.type = "conditional";
        selected.tube.targetColor = color;
    }

    if (useGiant) {

        for (
            let tubeIndex = 0;
            tubeIndex < 2 * giantMultiplier;
            tubeIndex++
        ) {
            tubes.push({
                type: "normal",
                layers: [],
                mysteryLayers: [],
                targetColor: null
            });
        }

        if (useStone) {
            tubes.push({
                type: "stone",
                layers: [],
                mysteryLayers: [],
                targetColor: null
            });
        }

    } else {

        if (useStone) {

            tubes.push({
                type: "stone",
                layers: [],
                mysteryLayers: [],
                targetColor: null
            });

        } else {

            tubes.push({
                type: "normal",
                layers: [],
                mysteryLayers: [],
                targetColor: null
            });
        }

        tubes.push({
            type: "normal",
            layers: [],
            mysteryLayers: [],
            targetColor: null
        });
    }

    if (giantTube) {

        const giantIndex =
            tubes.indexOf(giantTube);

        tubes.splice(
            giantIndex,
            1
        );

        tubes.splice(
            4,
            0,
            giantTube
        );
    }

    const solvedTubes =
        tubes.map(
            tube => ({
                ...tube,
                layers: [...tube.layers],
                mysteryLayers: [...tube.mysteryLayers]
            })
        );

    let reverseMoves = [];
    let foundMixedStart = false;
    const minimumMoves =
        getMinimumConstructedMoves(levelNumber);

    for (
        let scrambleAttempt = 0;
        scrambleAttempt < MAX_CONSTRUCTIVE_SCRAMBLE_ATTEMPTS;
        scrambleAttempt++
    ) {

        tubes =
            solvedTubes.map(
                tube => ({
                    ...tube,
                    layers: [...tube.layers],
                    mysteryLayers: [...tube.mysteryLayers]
                })
            );

        reverseMoves = [];

        for (
            let attempt = 0;
            attempt < CONSTRUCTIVE_SCRAMBLE_MOVES;
            attempt++
        ) {

        const destinationCandidates = [];

        const giantIndex =
            tubes.findIndex(
                tube =>
                    tube.type === "giant"
            );

        const giant =
            giantIndex >= 0
                ? tubes[giantIndex]
                : null;

        const giantColor =
            giant?.layers[
                giant.layers.length - 1
            ];

        const giantReceivingCapacity =
            giant
                ? tubes.reduce(
                    (available, source) => {

                        if (
                            !canBeSource(source)
                        ) {
                            return available;
                        }

                        return available + Math.max(
                            0,
                            getTubeCapacity(source, CAPACITY) -
                                source.layers.length
                        );
                    },
                    0
                )
                : 0;

        const giantNeedsEmptying =
            giant &&
            giant.layers.length > 0 &&
            giantReceivingCapacity >= giant.layers.length;

        const conditionalIndex =
            tubes.findIndex(
                tube =>
                    tube.type === "conditional"
            );

        const conditionalNeedsOpening =
            conditionalIndex >= 0 &&
            isMonochromeFull(
                tubes[conditionalIndex],
                CAPACITY
            );

        const forcedDestinationIndex =
            giantNeedsEmptying
                ? giantIndex
                : conditionalNeedsOpening
                    ? conditionalIndex
                    : tubes.findIndex(
                        (tube, index) =>
                            index !== giantIndex &&
                            isMonochromeFull(
                                tube,
                                CAPACITY
                            )
                    );

        for (
            let destinationIndex = 0;
            destinationIndex < tubes.length;
            destinationIndex++
        ) {

            if (
                forcedDestinationIndex >= 0 &&
                destinationIndex !== forcedDestinationIndex
            ) {
                continue;
            }

            const destination =
                tubes[destinationIndex];

            if (destination.layers.length === 0) {
                continue;
            }

            const color =
                destination.layers[
                    destination.layers.length - 1
                ];

            if (!canBeDestination(destination, color)) {
                continue;
            }

            let blockSize = 1;

            while (
                blockSize < destination.layers.length &&
                destination.layers[
                    destination.layers.length - 1 - blockSize
                ] === color
            ) {
                blockSize++;
            }

            for (
                let sourceIndex = 0;
                sourceIndex < tubes.length;
                sourceIndex++
            ) {

                if (
                    sourceIndex === destinationIndex
                ) {
                    continue;
                }

                const source =
                    tubes[sourceIndex];

                if (!canBeSource(source)) {
                    continue;
                }

                if (
                    source.layers.length > 0 &&
                    source.layers[
                        source.layers.length - 1
                    ] === color
                ) {
                    continue;
                }

                const sourceCapacity =
                    getTubeCapacity(source, CAPACITY);

                const maxAmount =
                    Math.min(
                        blockSize,
                        sourceCapacity - source.layers.length
                    );

                for (
                    let amount = 1;
                    amount <= maxAmount;
                    amount++
                ) {

                    const remainingDestinationLength =
                        destination.layers.length - amount;

                    if (
                        remainingDestinationLength > 0 &&
                        destination.layers[
                            remainingDestinationLength - 1
                        ] !== color
                    ) {
                        continue;
                    }

                    if (
                        destination.type === "conditional" &&
                        remainingDestinationLength < 1
                    ) {
                        continue;
                    }

                    const sourceAfterReverse = {
                        ...source,
                        layers: [
                            ...source.layers,
                            ...Array(amount).fill(color)
                        ]
                    };

                    if (
                        isMonochromeFull(
                            sourceAfterReverse,
                            CAPACITY
                        )
                    ) {
                        continue;
                    }

                    const previousReverseMove =
                        reverseMoves[
                            reverseMoves.length - 1
                        ];

                    if (
                        previousReverseMove &&
                        previousReverseMove.destinationIndex === sourceIndex &&
                        previousReverseMove.sourceIndex === destinationIndex &&
                        previousReverseMove.color === color &&
                        previousReverseMove.amount === amount
                    ) {
                        continue;
                    }

                    destinationCandidates.push({
                        destinationIndex,
                        sourceIndex,
                        color,
                        amount
                    });
                }
            }
        }

        if (destinationCandidates.length === 0) {
            break;
        }

        const selectableMoves =
            forcedDestinationIndex >= 0
                ? destinationCandidates.filter(
                    candidate =>
                        candidate.amount ===
                        Math.max(
                            ...destinationCandidates.map(
                                candidate =>
                                    candidate.amount
                            )
                        )
                )
                : destinationCandidates;

        const move =
            selectableMoves[
                randomInt(
                    0,
                    selectableMoves.length - 1
                )
            ];

        const destination =
            tubes[move.destinationIndex];

        const source =
            tubes[move.sourceIndex];

        for (
            let layer = 0;
            layer < move.amount;
            layer++
        ) {
            destination.layers.pop();
            destination.mysteryLayers.pop();
            source.layers.push(move.color);
            source.mysteryLayers.push(false);
        }

        reverseMoves.push(move);

        if (
            reverseMoves.length >=
                minimumMoves &&
            hasMixedInitialTubes(tubes)
        ) {
            break;
        }
        }

        if (
            reverseMoves.length >= minimumMoves &&
            hasMixedInitialTubes(tubes)
        ) {
            foundMixedStart = true;
            break;
        }
    }

    if (!foundMixedStart) {
        return null;
    }

    if (useFrozen || useHidden) {
        const blockedMechanicsPlaced =
            applyBlockedMechanics(
                tubes,
                reverseMoves,
                colors,
                useFrozen,
                useHidden
            );

        if (!blockedMechanicsPlaced) {
            return null;
        }
    } else if (!replayConstructedSolution(tubes, reverseMoves)) {
        return null;
    }

    if (useMystery) {
        if (!addMysteryLayers(tubes)) {
            return null;
        }
    }

    assertLevelLimits(tubes);

    return {
        level: {
            capacity: CAPACITY,
            tubes
        },
        solutionMoves: reverseMoves.length
    };
}


function createLevelResult(
    level,
    solutionMoves
) {

    const colors =
        [
            ...new Set(
                level.tubes.flatMap(
                    tube =>
                        tube.layers
                )
            )
        ];

    const hasStone =
        level.tubes.some(
            tube =>
                tube.type === "stone"
        );

    const hasFrozen =
        level.tubes.some(
            tube =>
                tube.type === "frozen"
        );

    const hasHidden =
        level.tubes.some(
            tube =>
                tube.type === "hidden"
        );

    const hasConditional =
        level.tubes.some(
            tube =>
                tube.type === "conditional"
        );

    const hasMystery =
        level.tubes.some(
            tube =>
                tube.mysteryLayers.some(Boolean)
        );

    const hasGiant =
        level.tubes.some(
            tube =>
                tube.type === "giant"
        );

    const difficultyParts = [
        "normal"
    ];

    if (hasStone) {
        difficultyParts.push("pierre");
    }

    if (hasFrozen) {
        difficultyParts.push("gel");
    }

    if (hasHidden) {
        difficultyParts.push("cachée");
    }

    if (hasConditional) {
        difficultyParts.push("source conditionnelle");
    }

    if (hasMystery) {
        difficultyParts.push("mystère");
    }

    if (hasGiant) {
        difficultyParts.push("géante");
    }

    return {
        capacity: level.capacity,
        tubes: level.tubes,
        difficulty: difficultyParts.join(" + "),
        solutionMoves,
        colors
    };
}


/*
 * ============================================================
 * GÉNÉRATION PUBLIQUE
 * ============================================================
 */

export function generateLevel(
    levelNumber = 1
) {

    let remainingDifficultyNodes =
        MAX_LEVEL_DIFFICULTY_NODES;
    let bestFallback = null;

    for (
        let selectionAttempt = 0;
        selectionAttempt < MAX_MECHANIC_SELECTION_ATTEMPTS;
        selectionAttempt++
    ) {
        const mechanics =
            chooseMechanics(levelNumber);

        const candidates = [];
        let candidateAttempts = 0;

        while (
            candidates.length < GENERATION_CANDIDATE_COUNT &&
            candidateAttempts < MAX_CANDIDATE_ATTEMPTS
        ) {
            candidateAttempts++;

            const generated =
                createConstructiveCandidateLevel(
                    levelNumber,
                    mechanics
                );

            if (!generated) {
                continue;
            }

            candidates.push({
                ...generated,
                score: scoreInitialBoard(
                    generated.level.tubes
                )
            });
        }

        if (candidates.length === 0) {
            continue;
        }

        candidates.sort(
            (first, second) =>
                second.score - first.score
        );

        const minimumMoves =
            getMinimumConstructedMoves(levelNumber);

        let selected = null;
        let fallback = null;

        for (const candidate of candidates) {
            if (remainingDifficultyNodes <= 0) {
                fallback ??= candidate;
                break;
            }

            const nodeBudget =
                Math.min(
                    MAX_DIFFICULTY_CHECK_NODES,
                    remainingDifficultyNodes
                );

            const difficultyCheck =
                solveLevel(
                    candidate.level.tubes,
                    candidate.level.capacity,
                    {
                        maxMoves: minimumMoves - 1,
                        returnPath: false,
                        maxNodes: nodeBudget
                    }
                );

            remainingDifficultyNodes -=
                difficultyCheck.nodes;

            if (difficultyCheck.solved) {
                continue;
            }

            if (difficultyCheck.truncated) {
                fallback ??= candidate;
                continue;
            }

            selected = candidate;
            break;
        }

        selected ??= fallback;

        if (!selected) {
            bestFallback ??= candidates[0];
            if (remainingDifficultyNodes > 0) {
                continue;
            }
            break;
        }

        if (
            !bestFallback ||
            selected.score > bestFallback.score
        ) {
            bestFallback = selected;
        }

        if (
            selected === fallback &&
            remainingDifficultyNodes > 0
        ) {
            continue;
        }

        return createLevelResult(
            selected.level,
            selected.solutionMoves
        );
    }

    if (bestFallback) {
        return createLevelResult(
            bestFallback.level,
            bestFallback.solutionMoves
        );
    }

    throw new Error(
        `Impossible de générer un niveau solvable pour le niveau ${levelNumber}.`
    );
}