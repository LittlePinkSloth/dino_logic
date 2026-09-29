
const CACHE_NAME = "dino-logic-v2";


const FILES_TO_CACHE = [

    "./",

    "./index.html",

    "./manifest.json",

    "./css/style.css",

    "./js/main.js",
    "./js/game.js",
    "./js/generator.js",
    "./js/difficulty.js",
    "./js/solver.js",
    "./js/ui.js",

    "./icons/icon-192.png",
    "./icons/icon-512.png"

];


/*
 * ============================================================
 * INSTALLATION
 * ============================================================
 */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(
                CACHE_NAME
            )
            .then(
                cache =>
                    cache.addAll(
                        FILES_TO_CACHE
                    )
            )

        );


        /*
         * Active immédiatement
         * le nouveau service worker.
         */

        self.skipWaiting();
    }
);


/*
 * ============================================================
 * ACTIVATION
 * ============================================================
 */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(
                    keys =>
                        Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )

                        )
                )

        );


        self.clients.claim();
    }
);


/*
 * ============================================================
 * REQUÊTES
 * ============================================================
 */

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            caches.match(
                event.request
            )
            .then(
                cachedResponse => {

                    /*
                     * Si le fichier est déjà en cache,
                     * on l'utilise.
                     */

                    if (
                        cachedResponse
                    ) {

                        return cachedResponse;
                    }


                    /*
                     * Sinon on essaie le réseau.
                     */

                    return fetch(
                        event.request
                    );

                }
            )

        );
    }
);

