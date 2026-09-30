import {
    getInstalledGame,
    getInstalledGames,
    removeInstalledGame,
    saveInstalledGame
} from "./storage.js";

const ROOT_URL = new URL("../", import.meta.url);
const META_CACHE = "LPS_GAME_STATE_V1";
const ACTIVE_MARKER_PATH = "__lps_internal__/active/";

async function fetchJson(url, { refresh = false } = {}) {
    const requestUrl = new URL(url);
    if (refresh) {
        requestUrl.searchParams.set("lps_network", "1");
        requestUrl.searchParams.set("v", String(Date.now()));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(requestUrl, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Réponse HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

function cacheName(id, version) {
    return `LPS_GAME_${id}_${version}`;
}

function activeMarkerUrl(id) {
    return new URL(`${ACTIVE_MARKER_PATH}${encodeURIComponent(id)}`, ROOT_URL);
}

function validateGameFiles(game, metadata) {
    if (!/^[a-z0-9_-]+$/i.test(game.id) ||
        metadata.id !== game.id ||
        !/^\d+\.\d+\.\d+$/.test(metadata.version) ||
        !Array.isArray(metadata.files)) {
        throw new Error("Les métadonnées du jeu sont incomplètes ou incohérentes.");
    }
    const files = new Set(["game.json", game.entry.slice(game.path.length), ...metadata.files]);
    for (const file of files) {
        const url = typeof file === "string" ? new URL(file, new URL(game.path, ROOT_URL)) : null;
        if (typeof file !== "string" || !file || file.startsWith("/") || file.includes("\\") ||
            file.split("/").includes("..") || url.origin !== ROOT_URL.origin ||
            !url.pathname.startsWith(new URL(game.path, ROOT_URL).pathname)) {
            throw new Error("Le manifeste contient un chemin de fichier invalide.");
        }
    }
    return [...files];
}

async function readCatalog() {
    const catalog = await fetchJson(new URL("config/games.json", ROOT_URL));
    if (!Array.isArray(catalog.games)) throw new Error("Le registre des jeux est invalide.");
    for (const game of catalog.games) {
        if (!/^[a-z0-9_-]+$/i.test(game.id) || typeof game.path !== "string" ||
            typeof game.entry !== "string" ||
            game.path.startsWith("/") || game.path.includes("\\") ||
            game.path.split("/").includes("..") || !game.path.endsWith("/")) {
            throw new Error("Le registre contient un chemin de jeu invalide.");
        }
        const gameBase = new URL(game.path, ROOT_URL);
        const entry = new URL(game.entry, ROOT_URL);
        const icon = game.icon ? new URL(game.icon, ROOT_URL) : null;
        if (gameBase.origin !== ROOT_URL.origin || !gameBase.pathname.startsWith(ROOT_URL.pathname) ||
            entry.origin !== ROOT_URL.origin || !entry.pathname.startsWith(gameBase.pathname) ||
            (icon && (icon.origin !== ROOT_URL.origin || !icon.pathname.startsWith(ROOT_URL.pathname)))) {
            throw new Error("Les jeux doivent rester dans ce dépôt et sur ce domaine.");
        }
    }
    return catalog.games;
}

export async function getGames() {
    const [games, installed] = await Promise.all([readCatalog(), getInstalledGames()]);
    const installedById = new Map(installed.map(game => [game.id, game]));
    return Promise.all(games.map(async game => {
        const local = installedById.get(game.id) || null;
        const installedLocally = Boolean(local && await isGameInstalled(game.id));
        let remoteVersion = null;
        if (local && navigator.onLine) {
            try {
                const metadata = await fetchJson(new URL(`${game.path}game.json`, ROOT_URL), { refresh: true });
                remoteVersion = metadata.version;
            } catch {
                remoteVersion = null;
            }
        }
        return {
            ...game,
            installed: installedLocally,
            installedVersion: installedLocally ? local.version : null,
            remoteVersion,
            updateAvailable: Boolean(installedLocally && remoteVersion && isNewerVersion(remoteVersion, local.version))
        };
    }));
}

export async function isGameInstalled(gameId) {
    const installed = await getInstalledGame(gameId);
    return Boolean(installed && await caches.has(cacheName(gameId, installed.version)));
}

export async function installGame(gameId) {
    return cacheGameVersion(gameId);
}

export async function updateGame(gameId) {
    return cacheGameVersion(gameId);
}

async function cacheGameVersion(gameId) {
    const games = await readCatalog();
    const game = games.find(item => item.id === gameId);
    if (!game) throw new Error("Ce jeu n'existe plus dans le registre.");

    const metadataUrl = new URL(`${game.path}game.json`, ROOT_URL);
    const metadata = await fetchJson(metadataUrl, { refresh: true });
    const files = validateGameFiles(game, metadata);
    const oldRecord = await getInstalledGame(gameId);
    const newCacheName = cacheName(gameId, metadata.version);
    if (oldRecord?.version === metadata.version && await caches.has(newCacheName)) {
        return metadata.version;
    }
    const gameBase = new URL(game.path, ROOT_URL);
    const requests = files.map(file => new URL(file, gameBase));
    const responses = await Promise.all(requests.map(async url => {
        url.searchParams.set("lps_network", "1");
        url.searchParams.set("v", String(Date.now()));
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok || response.type === "opaque") {
            throw new Error(`Impossible de récupérer ${url.pathname}.`);
        }
        return response;
    }));

    await caches.delete(newCacheName);
    try {
        const cache = await caches.open(newCacheName);
        await Promise.all(requests.map((url, index) => {
            url.search = "";
            return cache.put(url, responses[index]);
        }));
        await saveInstalledGame({
            id: gameId,
            version: metadata.version,
            installedAt: oldRecord?.installedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        const stateCache = await caches.open(META_CACHE);
        await stateCache.put(activeMarkerUrl(gameId), new Response(JSON.stringify({ version: metadata.version }), {
            headers: { "Content-Type": "application/json" }
        }));
    } catch (error) {
        await caches.delete(newCacheName);
        if (oldRecord) await saveInstalledGame(oldRecord);
        else await removeInstalledGame(gameId);
        throw error;
    }

    const oldCacheNames = (await caches.keys()).filter(name =>
        name.startsWith(`LPS_GAME_${gameId}_`) && name !== newCacheName
    );
    await Promise.all(oldCacheNames.map(name => caches.delete(name)));
    return metadata.version;
}

export async function uninstallGame(gameId) {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(`LPS_GAME_${gameId}_`)).map(name => caches.delete(name)));
    const stateCache = await caches.open(META_CACHE);
    await stateCache.delete(activeMarkerUrl(gameId));
    await removeInstalledGame(gameId);
}

export async function launchGame(gameId) {
    const games = await readCatalog();
    const game = games.find(item => item.id === gameId);
    if (!game || !await isGameInstalled(gameId)) throw new Error("Ce jeu n'est pas installé.");
    window.location.assign(new URL(game.entry, ROOT_URL));
}

function isNewerVersion(remote, local) {
    const remoteParts = String(remote).split(".").map(Number);
    const localParts = String(local).split(".").map(Number);
    if ([...remoteParts, ...localParts].some(part => !Number.isInteger(part) || part < 0)) {
        return remote !== local;
    }
    for (let index = 0; index < Math.max(remoteParts.length, localParts.length); index++) {
        const difference = (remoteParts[index] || 0) - (localParts[index] || 0);
        if (difference !== 0) return difference > 0;
    }
    return false;
}