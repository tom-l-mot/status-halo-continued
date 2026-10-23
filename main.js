function sizeToOffset(size) {
    if (size >= 2) return 0.925;
    if (size >= 1) return 1.2;
    return 1.4;
}

function sizeToIconScale(size) {
    if (size >= 2.5) return size / 2;
    if (size >= 1.5) return size * 0.7;
    return 1.4;
}

function drawBG(effectIcon, background, uiScale) {
    const radius = effectIcon.width / 2 + uiScale;
    background.lineStyle(uiScale / 2, 0x956d58, 1, 0);
    background.drawCircle(effectIcon.position.x, effectIcon.position.y, radius);
    background.beginFill(0x333333);
    background.drawCircle(effectIcon.position.x, effectIcon.position.y, radius);
    background.endFill();
}

function updateEffectScales(token) {
    const effects = token.effects;
    if (!(effects?.bg instanceof PIXI.Graphics)) return;

    const background = effects.bg.clear();
    const icons = effects.children.filter(icon => icon instanceof PIXI.Sprite && icon !== effects.overlay);
    const size = Math.min(token.document.width, token.document.height);
    const max = Math.max(Math.min(Math.ceil(size * 15), 40), icons.length);
    const { width, height } = token.document.getSize();
    const center = token.document.getCenterPoint({ x: 0, y: 0 });
    const offset = sizeToOffset(size);
    const uiScale = canvas.dimensions.uiScale;
    const iconSize = 12 * sizeToIconScale(size) * uiScale;
    const initialRotation = (0.5 + Math.PI / max) * Math.PI;

    icons.forEach((icon, i) => {
        icon.anchor.set(0.5);
        icon.width = icon.height = iconSize;
        const angle = i / max * 2 * Math.PI + initialRotation;
        icon.position.x = center.x + width * offset / 2 * Math.cos(angle);
        icon.position.y = center.y - height * offset / 2 * Math.sin(angle);

        if (!icon.mask) {
            const mask = new PIXI.Graphics().beginFill(0xffffff)
                .drawEllipse(0, 0, icon.texture.orig.width / 2, icon.texture.orig.height / 2).endFill();
            icon.addChild(mask);
            icon.mask = mask;
            // Core destroys sprites without destroying their children.
            icon.once("destroyed", () => {
                if (!mask.destroyed) mask.destroy();
            });
        }
        drawBG(icon, background, uiScale);
    });
}

Hooks.on("refreshToken", (token, flags) => {
    if (flags.refreshEffects) updateEffectScales(token);
});
