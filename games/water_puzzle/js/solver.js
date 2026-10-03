/* solver.js */
import {
    areSameRowNeighbors,
    isMonochromeFull,
    isTubeClosed
} from "./rules.js";

const DEFAULT_CAPACITY = 4;


/*
 * Limite utilisée par défaut.
 */
export const DEFAULT_MAX_SOLUTION_MOVES = 20;


/*
 * ============================================================
 * NORMALISATION
 * ============================================================
 */

function normalizeTube(tube) {

    if (Array.isArray(tube)) {

        return {
            type: "normal",
            layers: [...tube],
            targetColor: null
        };
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

            targetColor:
                tube.targetColor ??
                null,

            layers:
                Array.isArray(tube.layers)
                    ? [...tube.layers]
                    : []
        };
    }

    return {
        type: "normal",
        layers: [],
        targetColor: null
    };
}


function normalizeTubes(tubes) {

    return tubes.map(
        tube =>
            normalizeTube(tube)
    );
}


/*
 * ============================================================
 * SÉRIALISATION
 * ============================================================
 *
 * targetColor fait partie de l'état logique.
 *
 * Deux plateaux identiques visuellement mais possédant
 * des couleurs cibles hidden différentes sont donc bien
 * considérés comme deux états différents.
 */

function serializeState(tubes) {

    return tubes
        .map(
            tube =>
                [
                    tube.type,
                    tube.targetColor ?? "",
                    tube.layers.join(",")
                ].join(":")
        )
        .join("|");
}


/*
 * ============================================================
 * ÉTAT FINAL
 * ============================================================
 */

function isTubeSolved(
    tube,
    capacity
) {

    const layers =
        tube.layers;

    if (
        layers.length === 0
    ) {
        return true;
    }

    return isTubeClosed(
        tube,
        capacity
    );
}


function isSolved(
    tubes,
    capacity
) {

    return tubes.every(
        tube =>
            isTubeSolved(
                tube,
                capacity
            )
    );
}


/*
 * ============================================================
 * CLONAGE
 * ============================================================
 */

function cloneTubes(tubes) {

    return tubes.map(
        tube => ({
            ...tube,

            layers:
                [...tube.layers]
        })
    );
}


/*
 * ============================================================
 * DÉBLOCAGE
 * ============================================================
 */

function isTubeMonochromeFull(
    tube,
    capacity
) {

    return isMonochromeFull(
        tube,
        capacity
    );
}


/*
 * Une fiole peut servir de référence pour débloquer hidden
 * uniquement si elle est déjà accessible.
 *
 * Une fiole frozen ou hidden encore bloquée ne peut donc
 * jamais servir de "tube monochrome cible".
 */

function hasFullTubeOfColor(
    tubes,
    color,
    capacity,
    excludedIndex = -1
) {

    for (
        let index = 0;
        index < tubes.length;
        index++
    ) {

        if (
            index === excludedIndex
        ) {
            continue;
        }

        const tube =
            tubes[index];

        if (
            tube.type !== "normal"
        ) {
            continue;
        }

        if (
            isTubeMonochromeFull(
                tube,
                capacity
            ) &&
            tube.layers[0] === color
        ) {

            return true;
        }
    }

    return false;
}


function hasMonochromeFullNeighbor(
    tubes,
    index,
    capacity
) {

    return tubes.some(
        (candidate, candidateIndex) =>
            candidate.type === "normal" &&
            areSameRowNeighbors(index, candidateIndex) &&
            isTubeMonochromeFull(
                candidate,
                capacity
            )
    );
}


function canUnblockTube(
    tubes,
    index,
    capacity
) {

    const tube =
        tubes[index];

    if (
        !tube
    ) {
        return false;
    }

    if (
        tube.type === "frozen"
    ) {

        return hasMonochromeFullNeighbor(
            tubes,
            index,
            capacity
        );
    }

    if (
        tube.type === "hidden"
    ) {

        if (
            !tube.targetColor
        ) {
            return false;
        }

        return hasFullTubeOfColor(
            tubes,
            tube.targetColor,
            capacity,
            index
        );
    }

    return false;
}


/*
 * Débloque toutes les fioles actuellement éligibles.
 *
 * La boucle est volontaire :
 *
 * hidden peut se débloquer grâce à un tube normal,
 * puis devenir lui-même un tube normal plein et permettre
 * immédiatement le déblocage d'un frozen voisin.
 */

function thawAvailableTubes(
    tubes,
    capacity
) {

    let changed = true;

    while (
        changed
    ) {

        changed = false;

        for (
            let index = 0;
            index < tubes.length;
            index++
        ) {

            const tube =
                tubes[index];

            if (
                tube.type !== "frozen" &&
                tube.type !== "hidden"
            ) {
                continue;
            }

            if (
                canUnblockTube(
                    tubes,
                    index,
                    capacity
                )
            ) {

                tube.type =
                    "normal";

                changed = true;
            }
        }
    }

    return tubes;
}


/*
 * Le changement de règle de hidden n'est plus local :
 *
 * - frozen dépend de ses voisins ;
 * - hidden dépend d'un tube cible situé n'importe où.
 *
 * On vérifie donc les deux conditions après chaque coup.
 * Le nombre de fioles reste suffisamment faible pour que
 * ce scan soit préférable à une logique locale plus complexe.
 */

function thawAfterMove(
    tubes,
    capacity
) {

    return thawAvailableTubes(
        tubes,
        capacity
    );
}


/*
 * ============================================================
 * COUPS POSSIBLES
 * ============================================================
 */

export function getPossibleMoves(
    tubes,
    capacity = DEFAULT_CAPACITY
) {

    const moves = [];

    for (
        let sourceIndex = 0;
        sourceIndex < tubes.length;
        sourceIndex++
    ) {

        const source =
            tubes[sourceIndex];

        if (
            source.layers.length === 0 ||
            source.type === "stone" ||
            source.type === "frozen" ||
            source.type === "hidden" ||
            isTubeClosed(source, capacity)
        ) {
            continue;
        }

        const sourceLayers =
            source.layers;

        const sourceColor =
            sourceLayers[
                sourceLayers.length - 1
            ];

        let blockSize = 1;

        while (
            blockSize < sourceLayers.length &&
            sourceLayers[
                sourceLayers.length - 1 - blockSize
            ] === sourceColor
        ) {

            blockSize++;
        }

        for (
            let targetIndex = 0;
            targetIndex < tubes.length;
            targetIndex++
        ) {

            if (
                sourceIndex === targetIndex
            ) {
                continue;
            }

            const target =
                tubes[targetIndex];

            if (
                target.type === "frozen" ||
                target.type === "hidden" ||
                isTubeClosed(target, capacity) ||
                target.layers.length >= capacity
            ) {
                continue;
            }

            if (
                target.layers.length > 0 &&
                target.layers[
                    target.layers.length - 1
                ] !== sourceColor
            ) {

                continue;
            }

            moves.push({

                sourceIndex,

                targetIndex,

                amount:
                    Math.min(
                        blockSize,
                        capacity -
                            target.layers.length
                    )
            });
        }
    }

    return moves;
}


/*
 * ============================================================
 * APPLICATION D'UN COUP
 * ============================================================
 */

function applyMove(
    tubes,
    move,
    capacity
) {

    const nextTubes =
        cloneTubes(tubes);

    const source =
        nextTubes[
            move.sourceIndex
        ];

    const target =
        nextTubes[
            move.targetIndex
        ];

    for (
        let i = 0;
        i < move.amount;
        i++
    ) {

        target.layers.push(
            source.layers.pop()
        );
    }

    thawAfterMove(
        nextTubes,
        capacity
    );

    return nextTubes;
}


/*
 * ============================================================
 * RECONSTRUCTION DU CHEMIN
 * ============================================================
 */

function reconstructPath(
    goalKey,
    parents,
    moves
) {

    const path = [];

    let currentKey =
        goalKey;

    while (
        parents.has(currentKey)
    ) {

        path.push(
            moves.get(currentKey)
        );

        currentKey =
            parents.get(currentKey);
    }

    path.reverse();

    return path;
}


/*
 * ============================================================
 * SOLVEUR BFS
 * ============================================================
 */

export function solveLevel(
    initialTubes,
    capacity = DEFAULT_CAPACITY,
    {
        maxMoves = DEFAULT_MAX_SOLUTION_MOVES,
        returnPath = true
    } = {}
) {

    const startState =
        thawAvailableTubes(
            normalizeTubes(
                initialTubes
            ),
            capacity
        );

    if (
        isSolved(
            startState,
            capacity
        )
    ) {

        return {

            solved: true,

            moves: 0,

            path: [],

            nodes: 1
        };
    }

    const startKey =
        serializeState(
            startState
        );

    const queue = [

        {
            key:
                startKey,

            tubes:
                startState,

            depth: 0
        }
    ];

    const visited =
        new Set([
            startKey
        ]);

    const parents =
        returnPath
            ? new Map()
            : null;

    const moves =
        returnPath
            ? new Map()
            : null;

    let queueIndex = 0;

    while (
        queueIndex < queue.length
    ) {

        const current =
            queue[queueIndex];

        queueIndex++;

        if (
            current.depth >= maxMoves
        ) {
            continue;
        }

        const possibleMoves =
            getPossibleMoves(
                current.tubes,
                capacity
            );

        for (
            const move of possibleMoves
        ) {

            const nextDepth =
                current.depth + 1;

            const nextTubes =
                applyMove(
                    current.tubes,
                    move,
                    capacity
                );

            const stateKey =
                serializeState(
                    nextTubes
                );

            if (
                visited.has(stateKey)
            ) {
                continue;
            }

            visited.add(
                stateKey
            );

            if (
                returnPath
            ) {

                parents.set(
                    stateKey,
                    current.key
                );

                moves.set(
                    stateKey,
                    {
                        sourceIndex:
                            move.sourceIndex,

                        targetIndex:
                            move.targetIndex
                    }
                );
            }

            if (
                isSolved(
                    nextTubes,
                    capacity
                )
            ) {

                return {

                    solved: true,

                    moves:
                        nextDepth,

                    path:
                        returnPath
                            ? reconstructPath(
                                stateKey,
                                parents,
                                moves
                            )
                            : [],

                    nodes:
                        visited.size
                };
            }

            queue.push({

                key:
                    stateKey,

                tubes:
                    nextTubes,

                depth:
                    nextDepth
            });
        }
    }

    return {

        solved: false,

        moves: null,

        path: [],

        nodes:
            visited.size
    };
}