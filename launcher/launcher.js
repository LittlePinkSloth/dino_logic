import {
    getGames,
    installGame,
    launchGame,
    updateGame
} from "./game-manager.js";

const ROOT_URL = new URL("../", import.meta.url);
const gamesList = document.querySelector("#games-list");
const message = document.querySelector("#launcher-message");
const connectionState = document.querySelector("#connection-state");

function createGameCard(game, index) {
    const card = document.createElement("article");
    card.className = "game-card";
    card.style.animationDelay = `${index * 45}ms`;

    const icon = document.createElement("div");
    icon.className = "game-icon";
    icon.setAttribute("aria-hidden", "true");
    if (game.icon) {
        const image = document.createElement("img");
        image.src = new URL(game.icon, ROOT_URL);
        image.alt = "";
        icon.append(image);
    } else {
        icon.textContent = "🎮";
    }

    const copy = document.createElement("div");
    copy.className = "game-copy";
    const title = document.createElement("h3");
    title.textContent = game.name;
    const description = document.createElement("p");
    description.textContent = game.description;
    const state = document.createElement("span");
    state.className = "game-state";
    state.textContent = game.installed
        ? `Installé · ${game.installedVersion}`
        : "À installer";
    copy.append(title, description, state);

    const actions = document.createElement("div");
    actions.className = "game-action-wrap";
    const action = document.createElement("button");
    action.className = "game-action";
    action.type = "button";
    action.textContent = game.installed ? "Jouer" : "Installer et jouer";
    action.addEventListener("click", async () => {
        action.disabled = true;
        message.textContent = "";
        try {
            if (game.installed) await launchGame(game.id);
            else {
                action.textContent = "Installation…";
                await installGame(game.id);
                await launchGame(game.id);
            }
        } catch (error) {
            message.textContent = game.installed
                ? error.message
                : "Ce jeu nécessite une connexion Internet pour être installé.";
            action.disabled = false;
            action.textContent = game.installed ? "Jouer" : "Installer et jouer";
        }
    });
    actions.append(action);

    if (game.updateAvailable) {
        const update = document.createElement("button");
        update.className = "update-action";
        update.type = "button";
        update.textContent = `Mettre à jour · ${game.remoteVersion}`;
        update.addEventListener("click", async () => {
            update.disabled = true;
            update.textContent = "Mise à jour…";
            message.textContent = "";
            try {
                await updateGame(game.id);
                await renderGames();
            } catch {
                message.textContent = "La mise à jour n'a pas abouti. La version installée reste disponible.";
                update.disabled = false;
                update.textContent = `Mettre à jour · ${game.remoteVersion}`;
            }
        });
        actions.append(update);
    }

    card.append(icon, copy, actions);
    return card;
}

async function renderGames() {
    gamesList.replaceChildren();
    try {
        const games = await getGames();
        games.forEach((game, index) => gamesList.append(createGameCard(game, index)));
        if (games.length === 0) message.textContent = "Aucun jeu n'est encore disponible.";
        connectionState.textContent = navigator.onLine ? "En ligne" : "Hors ligne";
    } catch {
        connectionState.textContent = navigator.onLine ? "Connexion indisponible" : "Hors ligne";
        message.textContent = "Le catalogue des jeux est momentanément indisponible.";
    }
}

window.addEventListener("online", () => { connectionState.textContent = "En ligne"; renderGames(); });
window.addEventListener("offline", () => { connectionState.textContent = "Hors ligne"; renderGames(); });

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("../service-worker.js", import.meta.url), {
        scope: ROOT_URL.pathname,
        updateViaCache: "none"
    }).catch(() => {
        connectionState.textContent = "Mode hors ligne indisponible";
    });
}

renderGames();