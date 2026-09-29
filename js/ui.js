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
    let gridSizeElement;
    
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
    
    gridSizeElement =
        document.getElementById("gridSize");
    
    
    if (
        !boardElement ||
        !statusElement ||
        !undoButton ||
        !clearButton ||
        !newGameButton ||
        !gridSizeElement
    ) {
    
        console.error(
            "Certains éléments HTML sont introuvables."
        );
    
        return;
    }
    
    
    /*
     * ========================================================
     * ANNULER
     * ========================================================
     */
    
    undoButton.addEventListener(
        "click",
        () => {
    
            undo();
    
            render();
        }
    );
    
    
    /*
     * ========================================================
     * EFFACER
     * ========================================================
     */
    
    clearButton.addEventListener(
        "click",
        () => {
    
            clearBoard();
    
            render();
        }
    );
    
    
    /*
     * ========================================================
     * NOUVELLE GRILLE
     * ========================================================
     */
    
    newGameButton.addEventListener(
        "click",
        async () => {
    
            newGameButton.disabled = true;
    
            gridSizeElement.disabled = true;
    
    
            statusElement.textContent =
                "🦖 Génération d'une nouvelle grille...";
    
            statusElement.className =
                "status";
    
    
            /*
             * Lire la taille sélectionnée.
             *
             * La valeur d'un <select> est toujours
             * une chaîne de caractères.
             *
             * On la convertit donc en nombre.
             */
    
            const size =
                Number(
                    gridSizeElement.value
                );
    
    
            /*
             * Laisser le navigateur afficher
             * le message avant de lancer
             * la génération.
             */
    
            await new Promise(
                resolve =>
                    requestAnimationFrame(
                        () => resolve()
                    )
            );
    
    
            await newPuzzle(size);
    
            render();
    
    
            newGameButton.disabled = false;
    
            gridSizeElement.disabled = false;
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
        marked,
        incorrect,
        puzzle
    } = state;
    
    
    /*
     * Adapter dynamiquement le nombre
     * de lignes et de colonnes.
     */
    
    boardElement.style.gridTemplateColumns =
        `repeat(${size}, 1fr)`;
    
    boardElement.style.gridTemplateRows =
        `repeat(${size}, 1fr)`;
    
    
    const cellCount =
        size * size;
    
    
    for (
        let i = 0;
        i < cellCount;
        i++
    ) {
    
        const cell =
            document.createElement("button");
    
    
        cell.type = "button";
    
        cell.className = "cell";
    
    
        cell.classList.add(
            `zone-${puzzle.zones[i]}`
        );
    
    
        const row =
            Math.floor(i / size) + 1;
    
        const column =
            (i % size) + 1;
    
    
        cell.setAttribute(
            "aria-label",
            `Ligne ${row}, colonne ${column}`
        );
    
    
        if (placed[i]) {
    
            const dino =
                document.createElement("span");
    
    
            dino.className =
                "dino";
    
    
            dino.textContent =
                "🦖";
    
    
            /*
             * Un dino placé au mauvais endroit
             * est visuellement signalé.
             */
    
            if (
                incorrect[i]
            ) {
    
                dino.classList.add(
                    "incorrect"
                );
    
                cell.classList.add(
                    "incorrect-cell"
                );
            }
    
    
            cell.appendChild(dino);
        }
        else if (marked[i]) {
    
            const mark =
                document.createElement("span");
    
    
            mark.className =
                "mark";
    
    
            mark.textContent =
                "✕";
    
    
            cell.appendChild(mark);
        }
    
    
        /*
         * Signaler les conflits avec
         * les règles du puzzle.
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
         * Gestion simple clic / double clic.
         */
    
        let clickTimer = null;
    
    
        cell.addEventListener(
            "click",
            () => {
    
                if (
                    clickTimer !== null
                ) {
    
                    clearTimeout(
                        clickTimer
                    );
                }
    
    
                clickTimer =
                    setTimeout(
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
    
    
                if (
                    clickTimer !== null
                ) {
    
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
    * AFFICHAGE DES VIES
    * ============================================================
      */
    
    function renderLives(state) {
    
    
    const livesDisplay =
        "❤️".repeat(state.lives) +
        "🖤".repeat(
            3 - state.lives
        );
    
    
    return livesDisplay;
    
    
    }
    
    /*
    
    * ============================================================
    * MESSAGE D'ÉTAT
    * ============================================================
      */
    
    function renderStatus(state) {
    
    
    statusElement.className =
        "status";
    
    
    if (
        state.gameOver
    ) {
    
        statusElement.textContent =
            "💀 Partie terminée !";
    
        statusElement.classList.add(
            "error"
        );
    
        return;
    }
    
    
    if (
        state.solved
    ) {
    
        statusElement.textContent =
            "🎉 Bravo ! Grille résolue !";
    
        statusElement.classList.add(
            "success"
        );
    
        return;
    }
    
    
    if (
        state.incorrect.some(
            Boolean
        )
    ) {
    
        statusElement.textContent =
            `⚠️ Un ou plusieurs dinos sont mal placés. ${renderLives(state)}`;
    
        statusElement.classList.add(
            "error"
        );
    
        return;
    }
    
    
    if (
        !state.valid
    ) {
    
        statusElement.textContent =
            `⚠️ Il y a un conflit. ${renderLives(state)}`;
    
        statusElement.classList.add(
            "error"
        );
    
        return;
    }
    
    
    statusElement.textContent =
        `${state.dinos} / ${state.size} dinos placés • ${renderLives(state)}`;
    
    
    }
    
    /*
    
    * ============================================================
    * ÉTAT DES BOUTONS
    * ============================================================
      */
    
    function renderButtons(state) {
    
    
    undoButton.disabled =
        !state.canUndo;
    
    
    }
    