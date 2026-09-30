const DATABASE_NAME = "little-pink-sloth";
const DATABASE_VERSION = 1;
const STORE_NAME = "installed-games";

let databasePromise;

function openDatabase() {
    if (!("indexedDB" in window)) {
        return Promise.reject(new Error("IndexedDB n'est pas disponible."));
    }
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                    request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("La base locale est bloquée."));
        });
    }
    return databasePromise;
}

export async function getInstalledGames() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getInstalledGame(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function saveInstalledGame(game) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(game);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

export async function removeInstalledGame(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}