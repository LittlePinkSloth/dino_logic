export const MAX_TUBES = 15;
export const MAX_COLORS = 13;
export const TUBES_PER_ROW = 5;


export function getTubeCapacity(tube, defaultCapacity) {

    return (
        Number.isSafeInteger(tube?.capacity) &&
        tube.capacity > 0
    )
        ? tube.capacity
        : defaultCapacity;
}


export function normalizeMysteryLayers(tube) {

    const layers =
        Array.isArray(tube?.layers)
            ? tube.layers
            : [];

    const mysteryLayers =
        Array.isArray(tube?.mysteryLayers)
            ? tube.mysteryLayers
            : [];

    return layers.map(
        (_, index) =>
            mysteryLayers[index] === true
    );
}


export function isMonochromeFull(tube, capacity) {

    if (
        tube?.isBonus === true
    ) {
        return false;
    }

    const layers = tube?.layers;
    const tubeCapacity =
        getTubeCapacity(tube, capacity);

    return (
        Array.isArray(layers) &&
        layers.length === tubeCapacity &&
        layers.length > 0 &&
        layers.every(
            color => color === layers[0]
        )
    );
}


export function isTubeClosed(tube, capacity) {

    return isMonochromeFull(
        tube,
        capacity
    );
}


export function canBeSource(tube) {

    return (
        tube?.type === "normal" ||
        tube?.type === "conditional"
    );
}


export function canBeDestination(tube, color) {

    if (
        tube?.type === "frozen" ||
        tube?.type === "hidden"
    ) {
        return false;
    }

    return (
        tube?.type !== "conditional" ||
        tube.targetColor === color
    );
}


export function canUnlockOtherTubes(tube) {

    return (
        tube?.type === "normal" ||
        tube?.type === "conditional" ||
        tube?.type === "giant"
    );
}


export function canMixTube(tube, capacity) {

    return (
        Array.isArray(tube?.layers) &&
        tube.layers.length > 1 &&
        !["stone", "frozen", "hidden"].includes(tube.type) &&
        !isTubeClosed(tube, capacity)
    );
}


export function areSameRowNeighbors(firstIndex, secondIndex) {

    return (
        Math.abs(firstIndex - secondIndex) === 1 &&
        Math.floor(firstIndex / TUBES_PER_ROW) ===
            Math.floor(secondIndex / TUBES_PER_ROW)
    );
}


export function assertLevelLimits(tubes) {

    if (
        !Array.isArray(tubes) ||
        tubes.length > MAX_TUBES
    ) {
        throw new RangeError(
            `Un niveau ne peut pas dépasser ${MAX_TUBES} fioles.`
        );
    }

    const colors = new Set(
        tubes.flatMap(
            tube =>
                Array.isArray(tube?.layers)
                    ? tube.layers
                    : []
        )
    );

    if (
        colors.size > MAX_COLORS
    ) {
        throw new RangeError(
            `Un niveau ne peut pas dépasser ${MAX_COLORS} couleurs.`
        );
    }
}