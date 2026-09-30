export function showSuccessAnimation() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
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
        burst.style.setProperty("--delay", `${burstIndex * 120}ms`);

        for (let index = 0; index < 14; index++) {
            const particle = document.createElement("i");
            particle.style.setProperty("--angle", `${180 + index * (360 / 14)}deg`);
            particle.style.setProperty("--distance", `${65 + Math.random() * 75}px`);
            burst.append(particle);
        }

        fireworks.append(burst);
    }

    document.body.append(fireworks);
    setTimeout(() => fireworks.remove(), 1800);
}