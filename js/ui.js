


import {
    getGameState,
    toggleCell,
    toggleMark,
    undo,
    clearBoard,
    newPuzzle,
    isValidCell
} from "./game.js";


/*
 * ============================================================
 * ÉLÉMENTS HTML
 * ============================================================
 */

let boardElement;

let statusElement;

let undoButton;

let clearButton;

let newGameButton;


/*
 * ============================================================
 * INITIALISATION DE L'INTERFACE
 * ============================================================
 */

export function initUI() {

    boardElement =
        document.getElementById("board");

    statusElement =
        document.getElementById("status");

    undoButton =
        document.getElementById("undo");

    clearButton =
        document.getElementById("clear");

    newGameButton =
        document.getElementById("newGame");


    /*
     * Vérification utile pendant le développement.
     */

    if (
        !boardElement ||
        !statusElement ||
        !undoButton ||
        !clearButton ||
        !newGameButton
    ) {

        console.error(
            "Certains éléments HTML sont introuvables."
        );

        return;
    }


    /*
     * Bouton Annuler
     */

    undoButton.addEventListener(
        "click",
        () => {

            undo();

            render();
        }
    );


    /*
     * Bouton Effacer
     */

    clearButton.addEventListener(
        "click",
        () => {

            clearBoard();

            render();
        }
    );

    /*
    * Afficher la nouvelle grille.
    */


    newGameButton.addEventListener(
        "click",
        async () => {
    
            newGameButton.disabled = true;
    
    
            /*
             * Afficher immédiatement le message.
             */
    
            statusElement.textContent =
                "🦖 Génération d'une nouvelle grille...";
    
    
            statusElement.className =
                "status";
    
    
            /*
             * Force le navigateur à afficher
             * le message avant de commencer
             * les calculs.
             */
    
            await new Promise(
                resolve =>
                    requestAnimationFrame(
                        () => resolve()
                    )
            );
    
    
            /*
             * Génération.
             */
    
            await newPuzzle();
    
    
            /*
             * Dès que le puzzle est prêt :
             * affichage immédiat.
             */
    
            render();
    
    
            newGameButton.disabled = false;
        }
    );

    
}


/*
 * ============================================================
 * AFFICHAGE COMPLET
 * ============================================================
 */

export function render() {

    const state =
        getGameState();


    renderBoard(state);

    renderStatus(state);

    renderButtons(state);
}


/*
 * ============================================================
 * AFFICHAGE DE LA GRILLE
 * ============================================================
 */

function renderBoard(state) {

    boardElement.innerHTML = "";


    const {
        size,
        placed,
        puzzle
    } = state;


    const cellCount =
        size * size;


    for (
        let i = 0;
        i < cellCount;
        i++
    ) {

        const cell =
            document.createElement("button");


        /*
         * Type button pour éviter
         * tout comportement de formulaire.
         */

        cell.type = "button";


        /*
         * Classe de base.
         */

        cell.className = "cell";


        /*
         * Classe correspondant à la zone.
         */

        cell.classList.add(
            `zone-${puzzle.zones[i]}`
        );


        /*
         * Accessibilité.
         */

        const row =
            Math.floor(i / size) + 1;

        const column =
            (i % size) + 1;


        cell.setAttribute(
            "aria-label",
            `Ligne ${row}, colonne ${column}`
        );


        /*
        * ============================================================
        * AFFICHAGE DU DINO
        * ============================================================
        */

        if (placed[i]) {

            const dino =
                document.createElement("span");

            dino.className = "dino";

            dino.textContent = "🦖";

            cell.appendChild(dino);
        }


        /*
        * ============================================================
        * AFFICHAGE DE LA CROIX
        * ============================================================
        */

        else if (state.marked[i]) {

            const mark =
                document.createElement("span");

            mark.className = "mark";

            mark.textContent = "✕";

            cell.appendChild(mark);
        }


        /*
         * Affichage d'un conflit.
         */

        if (
            placed[i] &&
            !isValidCell(i)
        ) {

            cell.classList.add(
                "invalid"
            );
        }

        /*
        * ============================================================
        * CLIC SIMPLE / DOUBLE CLIC
        * ============================================================
        */

        let clickTimer = null;


        cell.addEventListener(
            "click",
            () => {

                if (clickTimer !== null) {
                    clearTimeout(clickTimer);
                }


                clickTimer = setTimeout(
                    () => {

                        toggleMark(i);

                        render();

                        clickTimer = null;

                    },
                    250
                );
            }
        );


        cell.addEventListener(
            "dblclick",
            (event) => {

                event.preventDefault();


                if (clickTimer !== null) {

                    clearTimeout(
                        clickTimer
                    );

                    clickTimer = null;
                }


                toggleCell(i);

                render();
            }
        );



        boardElement.appendChild(cell);
    }
}


/*
 * ============================================================
 * MESSAGE D'ÉTAT
 * ============================================================
 */

function renderStatus(state) {

    statusElement.className =
        "status";


    /*
     * Victoire.
     */

    if (state.solved) {

        statusElement.textContent =
            "🎉 Bravo ! Grille résolue !";

        statusElement.classList.add(
            "success"
        );

        return;
    }


    /*
     * Conflit.
     */

    if (!state.valid) {

        statusElement.textContent =
            "⚠️ Il y a un conflit. Les cases rouges indiquent les problèmes.";

        statusElement.classList.add(
            "error"
        );

        return;
    }


    /*
     * Situation normale.
     */

    statusElement.textContent =
        `${state.dinos} / ${state.size} dinos placés`;
}


/*
 * ============================================================
 * ÉTAT DES BOUTONS
 * ============================================================
 */

function renderButtons(state) {

    /*
     * Annuler n'est actif que s'il existe
     * quelque chose à annuler.
     */

    undoButton.disabled =
        !state.canUndo;
}

