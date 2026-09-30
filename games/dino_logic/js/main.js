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

    await initializeGame(6);

    render();

}


/*
 * ============================================================
 * LANCEMENT
 * ============================================================
 */

main();

