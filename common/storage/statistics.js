export function readStatistics(key, createDefault, normalize) {
    try {
        const stored = JSON.parse(localStorage.getItem(key) || "{}");
        return normalize(stored);
    } catch {
        return createDefault();
    }
}

export function writeStatistics(key, statistics) {
    try {
        localStorage.setItem(key, JSON.stringify(statistics));
        return true;
    } catch {
        return false;
    }
}