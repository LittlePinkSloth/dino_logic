export function initGameShell({
    helpItems,
    getStatistics,
    statisticsLabel = "Afficher les records",
    statisticsTitle = "Records"
}) {
    const shell = document.createElement("div");
    shell.className = "game-tools";

    const backLink = document.createElement("a");
    backLink.className = "launcher-link";
    backLink.href = new URL("../../", import.meta.url);
    backLink.setAttribute("aria-label", "Retour à Little Pink Sloth");
    backLink.title = "Retour à Little Pink Sloth";
    backLink.textContent = "🦥";

    const helpTool = createPopoverTool({
        className: "rules",
        label: "Afficher les règles du jeu",
        title: "Règles du jeu",
        heading: "Règles du jeu",
        icon: "?",
        items: helpItems
    });
    const statisticsTool = createPopoverTool({
        className: "records",
        label: statisticsLabel,
        title: statisticsTitle,
        heading: statisticsTitle,
        icon: "🏆",
        items: []
    });

    shell.append(helpTool.container, statisticsTool.container);
    document.body.prepend(backLink, shell);

    const closePopovers = () => {
        for (const tool of [helpTool, statisticsTool]) {
            tool.container.classList.remove("is-open");
            tool.button.setAttribute("aria-expanded", "false");
        }
    };

    for (const tool of [helpTool, statisticsTool]) {
        tool.button.addEventListener("click", () => {
            const shouldOpen = !tool.container.classList.contains("is-open");
            closePopovers();
            tool.container.classList.toggle("is-open", shouldOpen);
            tool.button.setAttribute("aria-expanded", String(shouldOpen));
        });
    }

    document.addEventListener("pointerdown", event => {
        if (!shell.contains(event.target)) closePopovers();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closePopovers();
    });

    function renderStatistics() {
        const statistics = getStatistics();
        statistics.forEach((statistic, index) => {
            let item = statisticsTool.list.children[index];
            if (!item) {
                item = document.createElement("li");
                const label = document.createTextNode("");
                const value = document.createElement("output");
                item.append(label, value);
                statisticsTool.list.append(item);
            }
            item.firstChild.textContent = `${statistic.label} : `;
            item.lastChild.textContent = String(statistic.value);
        });
        while (statisticsTool.list.children.length > statistics.length) {
            statisticsTool.list.lastElementChild.remove();
        }
    }

    renderStatistics();
    return { renderStatistics };
}

function createPopoverTool({ className, label, title, heading, icon, items }) {
    const container = document.createElement("div");
    container.className = `game-tool ${className}-tool`;

    const button = document.createElement("button");
    button.className = `${className}-trigger`;
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-expanded", "false");
    button.title = title;
    button.textContent = icon;

    const popup = document.createElement("div");
    popup.className = `${className}-popup`;
    popup.setAttribute("role", "tooltip");

    const popupId = `${className}Popup`;
    button.setAttribute("aria-describedby", popupId);
    popup.id = popupId;

    const titleElement = document.createElement("strong");
    titleElement.textContent = heading;
    const list = document.createElement("ul");
    for (const text of items) {
        const item = document.createElement("li");
        item.textContent = text;
        list.append(item);
    }
    popup.append(titleElement, list);
    container.append(button, popup);

    return { container, button, list };
}