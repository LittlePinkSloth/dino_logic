import { initGameShell } from "../../common/ui/game-shell.js";
import { readStatistics, writeStatistics } from "../../common/storage/statistics.js";

const DATABASE_NAME = "littlePinkSloth.flashCards.v1";
const SETTINGS_KEY = "settings";
const STATISTICS_KEY = "littlePinkSloth.flashCards.stats.v1";
const DEFAULT_LIBRARY_INDEX = new URL("assets/bibliotheques/index.json", import.meta.url);
const MODEL_URL = new URL("assets/bib_model.json", import.meta.url);

const elements = {
    home: document.querySelector("#home-screen"),
    review: document.querySelector("#review-screen"),
    results: document.querySelector("#results-screen"),
    libraryList: document.querySelector("#library-list"),
    libraryCount: document.querySelector("#library-count"),
    domainFilters: document.querySelector("#domain-filters"),
    search: document.querySelector("#library-search"),
    appMessage: document.querySelector("#app-message"),
    start: document.querySelector("#start-session"),
    reviewProgress: document.querySelector("#review-progress"),
    flashCard: document.querySelector("#flash-card"),
    cardSide: document.querySelector("#card-side"),
    cardText: document.querySelector("#card-text"),
    flipHint: document.querySelector("#flip-hint"),
    answerActions: document.querySelector("#answer-actions"),
    settingsDialog: document.querySelector("#settings-dialog"),
    settingsMessage: document.querySelector("#settings-message"),
    folderStatus: document.querySelector("#folder-status"),
    chooseDirectory: document.querySelector("#choose-directory"),
    jsonImport: document.querySelector("#json-import"),
    sessionSize: document.querySelector("#session-size"),
    allCards: document.querySelector("#all-cards"),
    resultKnown: document.querySelector("#result-known"),
    resultTotal: document.querySelector("#result-total"),
    resultPercent: document.querySelector("#result-percent"),
    saveConfirmation: document.querySelector("#save-confirmation"),
    retrySave: document.querySelector("#retry-save")
};

let databasePromise;
let settings = { sessionSize: 15, allCards: false, source: "default", directoryHandle: null };
let libraries = [];
let selectedLibraries = new Set();
let selectedDomains = new Set();
let sortMode = "name";
let sessionCards = [];
let sessionIndex = 0;
let knownAnswers = 0;
let pendingSave = false;
let completedStatistics;

const statistics = readStatistics(
    STATISTICS_KEY,
    () => ({ sessions: 0, reviewed: 0, known: 0 }),
    saved => ({
        sessions: Number.isSafeInteger(saved?.sessions) && saved.sessions >= 0 ? saved.sessions : 0,
        reviewed: Number.isSafeInteger(saved?.reviewed) && saved.reviewed >= 0 ? saved.reviewed : 0,
        known: Number.isSafeInteger(saved?.known) && saved.known >= 0 ? saved.known : 0
    })
);

const gameShell = initGameShell({
    statisticsLabel: "Afficher la progression",
    statisticsTitle: "Progression",
    helpItems: [
        "Choisissez une ou plusieurs bibliothèques, ou sélectionnez des domaines pour composer votre session.",
        "Touchez une carte pour découvrir son verso, puis indiquez si vous la connaissiez.",
        "Les cartes à revoir reviennent plus souvent. Vos réponses sont enregistrées à la fin de la session."
    ],
    getStatistics: () => [
        { label: "Sessions terminées", value: statistics.sessions },
        { label: "Cartes révisées", value: statistics.reviewed },
        { label: "Réussite globale", value: statistics.reviewed ? `${Math.round(statistics.known / statistics.reviewed * 100)} %` : "—" }
    ]
});

function openDatabase() {
    if (!("indexedDB" in window)) return Promise.reject(new Error("Le stockage local du navigateur est indisponible."));
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings");
                if (!database.objectStoreNames.contains("libraries")) database.createObjectStore("libraries");
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Impossible d'ouvrir le stockage local."));
        });
    }
    return databasePromise;
}

async function readStored(storeName, key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Impossible de lire les données locales."));
    });
}

async function writeStored(storeName, key, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        transaction.objectStore(storeName).put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Impossible d'enregistrer les données locales."));
        transaction.onabort = () => reject(transaction.error || new Error("L'enregistrement local a été annulé."));
    });
}

async function readAllStored(storeName) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Impossible de lire les données locales."));
    });
}

function setMessage(element, text, kind = "") {
    element.textContent = text;
    element.classList.toggle("error", kind === "error");
}

function todayString() {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function validLibrary(data) {
    return Boolean(data && typeof data === "object" &&
        typeof data.nom === "string" && data.nom.trim() &&
        Array.isArray(data.domaines) && data.domaines.every(domain => typeof domain === "string") &&
        typeof data.date === "string" && Array.isArray(data.cartesListe) &&
        data.cartesListe.every(card => card && typeof card.recto === "string" && typeof card.verso === "string" &&
            typeof card.date === "string" && Number.isSafeInteger(card.memorisee) && card.memorisee >= 0));
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Réponse HTTP ${response.status} pour ${url.pathname}.`);
    return response.json();
}

async function loadDefaultLibraries() {
    const manifest = await fetchJson(DEFAULT_LIBRARY_INDEX);
    if (!Array.isArray(manifest.files) || !manifest.files.every(file =>
        typeof file === "string" && file.endsWith(".json") && !file.includes("/") && !file.includes("\\")
    )) {
        throw new Error("La liste des bibliothèques intégrées est invalide.");
    }
    const stored = await readAllStored("libraries");
    const overrides = new Map(stored.filter(record => record.key.startsWith("default:")).map(record => [record.key, record]));
    const loaded = [];
    const errors = [];
    for (const filename of manifest.files) {
        const key = `default:${filename}`;
        try {
            const saved = overrides.get(key);
            const data = saved ? saved.data : await fetchJson(new URL(filename, DEFAULT_LIBRARY_INDEX));
            if (!validLibrary(data)) throw new Error("Le format de bibliothèque est invalide.");
            loaded.push({ key, filename, data, fileHandle: null });
        } catch (error) {
            errors.push(`${filename} : ${error.message}`);
        }
    }
    libraries = loaded;
    return errors;
}

async function loadDirectoryLibraries(handle) {
    const loaded = [];
    const errors = [];
    const stored = await readAllStored("libraries");
    const overrides = new Map(stored
        .filter(record => record.key.startsWith("directory:"))
        .map(record => [record.key, record]));
    for await (const [filename, fileHandle] of handle.entries()) {
        if (fileHandle.kind !== "file" || !filename.toLowerCase().endsWith(".json") || filename === "index.json") continue;
        try {
            const file = await fileHandle.getFile();
            const key = `directory:${filename}`;
            const saved = overrides.get(key);
            const data = saved?.savedAt >= file.lastModified
                ? saved.data
                : JSON.parse(await file.text());
            if (!validLibrary(data)) throw new Error("Le format de bibliothèque est invalide.");
            loaded.push({ key, filename, data, fileHandle });
        } catch (error) {
            errors.push(`${filename} : ${error.message}`);
        }
    }
    libraries = loaded;
    return errors;
}

async function loadImportedLibraries() {
    const stored = await readAllStored("libraries");
    libraries = stored
        .filter(record => record.key.startsWith("import:") && validLibrary(record.data))
        .map(record => ({ ...record, fileHandle: null }));
}

async function loadLibraries() {
    let errors = [];
    if (settings.source === "directory" && settings.directoryHandle) {
        try {
            const permission = await settings.directoryHandle.queryPermission({ mode: "readwrite" });
            if (permission === "granted") {
                errors = await loadDirectoryLibraries(settings.directoryHandle);
                updateFolderStatus(`Dossier sélectionné : ${settings.directoryHandle.name}`);
            } else {
                await loadDefaultLibraries();
                updateFolderStatus(`Accès à « ${settings.directoryHandle.name} » à renouveler. Choisissez à nouveau le dossier.`);
                errors.push(`L'accès au dossier « ${settings.directoryHandle.name} » doit être renouvelé ; les bibliothèques intégrées sont affichées en attendant.`);
            }
        } catch (error) {
            await loadDefaultLibraries();
            errors.push(`Impossible de lire le dossier sélectionné : ${error.message}`);
        }
    } else if (settings.source === "imports") {
        await loadImportedLibraries();
        updateFolderStatus("Bibliothèques importées et conservées sur cet appareil.");
    } else {
        errors = await loadDefaultLibraries();
        updateFolderStatus("Bibliothèques intégrées à l'application.");
    }
    renderLibraries();
    if (errors.length) setMessage(elements.appMessage, errors.join(" "), "error");
    else setMessage(elements.appMessage, "");
}

function updateFolderStatus(text) {
    elements.folderStatus.textContent = text;
}

function allDomains() {
    return [...new Set(libraries.flatMap(library => library.data.domaines))].sort((a, b) => a.localeCompare(b, "fr"));
}

function matchingLibraries() {
    const query = elements.search.value.trim().toLocaleLowerCase("fr");
    return libraries.filter(library => !query ||
        library.data.nom.toLocaleLowerCase("fr").includes(query) ||
        library.data.domaines.some(domain => domain.toLocaleLowerCase("fr").includes(query))
    ).sort((a, b) => {
        if (sortMode === "domain") {
            const domainOrder = (a.data.domaines[0] || "").localeCompare(b.data.domaines[0] || "", "fr");
            if (domainOrder) return domainOrder;
        }
        return a.data.nom.localeCompare(b.data.nom, "fr");
    });
}

function renderDomainFilters() {
    elements.domainFilters.replaceChildren();
    for (const domain of allDomains()) {
        const label = document.createElement("label");
        label.className = "domain-filter";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selectedDomains.has(domain);
        input.addEventListener("change", () => {
            if (input.checked) selectedDomains.add(domain);
            else selectedDomains.delete(domain);
            renderSelectionCount();
        });
        const text = document.createElement("span");
        text.textContent = domain;
        label.append(input, text);
        elements.domainFilters.append(label);
    }
}

function renderSelectionCount() {
    const selected = selectedCardEntries().length;
    elements.libraryCount.textContent = `${libraries.length} bibliothèque${libraries.length === 1 ? "" : "s"} · ${selected} carte${selected === 1 ? "" : "s"} sélectionnée${selected === 1 ? "" : "s"}`;
}

function renderLibraries() {
    renderDomainFilters();
    elements.libraryList.replaceChildren();
    const visible = matchingLibraries();
    if (!visible.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = libraries.length ? "Aucune bibliothèque ne correspond à cette recherche." : "Aucune bibliothèque disponible. Importez un fichier JSON ou choisissez un dossier.";
        elements.libraryList.append(empty);
    }
    for (const library of visible) {
        const item = document.createElement("label");
        item.className = "library-item";
        const checkbox = document.createElement("input");
        checkbox.className = "library-check";
        checkbox.type = "checkbox";
        checkbox.checked = selectedLibraries.has(library.key);
        checkbox.setAttribute("aria-label", `Sélectionner ${library.data.nom}`);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedLibraries.add(library.key);
            else selectedLibraries.delete(library.key);
            renderSelectionCount();
        });
        const copy = document.createElement("span");
        const name = document.createElement("span");
        name.className = "library-name";
        name.textContent = library.data.nom;
        const domains = document.createElement("span");
        domains.className = "library-domains";
        domains.textContent = library.data.domaines.join(" · ");
        copy.append(name, domains);
        const count = document.createElement("span");
        count.className = "library-card-count";
        count.textContent = `${library.data.cartesListe.length} carte${library.data.cartesListe.length === 1 ? "" : "s"}`;
        item.append(checkbox, copy, count);
        elements.libraryList.append(item);
    }
    renderSelectionCount();
}

function selectedCardEntries() {
    const entries = [];
    const seen = new Set();
    for (const library of libraries) {
        for (let index = 0; index < library.data.cartesListe.length; index++) {
            const card = library.data.cartesListe[index];
            const included = selectedLibraries.has(library.key) ||
                (selectedDomains.size > 0 && library.data.domaines.some(domain => selectedDomains.has(domain)));
            const cardDomains = card.domaines || library.data.domaines;
            if (included && (!selectedDomains.size || selectedLibraries.has(library.key) ||
                cardDomains.some(domain => selectedDomains.has(domain)))) {
                const identity = `${library.key}:${index}`;
                if (!seen.has(identity)) {
                    seen.add(identity);
                    entries.push({ library, index, card });
                }
            }
        }
    }
    return entries;
}

function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function daysSince(dateText) {
    const timestamp = Date.parse(`${dateText}T00:00:00Z`);
    const today = Date.parse(`${todayString()}T00:00:00Z`);
    if (!Number.isFinite(timestamp)) return 0;
    return Math.max(0, Math.floor((today - timestamp) / 86400000));
}

function pickSessionCards(entries) {
    if (settings.allCards) return shuffle(entries);
    const due = [];
    const notDue = [];
    for (const entry of entries) {
        const memorized = entry.card.memorisee;
        const probability = memorized === 0
            ? 1
            : Math.min(1, Math.max(0, 0.1 * daysSince(entry.card.date) - 0.1 * memorized));
        (Math.random() < probability ? due : notDue).push(entry);
    }
    const requested = Math.min(settings.sessionSize, entries.length);
    return shuffle(due).slice(0, requested).concat(shuffle(notDue).slice(0, Math.max(0, requested - due.length)));
}

function showScreen(screen) {
    for (const [name, element] of [["home", elements.home], ["review", elements.review], ["results", elements.results]]) {
        element.hidden = name !== screen;
    }
    document.querySelector("#settings-open").hidden = screen !== "home";
}

function renderCurrentCard() {
    const current = sessionCards[sessionIndex];
    const isBack = current.showingBack;
    elements.cardSide.textContent = isBack ? "VERSO" : "RECTO";
    elements.cardText.textContent = isBack ? current.card.verso : current.card.recto;
    elements.flipHint.textContent = isBack ? "Touchez pour revoir le recto" : "Touchez la carte pour la retourner";
    elements.answerActions.hidden = !current.hasSeenBack;
    elements.reviewProgress.textContent = `Carte ${sessionIndex + 1} sur ${sessionCards.length}`;
}

function beginSession() {
    const entries = selectedCardEntries();
    if (!entries.length) {
        setMessage(elements.appMessage, "Sélectionnez au moins une bibliothèque ou un domaine avant de commencer.", "error");
        return;
    }
    sessionCards = pickSessionCards(entries).map(entry => ({ ...entry, showingBack: false, hasSeenBack: false }));
    if (!sessionCards.length) {
        setMessage(elements.appMessage, "Aucune carte n'a pu être sélectionnée pour cette session.", "error");
        return;
    }
    sessionIndex = 0;
    knownAnswers = 0;
    elements.appMessage.textContent = "";
    showScreen("review");
    renderCurrentCard();
}

function todayIsRecent() {
    return todayString();
}

async function saveSession() {
    const changedLibraries = [...new Set(sessionCards.map(entry => entry.library))];
    const today = todayIsRecent();
    const writeErrors = [];
    for (const library of changedLibraries) {
        library.data.date = today;
        try {
            await writeStored("libraries", library.key, {
                key: library.key,
                filename: library.filename,
                data: library.data,
                savedAt: Date.now()
            });
        } catch (error) {
            throw new Error(`La sauvegarde locale de « ${library.data.nom} » a échoué : ${error.message}`);
        }
        if (library.fileHandle) {
            try {
                const permission = await library.fileHandle.queryPermission({ mode: "readwrite" });
                if (permission !== "granted") throw new Error("autorisation d'écriture non accordée");
                const writable = await library.fileHandle.createWritable();
                await writable.write(`${JSON.stringify(library.data, null, 2)}\n`);
                await writable.close();
            } catch (error) {
                writeErrors.push(`${library.filename} : ${error.message}`);
            }
        }
    }
    if (completedStatistics) {
        Object.assign(statistics, completedStatistics);
        if (!writeStatistics(STATISTICS_KEY, statistics)) {
            writeErrors.push("les statistiques générales n'ont pas pu être enregistrées");
        }
        gameShell.renderStatistics();
        completedStatistics = null;
    }
    pendingSave = false;
    renderLibraries();
    return writeErrors;
}

async function finishSession() {
    showScreen("results");
    const total = sessionCards.length;
    elements.resultKnown.textContent = String(knownAnswers);
    elements.resultTotal.textContent = String(total);
    elements.resultPercent.textContent = `${Math.round(knownAnswers / total * 100)} %`;
    completedStatistics = {
        sessions: statistics.sessions + 1,
        reviewed: statistics.reviewed + total,
        known: statistics.known + knownAnswers
    };
    pendingSave = true;
    await persistSession();
}

async function persistSession() {
    elements.retrySave.hidden = true;
    setMessage(elements.saveConfirmation, "Enregistrement des cartes…");
    try {
        const warnings = await saveSession();
        if (warnings.length) {
            setMessage(elements.saveConfirmation, `Cartes conservées sur cet appareil. ${warnings.join("; ")}. Vous pouvez aussi exporter vos bibliothèques.`, "error");
        } else {
            setMessage(elements.saveConfirmation, "Cartes et progression enregistrées sur cet appareil.");
        }
    } catch (error) {
        setMessage(elements.saveConfirmation, error.message, "error");
        elements.retrySave.hidden = false;
    }
}

async function loadSettings() {
    const saved = await readStored("settings", SETTINGS_KEY);
    if (!saved) return;
    settings = {
        sessionSize: Number.isSafeInteger(saved.sessionSize) && saved.sessionSize >= 1 && saved.sessionSize <= 500 ? saved.sessionSize : 15,
        allCards: saved.allCards === true,
        source: ["default", "directory", "imports"].includes(saved.source) ? saved.source : "default",
        directoryHandle: saved.directoryHandle || null
    };
}

async function saveSettings() {
    settings.sessionSize = Math.min(500, Math.max(1, Number.parseInt(elements.sessionSize.value, 10) || 15));
    elements.sessionSize.value = String(settings.sessionSize);
    settings.allCards = elements.allCards.checked;
    await writeStored("settings", SETTINGS_KEY, settings);
}

async function chooseDirectory() {
    if (!("showDirectoryPicker" in window)) {
        elements.jsonImport.click();
        setMessage(elements.settingsMessage, "La sélection de dossier n'est pas disponible dans ce navigateur. Choisissez les fichiers JSON à importer.");
        return;
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        settings.directoryHandle = handle;
        settings.source = "directory";
        await saveSettings();
        await loadLibraries();
        elements.settingsDialog.close();
    } catch (error) {
        if (error.name !== "AbortError") setMessage(elements.settingsMessage, `Impossible d'ouvrir ce dossier : ${error.message}`, "error");
    }
}

async function importFiles(files) {
    const errors = [];
    let imported = 0;
    for (const file of files) {
        try {
            const data = JSON.parse(await file.text());
            if (!validLibrary(data)) throw new Error("Le format de bibliothèque est invalide.");
            const key = `import:${file.name}`;
            await writeStored("libraries", key, { key, filename: file.name, data });
            imported++;
        } catch (error) {
            errors.push(`${file.name} : ${error.message}`);
        }
    }
    if (imported) {
        settings.source = "imports";
        settings.directoryHandle = null;
        try {
            await saveSettings();
        } catch (error) {
            setMessage(elements.settingsMessage, `Les fichiers ont été lus, mais la configuration n'a pas pu être enregistrée : ${error.message}`, "error");
            return;
        }
        try {
            await loadLibraries();
        } catch (error) {
            setMessage(elements.settingsMessage, `Les fichiers ont été importés, mais leur chargement a échoué : ${error.message}`, "error");
            return;
        }
        elements.settingsDialog.close();
        elements.jsonImport.value = "";
    }
    if (errors.length) setMessage(imported ? elements.appMessage : elements.settingsMessage, errors.join(" "), "error");
}

function downloadJson(filename, data) {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportLibraries() {
    if (!libraries.length) {
        setMessage(elements.settingsMessage, "Aucune bibliothèque à exporter.", "error");
        return;
    }
    for (const library of libraries) {
        const filename = library.filename || `${library.data.nom.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bibliotheque"}.json`;
        downloadJson(filename, library.data);
    }
    setMessage(elements.settingsMessage, `${libraries.length} bibliothèque${libraries.length === 1 ? "" : "s"} exportée${libraries.length === 1 ? "" : "s"}.`);
}

document.querySelector("#settings-open").addEventListener("click", () => {
    elements.sessionSize.value = String(settings.sessionSize);
    elements.allCards.checked = settings.allCards;
    elements.settingsMessage.textContent = "";
    elements.settingsDialog.showModal();
});
document.querySelector("#start-session").addEventListener("click", beginSession);
document.querySelector("#leave-session").addEventListener("click", () => showScreen("home"));
document.querySelector("#return-home").addEventListener("click", () => showScreen("home"));
document.querySelector("#retry-save").addEventListener("click", () => {
    if (pendingSave) persistSession();
});
document.querySelector("#answer-yes").addEventListener("click", () => answerCurrent(true));
document.querySelector("#answer-no").addEventListener("click", () => answerCurrent(false));
elements.flashCard.addEventListener("click", () => {
    const current = sessionCards[sessionIndex];
    current.showingBack = !current.showingBack;
    if (current.showingBack) current.hasSeenBack = true;
    renderCurrentCard();
});
elements.search.addEventListener("input", renderLibraries);
document.querySelectorAll('input[name="sort"]').forEach(input => {
    input.addEventListener("change", () => {
        sortMode = input.value;
        renderLibraries();
    });
});
document.querySelector("#import-open").addEventListener("click", () => {
    if (!("showDirectoryPicker" in window)) {
        elements.jsonImport.click();
        return;
    }
    elements.jsonImport.click();
});
elements.chooseDirectory.addEventListener("click", chooseDirectory);
elements.jsonImport.addEventListener("change", () => {
    if (elements.jsonImport.files?.length) importFiles([...elements.jsonImport.files]);
});
elements.sessionSize.addEventListener("change", () => {
    saveSettings().catch(error => setMessage(elements.settingsMessage, error.message, "error"));
});
elements.allCards.addEventListener("change", () => {
    saveSettings().catch(error => setMessage(elements.settingsMessage, error.message, "error"));
});
document.querySelector("#reset-directory").addEventListener("click", async () => {
    settings.source = "default";
    settings.directoryHandle = null;
    try {
        await saveSettings();
        await loadLibraries();
        elements.settingsDialog.close();
    } catch (error) {
        setMessage(elements.settingsMessage, `Impossible de changer de source : ${error.message}`, "error");
    }
});
document.querySelector("#export-libraries").addEventListener("click", exportLibraries);

function answerCurrent(known) {
    if (sessionIndex >= sessionCards.length || !sessionCards[sessionIndex].hasSeenBack) return;
    const entry = sessionCards[sessionIndex];
    entry.card.date = todayIsRecent();
    entry.card.memorisee = known ? entry.card.memorisee + 1 : 0;
    if (known) knownAnswers++;
    sessionIndex++;
    if (sessionIndex >= sessionCards.length) {
        finishSession();
        return;
    }
    renderCurrentCard();
}

async function initialize() {
    try {
        await loadSettings();
        elements.chooseDirectory.hidden = !("showDirectoryPicker" in window);
        await loadLibraries();
    } catch (error) {
        setMessage(elements.appMessage, `Impossible de charger Flash Cards : ${error.message}`, "error");
    }
}

initialize();
