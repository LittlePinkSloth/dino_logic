import {
    initializeGame
} from "./game.js";

import {
    initUI,
    render
} from "./ui.js";


/*
 * ============================================================
 * POINT D'ENTRÉE
 * ============================================================
 */

async function main() {

    initUI();

    await initializeGame();

    render();


    /*
     * Enregistrer le service worker.
     */

    if (
        "serviceWorker" in navigator
    ) {

        navigator.serviceWorker.register(
            "./service-worker.js"
        )
        .catch(
            error =>
                console.error(
                    "Service Worker error:",
                    error
                )
        );
    }
}


/*
 * ============================================================
 * LANCEMENT
 * ============================================================
 */

main();

