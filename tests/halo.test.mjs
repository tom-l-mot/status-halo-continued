import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(process.env.STATUS_HALO_SOURCE ?? new URL("../main.js", import.meta.url), "utf8");

function setup({ width = 1, height = 1, pixelWidth = width * 100, pixelHeight = height * 100,
    meshScaleX = 1, meshScaleY = meshScaleX, uiScale = 1, temporaryEffects = [], actorless = false } = {}) {
    const hooks = new EventEmitter();
    const graphics = [];
    class Container extends EventEmitter {
        children = [];
        destroyed = false;
        position = { x: 0, y: 0 };
        addChild(child) { child.parent = this; this.children.push(child); return child; }
        destroy(options) {
            this.destroyed = true;
            this.mask = null;
            this.emit("destroyed");
            const children = this.children.splice(0);
            if (options?.children) children.forEach(child => child.destroy(options));
            this.parent?.children.splice(this.parent.children.indexOf(this), 1);
            this.parent = null;
        }
    }
    class Graphics extends Container {
        shapes = [];
        destroyCalls = 0;
        constructor() { super(); graphics.push(this); }
        clear() { this.shapes = []; return this; }
        beginFill() { return this; }
        endFill() { return this; }
        lineStyle() { return this; }
        drawCircle(...args) { this.shapes.push(["circle", ...args]); return this; }
        drawEllipse(...args) { this.shapes.push(["ellipse", ...args]); return this; }
        drawRoundedRect(...args) { this.shapes.push(["rect", ...args]); return this; }
        destroy(options) { this.destroyCalls++; super.destroy(options); }
    }
    class Sprite extends Container {
        tint = 0xffffff;
        alpha = 1;
        mask = null;
        anchor = { x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; } };
        constructor(texture) { super(); this.texture = texture; this.width = texture.width; this.height = texture.height; }
    }
    class Token {
        effects = new Container();
        mesh = {
            scale: { x: meshScaleX, y: meshScaleY },
            get width() { return pixelWidth * Math.abs(this.scale.x); },
            get height() { return pixelHeight * Math.abs(this.scale.y); }
        };
        scene = { grid: { size: 100 } };
        actor = actorless ? null : { temporaryEffects, appliedEffects: [] };
        document = {
            width, height, effects: [],
            getSize: () => ({ width: pixelWidth, height: pixelHeight }),
            getCenterPoint: ({ x, y }) => ({ x: x + pixelWidth / 2, y: y + pixelHeight / 2 })
        };
        constructor() {
            this.effects.bg = this.effects.addChild(new Graphics());
            this.effects.overlay = null;
        }
        async _drawEffect(texture, tint) {
            if (!texture) return;
            const icon = this.effects.addChild(new Sprite(texture));
            icon.tint = tint ?? 0xffffff;
            return icon;
        }
        async _drawOverlay(texture, tint) {
            const icon = await this._drawEffect(texture, tint);
            if (icon) icon.alpha = 0.8;
            this.effects.overlay = icon ?? null;
            return icon;
        }
        _refreshEffects() {
            const bg = this.effects.bg.clear();
            for (const icon of this.effects.children) {
                if (icon === bg) continue;
                icon.width = icon.height = icon === this.effects.overlay
                    ? Math.min(pixelWidth, pixelHeight) * 0.6 : 20 * uiScale;
                icon.position = icon === this.effects.overlay
                    ? { x: pixelWidth / 2, y: pixelHeight / 2 } : { x: 0, y: 0 };
                icon.anchor.set(icon === this.effects.overlay ? 0.5 : 0);
                if (icon !== this.effects.overlay) bg.drawRoundedRect(0, 0, icon.width, icon.height, 2);
            }
        }
        refresh(flags = { refreshEffects: true }) {
            if (flags.refreshEffects) this._refreshEffects();
            hooks.emit("refreshToken", this, flags);
        }
    }
    const originals = [Token.prototype._drawEffect, Token.prototype._drawOverlay, Token.prototype._refreshEffects];
    vm.runInNewContext(source, {
        Hooks: { once: hooks.once.bind(hooks), on: hooks.on.bind(hooks) },
        Token, PIXI: { Graphics, Sprite }, canvas: { dimensions: { uiScale } },
        loadTexture: async texture => texture
    });
    hooks.emit("init");
    return { token: new Token(), Token, Graphics, graphics, originals };
}

const texture = (width = 64, height = 64) => ({ width, height, orig: { width, height }, destroyed: false });

test("core keeps effect creation, tint, and centered unmasked overlay", async () => {
    const { token, Token, originals } = setup({ temporaryEffects: [{ getFlag: () => true }] });
    const icon = await token._drawEffect(texture(), 0x123456);
    const overlay = await token._drawOverlay(texture(), 0xabcdef);
    token.refresh();
    assert.equal(icon.tint, 0x123456);
    assert.equal(overlay.tint, 0xabcdef);
    assert.equal(token.effects.overlay, overlay);
    assert.deepEqual(overlay.position, { x: 50, y: 50 });
    assert.equal(overlay.width, 60);
    assert.equal(overlay.height, 60);
    assert.equal(overlay.alpha, 0.8);
    assert.equal(overlay.mask, null);
    assert.deepEqual([Token.prototype._drawEffect, Token.prototype._drawOverlay, Token.prototype._refreshEffects], originals);
});

test("visible permanent icons absent from temporaryEffects join the halo in core order", async () => {
    const { token } = setup();
    const first = await token._drawEffect(texture());
    const second = await token._drawEffect(texture());
    token.actor.appliedEffects = [{ isTemporary: false }, { isTemporary: false }];
    token.refresh();
    assert.ok(Math.abs(first.width - 16.8) < 1e-9, `expected 16.8px, got ${first.width}px`);
    assert.ok(Math.abs(second.width - 16.8) < 1e-9, `expected 16.8px, got ${second.width}px`);
    assert.notDeepEqual(first.position, second.position);
    assert.deepEqual(token.effects.children.slice(1), [first, second]);
    assert.equal(token.effects.bg.shapes.filter(shape => shape[0] === "circle").length, 4);
});

test("actorless, zero, and overlay-only tokens leave no ordinary backgrounds", async () => {
    const { token } = setup({ actorless: true });
    token.effects.bg.drawCircle(0, 0, 1);
    token.refresh();
    assert.equal(token.effects.bg.shapes.length, 0);
    const overlay = await token._drawOverlay(texture());
    token.refresh();
    assert.equal(token.effects.bg.shapes.length, 0);
    assert.equal(overlay.mask, null);
    assert.deepEqual(overlay.position, { x: 50, y: 50 });
});

test("overlay identity is excluded wherever it appears among ordinary sprites", async () => {
    const { token } = setup();
    const first = await token._drawEffect(texture());
    const overlay = await token._drawOverlay(texture());
    const last = await token._drawEffect(texture());
    token.refresh();
    assert.equal(overlay.mask, null);
    assert.deepEqual(overlay.position, { x: 50, y: 50 });
    assert.ok(first.mask);
    assert.ok(last.mask);
    assert.notDeepEqual(first.position, last.position);
    assert.equal(token.effects.bg.shapes.filter(shape => shape[0] === "circle").length, 4);
});

test("rectangular mesh uses rendered dimensions, document center, and UI scale", async () => {
    const { token } = setup({ width: 2, height: 1, pixelWidth: 240, pixelHeight: 90, uiScale: 1.5 });
    const trimmedTexture = { ...texture(80, 40), orig: { width: 120, height: 60 } };
    const icon = await token._drawEffect(trimmedTexture);
    token.refresh();
    const angle = (0.5 + Math.PI / 15) * Math.PI;
    assert.ok(Math.abs(icon.position.x - (120 + 134.1 * Math.cos(angle))) < 1e-9);
    assert.ok(Math.abs(icon.position.y - (45 - 59.1 * Math.sin(angle))) < 1e-9);
    assert.ok(Math.abs(icon.width - 25.2) < 1e-9);
    assert.equal(icon.width, icon.height);
    assert.deepEqual(icon.mask.shapes, [["ellipse", 0, 0, 60, 30]]);
    assert.equal(icon.anchor.x, 0.5);
    assert.equal(icon.anchor.y, 0.5);
});

for (const { name, size, scale } of [
    { name: "Tiny", size: 0.5, scale: 1 },
    { name: "Small", size: 1, scale: 0.8 },
    { name: "Medium", size: 1, scale: 1 },
    { name: "Large", size: 2, scale: 1 },
    { name: "Huge", size: 3, scale: 1 },
    { name: "Gargantuan", size: 4, scale: 1 }
]) {
    for (const uiScale of [1, 1.5]) {
        test(`circular ${name} token backgrounds touch its rendered edge and each other at UI scale ${uiScale}`, async () => {
            const { token } = setup({ width: size, height: size, meshScaleX: scale, uiScale });
            const icons = await Promise.all(Array.from({ length: 5 }, () => token._drawEffect(texture())));
            token.refresh();
            const backgrounds = token.effects.bg.shapes.filter(shape => shape[0] === "circle");
            const diameter = backgrounds[0][3] * 2;
            for (const icon of icons) {
                const innerEdge = Math.hypot(icon.position.x - size * 50, icon.position.y - size * 50) - diameter / 2;
                assert.ok(Math.abs(innerEdge - size * scale * 50) < 1e-9,
                    `expected background inner edge at ${size * scale * 50}px, got ${innerEdge}px`);
            }
            for (let i = 1; i < icons.length; i++) {
                const distance = Math.hypot(icons[i].position.x - icons[i - 1].position.x,
                    icons[i].position.y - icons[i - 1].position.y);
                assert.ok(Math.abs(distance - diameter) < 1e-9,
                    `expected touching backgrounds, got ${distance - diameter}px gap`);
            }
        });
    }
}

test("texture scale-only refresh moves the halo to the rendered token edge", async () => {
    const { token } = setup();
    const icon = await token._drawEffect(texture());
    token.refresh();
    const before = { ...icon.position };
    token.mesh.scale.x = token.mesh.scale.y = 0.8;
    token.refresh({ refreshMesh: true });
    const radius = token.effects.bg.shapes.find(shape => shape[0] === "circle")[3];
    assert.notDeepEqual(icon.position, before);
    assert.ok(Math.abs(Math.hypot(icon.position.x - 50, icon.position.y - 50) - radius - 40) < 1e-9);
});

test("mirrored texture scales keep positive rendered halo radii", async () => {
    const { token } = setup({ meshScaleX: -0.8, meshScaleY: -0.8 });
    const icon = await token._drawEffect(texture());
    token.refresh();
    const angle = (0.5 + Math.PI / 15) * Math.PI;
    assert.ok(Math.abs(icon.position.x - (50 + 49.4 * Math.cos(angle))) < 1e-9);
    assert.ok(Math.abs(icon.position.y - (50 - 49.4 * Math.sin(angle))) < 1e-9);
});

for (const options of [
    { width: 0.5, height: 0.5, count: 9 },
    { width: 1, height: 1, count: 17 },
    { width: 3, height: 3, count: 37 },
    { width: 2, height: 1, pixelWidth: 240, pixelHeight: 90, uiScale: 1.5, count: 9 }
]) {
    test(`${options.width}x${options.height} halo has distinct non-overlapping backgrounds when they fit`, async () => {
        const { token } = setup(options);
        const icons = await Promise.all(Array.from({ length: options.count }, () => token._drawEffect(texture())));
        token.refresh();
        const diameter = token.effects.bg.shapes.find(shape => shape[0] === "circle")[3] * 2;
        for (let i = 0; i < icons.length; i++) {
            for (let j = i + 1; j < icons.length; j++) {
                const distance = Math.hypot(icons[i].position.x - icons[j].position.x,
                    icons[i].position.y - icons[j].position.y);
                assert.ok(distance >= diameter - 1e-9, `backgrounds ${i} and ${j} overlap`);
            }
        }
    });
}

test("crowded halo distributes every icon around the full circle", async () => {
    const { token } = setup();
    const icons = await Promise.all(Array.from({ length: 60 }, () => token._drawEffect(texture())));
    token.refresh();
    const distances = icons.map((icon, i) => {
        const next = icons[(i + 1) % icons.length];
        return Math.hypot(icon.position.x - next.position.x, icon.position.y - next.position.y);
    });
    assert.ok(distances[0] > 0);
    for (const distance of distances) assert.ok(Math.abs(distance - distances[0]) < 1e-9);
});

test("repeated refresh reuses masks and ordinary destruction frees only owned masks", async () => {
    const { token, Graphics, graphics } = setup();
    const sharedTexture = texture();
    const icon = await token._drawEffect(sharedTexture);
    const foreignIcon = await token._drawEffect(sharedTexture);
    const foreignMask = new Graphics().drawCircle(1, 2, 3);
    foreignIcon.mask = foreignMask;
    token.refresh();
    const ownedMask = icon.mask;
    const count = graphics.length;
    for (let i = 0; i < 5; i++) token.refresh();
    assert.equal(graphics.length, count);
    assert.equal(icon.mask, ownedMask);
    assert.equal(foreignIcon.mask, foreignMask);
    assert.deepEqual(foreignMask.shapes, [["circle", 1, 2, 3]]);
    icon.destroy();
    foreignIcon.destroy();
    assert.equal(ownedMask.destroyed, true);
    assert.equal(ownedMask.destroyCalls, 1);
    assert.equal(foreignMask.destroyed, false);
    assert.equal(sharedTexture.destroyed, false);
    const recursivelyDestroyed = await token._drawEffect(sharedTexture);
    token.refresh();
    const recursiveMask = recursivelyDestroyed.mask;
    recursivelyDestroyed.destroy({ children: true });
    assert.equal(recursiveMask.destroyCalls, 1);
});

test("unrelated refresh flags do not change sprites or background", async () => {
    const { token, graphics } = setup();
    const icon = await token._drawEffect(texture());
    icon.position = { x: 7, y: 9 };
    token.effects.bg.drawCircle(3, 4, 5);
    token.refresh({ refreshPosition: true });
    assert.deepEqual(icon.position, { x: 7, y: 9 });
    assert.equal(icon.width, 64);
    assert.equal(icon.mask, null);
    assert.deepEqual(token.effects.bg.shapes, [["circle", 3, 4, 5]]);
    assert.equal(graphics.length, 1);
});
