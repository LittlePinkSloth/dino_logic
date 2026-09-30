
const LAUNCHER_CACHE = "LPS_LAUNCHER_V1";
const GAME_STATE_CACHE = "LPS_GAME_STATE_V1";
const ROOT_URL = new URL(self.registration.scope);
const LAUNCHER_FILES = [
    "./",
    "index.html",
    "manifest.json",
    "launcher/launcher.css",
    "launcher/launcher.js",
    "launcher/game-manager.js",
    "launcher/storage.js",
    "config/games.json",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil((async () => {
        const cache = await caches.open(LAUNCHER_CACHE);
        await cache.addAll(LAUNCHER_FILES.map(path => new URL(path, ROOT_URL)));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names
            .filter(name => name === "dino-logic-v2" ||
                (name.startsWith("LPS_LAUNCHER_") && name !== LAUNCHER_CACHE))
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

async function getActiveGameCache(url) {
    const gamePath = url.pathname.slice(ROOT_URL.pathname.length);
    const match = /^games\/([a-z0-9_-]+)\//i.exec(gamePath);
    if (!match) return null;

    const gameId = match[1];
    const markerUrl = new URL(`__lps_internal__/active/${encodeURIComponent(gameId)}`, ROOT_URL);
    const stateCache = await caches.open(GAME_STATE_CACHE);
    const marker = await stateCache.match(markerUrl);
    if (!marker) return null;
    const state = await marker.json();
    return caches.open(`LPS_GAME_${gameId}_${state.version}`);
}

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== ROOT_URL.origin) return;
    if (!url.pathname.startsWith(ROOT_URL.pathname)) return;

    const appPath = url.pathname.slice(ROOT_URL.pathname.length);
    if (appPath.startsWith("games/")) {
        event.respondWith((async () => {
            if (!url.searchParams.has("lps_network")) {
                const gameCache = await getActiveGameCache(url);
                const cached = gameCache && await gameCache.match(new URL(url.pathname, url.origin));
                if (cached) return cached;
            }
            try {
                return await fetch(request);
            } catch {
                return new Response("Ce jeu n'est pas disponible hors ligne.", {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" }
                });
            }
        })());
        return;
    }

    const shellPath = appPath === "" ? "index.html" : appPath;
    if (LAUNCHER_FILES.includes(`./${shellPath}`) || LAUNCHER_FILES.includes(shellPath) || shellPath === "index.html") {
        event.respondWith((async () => {
            const cache = await caches.open(LAUNCHER_CACHE);
            const cached = await cache.match(request, { ignoreSearch: true });
            if (cached) return cached;
            try {
                return await fetch(request);
            } catch {
                return new Response("Ressource du launcher indisponible hors ligne.", {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" }
                });
            }
        })());
    }
});

