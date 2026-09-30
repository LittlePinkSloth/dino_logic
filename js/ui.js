import {
    getGameState,
    expireGameByTime,
    toggleCell,
    toggleMark,
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
    let subtitleElement;
    let difficultyElement;
    let timerElement;
    let heroicModeInput;
    let heroicStreakElement;
    let rushModeInput;
    let rushCompletedElement;
    let heroicRecordElement;
    let rushRecordElement;
    let clearButton;
    let newGameButton;
    let gridSizeElement;
    let bonusLifeButton;
    let bonusDinoButton;
    let bonusMarksButton;
    const DOUBLE_TAP_DELAY = 180;
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
    let rushMode = false;
    let rushCompleted = 0;
    let rushBonusUsed = false;
    let rushFinished = false;
    let rushTransitionPending = false;
    let puzzleStarted = false;
    let lastSolvedState = false;
    let lastGameOverState = false;
    let currentTimeLimit =
        getHeroicTimeLimit("découverte");
    const RUSH_TIME_LIMIT = 15 * 60 * 1000;
    const PROGRESS_STORAGE_KEY = "dinoLogicProgress";
    const progress = loadProgress();
    let lastTrackedPuzzle = null;
    
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

    subtitleElement =
        document.getElementById("subtitle");

    difficultyElement =
        document.getElementById("difficulty");

    timerElement =
        document.getElementById("timer");

    heroicModeInput =
        document.getElementById("heroicMode");

    heroicStreakElement =
        document.getElementById("heroicStreak");

    rushModeInput =
        document.getElementById("rushMode");

    rushCompletedElement =
        document.getElementById("rushCompleted");

    heroicRecordElement =
        document.getElementById("heroicRecord");

    rushRecordElement =
        document.getElementById("rushRecord");
    
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
        !subtitleElement ||
        !difficultyElement ||
        !timerElement ||
        !heroicModeInput ||
        !heroicStreakElement ||
        !rushModeInput ||
        !rushCompletedElement ||
        !heroicRecordElement ||
        !rushRecordElement ||
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
            if (heroicMode) {
                rushModeInput.checked = false;
                rushMode = false;
                document.body.classList.remove("rush-mode");
            }
            document.body.classList.toggle(
                "heroic-mode",
                heroicMode
            );
            render();
        }
    );


    rushModeInput.addEventListener(
        "change",
        () => {
            rushMode = rushModeInput.checked;

            if (rushMode) {
                heroicModeInput.checked = false;
                heroicMode = false;
                rushCompleted = 0;
                rushBonusUsed = false;
                rushFinished = false;
                currentTimeLimit = RUSH_TIME_LIMIT;
            }

            document.body.classList.remove("heroic-mode");
            document.body.classList.toggle("rush-mode", rushMode);
            render();
        }
    );


    bonusLifeButton.addEventListener(
        "click",
        () => {
            useBonus(useBonusLife);
        }
    );

    bonusDinoButton.addEventListener(
        "click",
        () => {
            useBonus(useBonusDino);
        }
    );

    bonusMarksButton.addEventListener(
        "click",
        () => {
            useBonus(useBonusMarks);
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
            rushModeInput.disabled = true;
    
            newGameButton.disabled = true;
    
            gridSizeElement.disabled = true;
    
    
            statusElement.textContent =
                "🦖 Génération d'une nouvelle grille...";
    
            statusElement.className =
                "status";
    
    
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
    
    
            if (rushMode) {
                rushCompleted = 0;
                rushBonusUsed = false;
                rushFinished = false;
                rushTransitionPending = false;
                currentTimeLimit = RUSH_TIME_LIMIT;
                await newPuzzle(getRandomRushSize());
            }
            else if (heroicMode) {
                const nextLevel = heroicStreak + 1;
                const minimumDifficulty =
                    getHeroicMinimumDifficulty(nextLevel);
                let meetsDifficulty = false;

                while (!meetsDifficulty) {
                    const size =
                        Math.floor(Math.random() * 4) + 4;

                    await newPuzzle(size);

                    const puzzle = getGameState().puzzle;
                    const difficulty =
                        puzzle.metadata.difficulty ??
                        getDifficulty(puzzle.metadata.solverNodes);

                    meetsDifficulty =
                        !minimumDifficulty ||
                        isDifficultyAtLeast(
                            difficulty,
                            minimumDifficulty
                        );
                }
            }
            else {
                await newPuzzle(
                    Number(gridSizeElement.value)
                );
            }

            resetTimer();

            if (rushMode) {
                puzzleStarted = true;
            }
    
            render();

            if (rushMode) {
                await new Promise(
                    resolve =>
                        requestAnimationFrame(
                            () => resolve()
                        )
                );

                startTimer();
            }
    
    
            newGameButton.disabled = false;
    
            gridSizeElement.disabled = heroicMode || rushMode;
            newGameButton.disabled = rushMode && !rushFinished;
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
    renderProgress(state);
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

        if (!rushMode) {
            currentTimeLimit =
                getHeroicTimeLimit(difficulty);
        }

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
        rushModeInput.disabled = true;
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
        rushModeInput.disabled = false;
        renderTimer();
    }


    function updateTimer(state) {

        if (
            (state.solved || state.gameOver) &&
            !timerStopped
        ) {
            stopTimer();
        }

        let shouldAdvanceRush = false;

        if (state.solved && !lastSolvedState) {
            launchFireworks();

            if (!heroicMode && !rushMode) {
                progress.classicGridAdvancePending = true;
                saveProgress();
            }
        }

        if (rushMode) {
            if (state.timeExpired && state.gameOver) {
                rushFinished = true;
                rushTransitionPending = false;
                puzzleStarted = false;
                heroicModeInput.disabled = false;
                rushModeInput.disabled = false;
                newGameButton.disabled = false;
            }
            else if (
                !rushFinished &&
                !rushTransitionPending &&
                state.solved &&
                !lastSolvedState
            ) {
                rushCompleted++;
                if (rushCompleted > progress.rushRecord) {
                    progress.rushRecord = rushCompleted;
                    saveProgress();
                }
                rushTransitionPending = true;
                shouldAdvanceRush = true;
            }
            else if (
                !rushFinished &&
                !rushTransitionPending &&
                state.gameOver &&
                !lastGameOverState
            ) {
                rushTransitionPending = true;
                shouldAdvanceRush = true;
            }
        }

        if (heroicMode) {
            if (state.solved && !lastSolvedState) {
                heroicStreak++;
                if (heroicStreak > progress.heroicRecord) {
                    progress.heroicRecord = heroicStreak;
                    saveProgress();
                }
            }
            else if (state.gameOver && !lastGameOverState) {
                lastHeroicStreak = heroicStreak;
                heroicStreak = 0;
            }
        }

        lastSolvedState = state.solved;
        lastGameOverState = state.gameOver;

        renderTimer();

        if (shouldAdvanceRush) {
            advanceRushPuzzle();
        }
    }


    function launchFireworks() {

        if (
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ) {
            return;
        }

        const fireworks = document.createElement("div");
        fireworks.className = "fireworks";
        fireworks.setAttribute("aria-hidden", "true");

        const positions = [
            ["22%", "30%"],
            ["76%", "34%"],
            ["50%", "62%"]
        ];

        for (const [burstIndex, [left, top]] of positions.entries()) {
            const burst = document.createElement("span");
            burst.className = "firework";
            burst.style.left = left;
            burst.style.top = top;
            burst.style.setProperty(
                "--delay",
                `${burstIndex * 120}ms`
            );

            for (let index = 0; index < 14; index++) {
                const particle = document.createElement("i");
                particle.style.setProperty(
                    "--angle",
                    `${180 + index * (360 / 14)}deg`
                );
                particle.style.setProperty(
                    "--distance",
                    `${65 + Math.random() * 75}px`
                );
                burst.appendChild(particle);
            }

            fireworks.appendChild(burst);
        }

        document.body.appendChild(fireworks);
        setTimeout(() => fireworks.remove(), 1800);
    }


    function tickTimer() {

        if (
            (heroicMode || rushMode) &&
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

        const isCountdown = heroicMode || rushMode;
        const totalSeconds = isCountdown
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
            isCountdown ? "Temps restant" : "Temps écoulé"
        );

        timerElement.classList.toggle(
            "urgent",
            isCountdown &&
            timerStartedAt !== null &&
            remaining <= 30 * 1000
        );
    }


    function renderHeroicControls() {

        heroicModeInput.disabled = puzzleStarted;
        rushModeInput.disabled = puzzleStarted;
        gridSizeElement.disabled = heroicMode || rushMode;
        heroicStreakElement.hidden = !heroicMode;
        heroicStreakElement.textContent =
            `Série : ${heroicStreak}`;
        rushCompletedElement.hidden = !rushMode;
        rushCompletedElement.textContent =
            `Complétées : ${rushCompleted}`;
    }


    function renderProgress(state) {

        if (state.puzzle !== lastTrackedPuzzle) {
            lastTrackedPuzzle = state.puzzle;

            if (
                !heroicMode &&
                !rushMode &&
                progress.classicGridAdvancePending
            ) {
                progress.classicGridCount++;
                progress.classicGridAdvancePending = false;
                saveProgress();
            }
        }

        subtitleElement.textContent =
            !heroicMode && !rushMode
                ? `Grille n°${progress.classicGridCount} : trouve l'emplacement de tous les dinos.`
                : "Trouve l'emplacement de tous les dinos.";

        heroicRecordElement.textContent =
            `🏆 Record : ${progress.heroicRecord}`;

        rushRecordElement.textContent =
            `🏆 Record : ${progress.rushRecord}`;
    }


    function loadProgress() {

        const emptyProgress = {
            classicGridCount: 1,
            classicGridAdvancePending: false,
            heroicRecord: 0,
            rushRecord: 0
        };

        try {
            const stored = JSON.parse(
                localStorage.getItem(PROGRESS_STORAGE_KEY) || "{}"
            );

            return {
                classicGridCount: Math.max(
                    1,
                    readProgressCount(stored.classicGridCount)
                ),
                classicGridAdvancePending:
                    stored.classicGridAdvancePending === true,
                heroicRecord: readProgressCount(
                    stored.heroicRecord
                ),
                rushRecord: readProgressCount(
                    stored.rushRecord
                )
            };
        }
        catch {
            return emptyProgress;
        }
    }


    function readProgressCount(value) {

        return Number.isSafeInteger(value) && value >= 0
            ? value
            : 0;
    }


    function saveProgress() {

        try {
            localStorage.setItem(
                PROGRESS_STORAGE_KEY,
                JSON.stringify(progress)
            );
        }
        catch {
            // Storage may be unavailable in private or restricted contexts.
        }
    }


    function getRandomRushSize() {

        return Math.floor(Math.random() * 4) + 4;
    }


    async function advanceRushPuzzle() {

        newGameButton.disabled = true;
        statusElement.textContent =
            "🦖 Génération de la grille suivante...";
        statusElement.className = "status";

        await new Promise(
            resolve =>
                requestAnimationFrame(
                    () => resolve()
                )
        );

        await newPuzzle(getRandomRushSize());

        rushTransitionPending = false;
        render();

        await new Promise(
            resolve =>
                requestAnimationFrame(
                    () => resolve()
                )
        );

        if (rushMode && !rushFinished) {
            timerStopped = false;
            startTimer();
        }

        newGameButton.disabled = rushMode && !rushFinished;
    }


    function useBonus(bonusAction) {

        if (rushMode && rushBonusUsed) {
            return;
        }

        const used = bonusAction();

        if (used && rushMode) {
            rushBonusUsed = true;
        }

        render();
    }


    function getHeroicMinimumDifficulty(level) {

        if (level >= 10 && level % 10 === 0) {
            return "difficile";
        }

        if (level % 10 === 5) {
            return "normal";
        }

        return null;
    }


    function isDifficultyAtLeast(difficulty, minimumDifficulty) {

        const difficultyRank = {
            "découverte": 0,
            facile: 1,
            normal: 2,
            difficile: 3
        };

        return difficultyRank[difficulty] >=
            difficultyRank[minimumDifficulty];
    }


    function isBoardInputAllowed() {

        if (!heroicMode && !rushMode) {
            return true;
        }

        const state = getGameState();

        return !state.gameOver && !state.solved;
    }
    
    function renderBonusButtons(state) {

        bonusLifeButton.disabled =
            heroicMode ||
            (rushMode && rushBonusUsed) ||
            state.gameOver ||
            state.solved ||
            !state.bonusAvailability.life;

        bonusDinoButton.disabled =
            heroicMode ||
            (rushMode && rushBonusUsed) ||
            state.gameOver ||
            state.solved ||
            !state.bonusAvailability.dino;

        bonusMarksButton.disabled =
            heroicMode ||
            (rushMode && rushBonusUsed) ||
            state.gameOver ||
            state.solved ||
            !state.bonusAvailability.marks;
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

        if (clickTimer !== null) {
            clearTimeout(clickTimer);

            if (pendingClickIndex === index) {
                clickTimer = null;
                pendingClickIndex = null;
                toggleCell(index);
                render();
                return;
            }

            toggleMark(pendingClickIndex);
            render();
            clickTimer = null;
            pendingClickIndex = null;
        }

        pendingClickIndex = index;

        clickTimer = setTimeout(
            () => {
                toggleMark(pendingClickIndex);
                render();
                clickTimer = null;
                pendingClickIndex = null;
            },
            DOUBLE_TAP_DELAY
        );
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
            rushMode
                ? state.timeExpired
                    ? `⏱ Temps écoulé ! ${formatRushCompleted(rushCompleted)}.`
                    : "💥 Grille ratée. Passage à la suivante..."
                : heroicMode
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
            rushMode
                ? "🎉 Grille complétée. Préparation de la suivante..."
                : "🎉 Bravo ! Grille résolue !";
    
        statusElement.classList.add(
            "success"
        );
    
        return;
    }


    function formatRushCompleted(count) {

        return `${count} grille${count === 1 ? "" : "s"} complétée${count === 1 ? "" : "s"}`;
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
    
    clearButton.disabled =
        heroicMode &&
        (state.gameOver || state.solved);
    
    
    }
    