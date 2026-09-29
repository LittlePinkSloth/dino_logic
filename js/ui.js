import {
    getGameState,
    expireGameByTime,
    toggleCell,
    toggleMark,
    undo,
    clearBoard,
    newPuzzle,
    isValidCell,
    useBonusLife,
    useBonusDino,
    useBonusMarks
    } from "./game.js";

import {
    getDifficulty,
    getHeroicTimeLimit
} from "./difficulty.js";
    
    /*
    
    * ============================================================
    * ÉLÉMENTS HTML
    * ============================================================
      */
    
    let boardElement;
    let statusElement;
    let difficultyElement;
    let timerElement;
    let heroicModeInput;
    let heroicStreakElement;
    let undoButton;
    let clearButton;
    let newGameButton;
    let gridSizeElement;
    let bonusLifeButton;
    let bonusDinoButton;
    let bonusMarksButton;
    let clickTimer = null;
    let pendingClickIndex = null;
    let pointerGesture = null;
    let suppressClick = false;
    let timerStartedAt = null;
    let elapsedMilliseconds = 0;
    let timerInterval = null;
    let timerStopped = false;
    let heroicMode = false;
    let heroicStreak = 0;
    let lastHeroicStreak = null;
    let puzzleStarted = false;
    let lastSolvedState = false;
    let lastGameOverState = false;
    let currentTimeLimit =
        getHeroicTimeLimit("découverte");
    
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

    difficultyElement =
        document.getElementById("difficulty");

    timerElement =
        document.getElementById("timer");

    heroicModeInput =
        document.getElementById("heroicMode");

    heroicStreakElement =
        document.getElementById("heroicStreak");
    
    undoButton =
        document.getElementById("undo");
    
    clearButton =
        document.getElementById("clear");
    
    newGameButton =
        document.getElementById("newGame");
    
    gridSizeElement =
        document.getElementById("gridSize");

    bonusLifeButton =
        document.getElementById("bonusLife");

    bonusDinoButton =
        document.getElementById("bonusDino");

    bonusMarksButton =
        document.getElementById("bonusMarks");
    
    
    if (
        !boardElement ||
        !statusElement ||
        !difficultyElement ||
        !timerElement ||
        !heroicModeInput ||
        !heroicStreakElement ||
        !undoButton ||
        !clearButton ||
        !newGameButton ||
        !gridSizeElement ||
        !bonusLifeButton ||
        !bonusDinoButton ||
        !bonusMarksButton
    ) {
    
        console.error(
            "Certains éléments HTML sont introuvables."
        );
    
        return;
    }


    boardElement.addEventListener(
        "click",
        handleCellClick
    );

    boardElement.addEventListener(
        "dblclick",
        handleCellDoubleClick
    );

    boardElement.addEventListener(
        "pointerdown",
        startCellGesture
    );

    document.addEventListener(
        "pointermove",
        continueCellGesture
    );

    document.addEventListener(
        "pointerup",
        finishCellGesture
    );

    document.addEventListener(
        "pointercancel",
        finishCellGesture
    );


    heroicModeInput.addEventListener(
        "change",
        () => {
            heroicMode = heroicModeInput.checked;
            document.body.classList.toggle(
                "heroic-mode",
                heroicMode
            );
            render();
        }
    );


    bonusLifeButton.addEventListener(
        "click",
        () => {
            useBonusLife();
            render();
        }
    );

    bonusDinoButton.addEventListener(
        "click",
        () => {
            useBonusDino();
            render();
        }
    );

    bonusMarksButton.addEventListener(
        "click",
        () => {
            useBonusMarks();
            render();
        }
    );
    
    
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

            const previousState = getGameState();

            if (
                heroicMode &&
                puzzleStarted &&
                !previousState.solved &&
                !previousState.gameOver
            ) {
                heroicStreak = 0;
            }

            stopTimer();
            heroicModeInput.disabled = true;
    
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

            resetTimer();
    
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
    renderDifficulty(state);
    updateTimer(state);
    renderHeroicControls();
    
    renderButtons(state);
    renderBonusButtons(state);
    
    
    }


    function renderDifficulty(state) {

        const { solverNodes } =
            state.puzzle.metadata;

        const difficulty =
            state.puzzle.metadata.difficulty ??
            getDifficulty(solverNodes);

        currentTimeLimit =
            getHeroicTimeLimit(difficulty);

        const label =
            difficulty.charAt(0).toUpperCase() +
            difficulty.slice(1);

        difficultyElement.textContent =
            `Difficulté : ${label}`;
    }


    function startTimer() {

        if (
            timerStartedAt !== null ||
            timerStopped
        ) {
            return;
        }

        timerStartedAt = Date.now();
        puzzleStarted = true;
        heroicModeInput.disabled = true;
        timerInterval = setInterval(tickTimer, 250);
        renderTimer();
    }


    function stopTimer() {

        if (timerStartedAt !== null) {
            elapsedMilliseconds +=
                Date.now() - timerStartedAt;

            timerStartedAt = null;
        }

        clearInterval(timerInterval);
        timerInterval = null;
        timerStopped = true;
        renderTimer();
    }


    function resetTimer() {

        clearInterval(timerInterval);
        timerInterval = null;
        timerStartedAt = null;
        elapsedMilliseconds = 0;
        timerStopped = false;
        puzzleStarted = false;
        lastSolvedState = false;
        lastGameOverState = false;
        lastHeroicStreak = null;
        heroicModeInput.disabled = false;
        renderTimer();
    }


    function updateTimer(state) {

        if (
            (state.solved || state.gameOver) &&
            !timerStopped
        ) {
            stopTimer();
        }

        if (heroicMode) {
            if (state.solved && !lastSolvedState) {
                heroicStreak++;
            }
            else if (state.gameOver && !lastGameOverState) {
                lastHeroicStreak = heroicStreak;
                heroicStreak = 0;
            }
        }

        lastSolvedState = state.solved;
        lastGameOverState = state.gameOver;

        renderTimer();
    }


    function tickTimer() {

        if (
            heroicMode &&
            getElapsedMilliseconds() >= currentTimeLimit
        ) {
            expireGameByTime();
            render();
            return;
        }

        renderTimer();
    }


    function getElapsedMilliseconds() {

        return elapsedMilliseconds +
            (timerStartedAt === null
                ? 0
                : Date.now() - timerStartedAt);
    }


    function renderTimer() {

        const elapsed = getElapsedMilliseconds();
        const remaining = currentTimeLimit - elapsed;

        const totalSeconds = heroicMode
            ? Math.ceil(
                Math.max(0, remaining) / 1000
            )
            : Math.floor(elapsed / 1000);

        const seconds =
            totalSeconds % 60;

        const minutes =
            Math.floor(totalSeconds / 60) % 60;

        const hours =
            Math.floor(totalSeconds / 3600);

        const format = value =>
            String(value).padStart(2, "0");

        timerElement.textContent = hours > 0
            ? `${format(hours)}:${format(minutes)}:${format(seconds)}`
            : `${format(Math.floor(totalSeconds / 60))}:${format(seconds)}`;

        timerElement.setAttribute(
            "aria-label",
            heroicMode ? "Temps restant" : "Temps écoulé"
        );

        timerElement.classList.toggle(
            "urgent",
            heroicMode &&
            timerStartedAt !== null &&
            remaining <= 30 * 1000
        );
    }


    function renderHeroicControls() {

        heroicModeInput.disabled = puzzleStarted;
        heroicStreakElement.hidden = !heroicMode;
        heroicStreakElement.textContent =
            `Série : ${heroicStreak}`;
    }


    function isBoardInputAllowed() {

        if (!heroicMode) {
            return true;
        }

        const state = getGameState();

        return !state.gameOver && !state.solved;
    }
    
    function renderBonusButtons(state) {

        bonusLifeButton.disabled =
            heroicMode || !state.bonusAvailability.life;

        bonusDinoButton.disabled =
            heroicMode || !state.bonusAvailability.dino;

        bonusMarksButton.disabled =
            heroicMode || !state.bonusAvailability.marks;
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

        cell.dataset.index = i;
    
    
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
    
    
        boardElement.appendChild(cell);
    }
    
    
    }


    function handleCellClick(event) {

        const cell = event.target.closest(".cell");

        if (!cell) {
            return;
        }

        if (!isBoardInputAllowed()) {
            return;
        }

        startTimer();

        if (suppressClick) {
            suppressClick = false;
            return;
        }

        const index = Number(cell.dataset.index);

        if (
            clickTimer !== null &&
            pendingClickIndex !== index
        ) {
            clearTimeout(clickTimer);
            toggleMark(pendingClickIndex);
            render();
            clickTimer = null;
            pendingClickIndex = null;
        }

        if (clickTimer !== null) {
            clearTimeout(clickTimer);
        }

        pendingClickIndex = index;

        clickTimer = setTimeout(
            () => {
                toggleMark(pendingClickIndex);
                render();
                clickTimer = null;
                pendingClickIndex = null;
            },
            250
        );
    }


    function handleCellDoubleClick(event) {

        const cell = event.target.closest(".cell");

        if (!cell) {
            return;
        }

        if (!isBoardInputAllowed()) {
            return;
        }

        event.preventDefault();

        if (clickTimer !== null) {
            clearTimeout(clickTimer);
            clickTimer = null;
            pendingClickIndex = null;
        }

        toggleCell(Number(cell.dataset.index));
        render();
    }


    function startCellGesture(event) {

        const cell = event.target.closest(".cell");

        if (
            !cell ||
            !isBoardInputAllowed() ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }

        startTimer();

        const index = Number(cell.dataset.index);
        const state = getGameState();

        pointerGesture = {
            pointerId: event.pointerId,
            startIndex: index,
            lastIndex: index,
            marked: !state.marked[index],
            visited: new Set()
        };
    }


    function continueCellGesture(event) {

        if (
            !pointerGesture ||
            event.pointerId !== pointerGesture.pointerId
        ) {
            return;
        }

        if (!isBoardInputAllowed()) {
            pointerGesture = null;
            return;
        }

        const target = document.elementFromPoint(
            event.clientX,
            event.clientY
        );
        const cell = target?.closest(".cell");

        if (!cell) {
            return;
        }

        const index = Number(cell.dataset.index);

        if (index === pointerGesture.lastIndex) {
            return;
        }

        pointerGesture.lastIndex = index;
        pointerGesture.dragging = true;

        if (clickTimer !== null) {
            clearTimeout(clickTimer);
            clickTimer = null;
            pendingClickIndex = null;
        }

        applyGestureMark(pointerGesture.startIndex);
        applyGestureMark(index);
    }


    function applyGestureMark(index) {

        if (!isBoardInputAllowed()) {
            return;
        }

        if (pointerGesture.visited.has(index)) {
            return;
        }

        pointerGesture.visited.add(index);

        const state = getGameState();

        if (
            !state.placed[index] &&
            state.marked[index] !== pointerGesture.marked
        ) {
            toggleMark(index);
            updateCellMark(index, pointerGesture.marked);
        }
    }


    function updateCellMark(index, marked) {

        const cell = boardElement.children[index];

        if (!cell) {
            return;
        }

        const currentMark = cell.querySelector(".mark");

        if (marked && !currentMark) {
            const mark = document.createElement("span");
            mark.className = "mark";
            mark.textContent = "✕";
            cell.appendChild(mark);
        }
        else if (!marked && currentMark) {
            currentMark.remove();
        }
    }


    function finishCellGesture(event) {

        if (
            !pointerGesture ||
            event.pointerId !== pointerGesture.pointerId
        ) {
            return;
        }

        const wasDragging = pointerGesture.dragging;
        pointerGesture = null;

        if (wasDragging) {
            suppressClick = true;
            render();

            setTimeout(
                () => {
                    suppressClick = false;
                },
                0
            );
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


    function formatHeroicStreak(count) {

        const plural = count === 1 ? "" : "s";

        return `${count} grille${plural} consécutive${plural} résolue${plural}`;
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
            heroicMode
                ? state.timeExpired
                    ? `⏱ Temps écoulé ! Série : ${formatHeroicStreak(lastHeroicStreak ?? heroicStreak)}.`
                    : `💀 Partie terminée : ${formatHeroicStreak(lastHeroicStreak ?? heroicStreak)}.`
                : "💀 Partie terminée !";
    
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
        heroicMode || !state.canUndo;


    clearButton.disabled =
        heroicMode &&
        (state.gameOver || state.solved);
    
    
    }
    