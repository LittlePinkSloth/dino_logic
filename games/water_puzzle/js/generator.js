/* generator.js */

import {
    solveLevel,
    DEFAULT_MAX_SOLUTION_MOVES
} from "./solver.js";

import {
    assertLevelLimits
} from "./rules.js";


const CAPACITY = 4;


/*
 * ============================================================
 * DIFFICULTÉ
 * ============================================================
 */

const MIN_SOLUTION_MOVES = 7;

const MAX_SOLUTION_MOVES =
    DEFAULT_MAX_SOLUTION_MOVES;

const MAX_GENERATION_ATTEMPTS = 100;


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

    if (
        levelNumber <= 2
    ) {
        return 3;
    }

    if (
        levelNumber <= 6
    ) {
        return 4;
    }

    if (
        levelNumber <= 10
    ) {
        return 5;
    }

    return 6;
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
        levelNumber < 3
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseFrozen(
    levelNumber
) {

    if (
        levelNumber < 5
    ) {
        return false;
    }

    return Math.random() < 0.5;
}


function shouldUseHidden(
    levelNumber
) {

    if (
        levelNumber < 7
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
    colors
) {

    const layers = [];

    for (
        const color of colors
    ) {

        for (
            let i = 0;
            i < CAPACITY;
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
    layers,
    colors
) {

    const tubes = [];

    let layerIndex = 0;

    for (
        let tubeIndex = 0;
        tubeIndex < colors.length;
        tubeIndex++
    ) {

        const tube = {

            type: "normal",

            layers: [],

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

            layerIndex++;
        }

        tubes.push(
            tube
        );
    }

    return tubes;
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
    useHidden
) {

    const layers =
        createColorLayers(
            colors
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
                candidateLayers,
                colors
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
                fallbackLayers,
                colors
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

            targetColor: null
        });

    } else {

        tubes.push({

            type: "normal",

            layers: [],

            targetColor: null
        });
    }

    tubes.push({

        type: "normal",

        layers: [],

        targetColor: null
    });

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

    const tubes =
        createShuffledTubes(
            colors,
            useStone,
            useFrozen,
            useHidden
        );

    assertLevelLimits(tubes);

    return {

        capacity:
            CAPACITY,

        tubes
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

    for (
        let attempt = 1;
        attempt <= MAX_GENERATION_ATTEMPTS;
        attempt++
    ) {

        const level =
            createCandidateLevel(
                levelNumber
            );

        const solution =
            solveLevel(
                level.tubes,
                level.capacity,
                {
                    maxMoves:
                        MAX_SOLUTION_MOVES,

                    returnPath:
                        false
                }
            );

        if (
            !solution.solved
        ) {
            continue;
        }

        if (
            solution.moves <
            MIN_SOLUTION_MOVES
        ) {

            continue;
        }

        if (
            solution.moves >
            MAX_SOLUTION_MOVES
        ) {

            continue;
        }

        /*
         * ====================================================
         * MÉTADONNÉES
         * ====================================================
         */

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

        const difficultyParts = [
            "normal"
        ];

        if (
            hasStone
        ) {

            difficultyParts.push(
                "pierre"
            );
        }

        if (
            hasFrozen
        ) {

            difficultyParts.push(
                "gel"
            );
        }

        if (
            hasHidden
        ) {

            difficultyParts.push(
                "cachée"
            );
        }

        const difficulty =
            difficultyParts.join(
                " + "
            );

        return {

            capacity:
                level.capacity,

            tubes:
                level.tubes,

            difficulty,

            solutionMoves:
                solution.moves,

            colors
        };
    }

    throw new Error(
        "Impossible de générer un niveau correspondant à la difficulté demandée."
    );
}