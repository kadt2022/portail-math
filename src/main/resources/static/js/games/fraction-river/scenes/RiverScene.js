(function initializeRiverScene(root) {
    "use strict";

    const WORLD_WIDTH = 1680;
    const VIEW_WIDTH = 840;
    const VIEW_HEIGHT = 320;
    const WATERLINE = 176;
    const BANK_WIDTH = 150;
    const STEP_COUNT = 5;

    function createRiverScene(Phaser) {
        return class RiverScene extends Phaser.Scene {
            constructor() {
                super({key: "RiverScene"});
            }

            init(data) {
                this.bus = (data && data.bus) || root.FractionRiverEvents;
                this.reducedMotion = Boolean(data && data.reducedMotion);
                this.stones = [];
                this.planks = [];
                this.unsubscribers = [];
            }

            create() {
                this.cameras.main.setBounds(0, 0, WORLD_WIDTH, VIEW_HEIGHT);
                this.physics = null;

                this.buildSky();
                this.buildBanks();
                this.buildVegetation();
                this.buildWater();
                this.buildFish();
                this.buildStones();
                this.buildBridgeAndChest();

                this.explorerHome = {x: 96, y: WATERLINE - 12};
                this.explorer = root.createExplorer(
                    this,
                    this.explorerHome.x,
                    this.explorerHome.y,
                    {reducedMotion: this.reducedMotion}
                );
                this.explorer.container.setDepth(40);

                this.frog = root.createFrog(this, 250, WATERLINE - 26, {
                    reducedMotion: this.reducedMotion
                });

                this.cameras.main.startFollow(this.explorer.container, true, 0.04, 0.04);
                this.cameras.main.setFollowOffset(-120, 0);

                this.sparks = this.add.particles(0, 0, "fr-spark", {
                    speed: {min: 40, max: 130},
                    lifespan: 900,
                    quantity: 0,
                    scale: {start: 0.55, end: 0},
                    alpha: {start: 0.9, end: 0},
                    gravityY: 60,
                    tint: [0xffd166, 0x8ce99a, 0x74c0fc],
                    emitting: false
                });
                this.sparks.setDepth(70);

                this.wireEvents();
                this.events.once("shutdown", () => this.unwireEvents());
            }

            // ---------- décor ----------

            buildSky() {
                const sky = this.add.graphics();
                sky.fillGradientStyle(0xbfe4ff, 0xbfe4ff, 0xeaf7ff, 0xeaf7ff, 1);
                sky.fillRect(0, 0, WORLD_WIDTH, WATERLINE);
                sky.setScrollFactor(0.35);

                const sun = this.add.circle(120, 46, 26, 0xffc93c);
                sun.setScrollFactor(0.2);
                const halo = this.add.circle(120, 46, 38, 0xffc93c, 0.25);
                halo.setScrollFactor(0.2);

                for (let index = 0; index < 6; index += 1) {
                    const hill = this.add.ellipse(
                        180 + index * 300,
                        WATERLINE,
                        260 + (index % 3) * 70,
                        90,
                        index % 2 ? 0x2f8a5c : 0x25764c,
                        0.85
                    );
                    hill.setScrollFactor(0.5);
                }
            }

            buildBanks() {
                this.add.rectangle(BANK_WIDTH / 2, WATERLINE + 72, BANK_WIDTH, 150, 0xc9a227);
                this.add.rectangle(
                    WORLD_WIDTH - BANK_WIDTH / 2,
                    WATERLINE + 72,
                    BANK_WIDTH,
                    150,
                    0xc9a227
                );
                this.add.ellipse(BANK_WIDTH, WATERLINE + 6, 120, 26, 0xd8b23a);
                this.add.ellipse(WORLD_WIDTH - BANK_WIDTH, WATERLINE + 6, 120, 26, 0xd8b23a);

                const village = this.add.container(WORLD_WIDTH - 96, WATERLINE - 46);
                const wall = this.add.rectangle(0, 12, 62, 46, 0xe8dcc0);
                const roof = this.add.triangle(0, -18, -40, 18, 40, 18, 0, -18, 0x9c4722);
                const door = this.add.rectangle(0, 22, 16, 24, 0x6b4423);
                village.add([wall, roof, door]);
            }

            buildVegetation() {
                const plantTree = (x, scale) => {
                    const tree = this.add.container(x, WATERLINE - 4);
                    const trunk = this.add.rectangle(0, 4, 12, 46, 0x7a5326);
                    const crownLow = this.add.ellipse(0, -26, 88, 44, 0x17734a);
                    const crownMid = this.add.ellipse(-6, -48, 70, 38, 0x1f8a58);
                    const crownTop = this.add.ellipse(6, -66, 50, 30, 0x2aa46a);
                    tree.add([trunk, crownLow, crownMid, crownTop]);
                    tree.setScale(scale);
                    if (!this.reducedMotion) {
                        this.tweens.add({
                            targets: [crownLow, crownMid, crownTop],
                            angle: {from: -1.8, to: 1.8},
                            duration: 4200 + Math.random() * 1200,
                            yoyo: true,
                            repeat: -1,
                            ease: "Sine.easeInOut"
                        });
                    }
                    return tree;
                };

                plantTree(58, 1);
                plantTree(WORLD_WIDTH - 58, 0.95);

                [420, 900, 1320].forEach((x, index) => {
                    const palm = this.add.container(x, WATERLINE - 2);
                    const trunk = this.add.rectangle(0, 0, 9, 54, 0x8a5f2c);
                    trunk.setOrigin(0.5, 1);
                    trunk.setAngle(index % 2 ? 4 : -4);
                    palm.add(trunk);
                    [-42, -14, 16, 44].forEach((angle) => {
                        const frond = this.add.ellipse(0, -52, 46, 14, 0x17734a);
                        frond.setOrigin(0, 0.5);
                        frond.setAngle(angle);
                        palm.add(frond);
                    });
                    palm.setScrollFactor(0.85);
                    palm.setDepth(5);
                });
            }

            buildWater() {
                this.water = this.add.tileSprite(
                    WORLD_WIDTH / 2,
                    WATERLINE + 72,
                    WORLD_WIDTH,
                    150,
                    "fr-water"
                );
                this.water.setDepth(10);

                this.foam = this.add.tileSprite(
                    WORLD_WIDTH / 2,
                    WATERLINE + 3,
                    WORLD_WIDTH,
                    8,
                    "fr-water"
                );
                this.foam.setAlpha(0.5);
                this.foam.setDepth(12);
            }

            buildFish() {
                this.fish = [];
                const positions = [
                    {x: 320, y: WATERLINE + 46},
                    {x: 760, y: WATERLINE + 88},
                    {x: 1180, y: WATERLINE + 58},
                    {x: 1460, y: WATERLINE + 96}
                ];
                positions.forEach((position, index) => {
                    const fish = this.add.container(position.x, position.y);
                    const body = this.add.ellipse(0, 0, 26, 12, index % 2 ? 0xffa94d : 0xffd43b);
                    const tail = this.add.triangle(-16, 0, 0, -6, 0, 6, 10, 0, 0xf08c00);
                    const eye = this.add.circle(7, -2, 1.8, 0x14301f);
                    fish.add([tail, body, eye]);
                    fish.setDepth(11);
                    fish.setAlpha(0.85);
                    this.fish.push(fish);

                    if (this.reducedMotion) {
                        return;
                    }
                    this.tweens.add({
                        targets: fish,
                        x: position.x + 150,
                        duration: 6000 + index * 900,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut",
                        onYoyo: () => fish.setScale(-1, 1),
                        onRepeat: () => fish.setScale(1, 1)
                    });
                });
            }

            buildStones() {
                const first = BANK_WIDTH + 90;
                const last = WORLD_WIDTH - BANK_WIDTH - 120;
                const gap = (last - first) / (STEP_COUNT - 1);
                for (let index = 0; index < STEP_COUNT; index += 1) {
                    const x = Math.round(first + gap * index);
                    const stone = root.createFractionStone(this, x, WATERLINE + 10, {
                        reducedMotion: this.reducedMotion
                    });
                    stone.container.setDepth(20);
                    this.stones.push(stone);
                }
            }

            buildBridgeAndChest() {
                const chestX = WORLD_WIDTH - BANK_WIDTH - 20;
                this.bridgeStart = this.stones.length
                    ? this.stones[this.stones.length - 1].x
                    : WORLD_WIDTH / 2;

                for (let index = 0; index < 3; index += 1) {
                    const x = this.bridgeStart + 40 + index * 44;
                    const plank = this.add.rectangle(x, WATERLINE + 4, 40, 10, 0xb9793d);
                    plank.setStrokeStyle(2, 0x6b4423);
                    plank.setAlpha(0);
                    plank.setDepth(22);
                    this.planks.push(plank);
                }

                this.chest = this.add.container(chestX, WATERLINE - 22);
                const base = this.add.rectangle(0, 8, 46, 30, 0x8a5a2b);
                base.setStrokeStyle(2, 0x5d3d1c);
                this.chestLid = this.add.rectangle(0, -12, 50, 18, 0xa9702f);
                this.chestLid.setStrokeStyle(2, 0x5d3d1c);
                const lock = this.add.rectangle(0, 4, 10, 12, 0xffc93c);
                this.chest.add([base, this.chestLid, lock]);
                this.chest.setDepth(24);
                this.chest.setAlpha(0);
            }

            // ---------- réactions aux événements pédagogiques ----------

            wireEvents() {
                const on = (name, handler) => {
                    this.unsubscribers.push(this.bus.on(name, handler));
                };

                on("journey:started", () => this.resetJourney());
                on("answer:incorrect", (payload) => {
                    this.frog.say((payload && payload.hint) || "Regarde bien le dessin.");
                });
                on("answer:correct", () => {
                    this.frog.hide();
                    this.explorer.cheer();
                });
                on("step:completed", (payload) => this.advanceTo(payload));
                on("bridge:started", () => this.frog.say("Pose les dalles pour finir le pont."));
                on("bridge:slab", (payload) => this.raisePlank(payload));
                on("journey:completed", () => this.openChest());
            }

            unwireEvents() {
                this.unsubscribers.forEach((off) => off && off());
                this.unsubscribers = [];
            }

            resetJourney() {
                this.stones.forEach((stone) => stone.reset());
                this.planks.forEach((plank) => plank.setAlpha(0));
                this.chest.setAlpha(0);
                this.chestLid.setAngle(0);
                this.chestLid.setY(-12);
                this.explorer.resetTo(this.explorerHome.x, this.explorerHome.y);
                this.frog.hide();
                this.cameras.main.scrollX = 0;
            }

            advanceTo(payload) {
                const completed = payload && Number.isInteger(payload.completedSteps)
                    ? payload.completedSteps
                    : 0;
                const stone = this.stones[completed - 1];
                if (!stone) {
                    return;
                }
                stone.reveal().then(() => {
                    this.explorer.jumpTo(stone.x, stone.y - 22).then(() => {
                        this.burst(stone.x, stone.y - 30, 12);
                    });
                });
            }

            raisePlank(payload) {
                const placed = payload && Number.isInteger(payload.placed) ? payload.placed : 0;
                const plank = this.planks[placed - 1];
                if (!plank) {
                    return;
                }
                if (this.reducedMotion) {
                    plank.setAlpha(1);
                    return;
                }
                plank.setAlpha(0);
                plank.setY(WATERLINE - 16);
                this.tweens.add({
                    targets: plank,
                    alpha: 1,
                    y: WATERLINE + 4,
                    duration: 420,
                    ease: "Back.easeOut"
                });
                this.burst(plank.x, WATERLINE - 6, 8);
            }

            openChest() {
                this.chest.setAlpha(1);
                const finalX = this.chest.x - 40;
                this.explorer.jumpTo(finalX, WATERLINE - 12).then(() => {
                    if (this.reducedMotion) {
                        this.chestLid.setAngle(-24);
                        return;
                    }
                    this.tweens.add({
                        targets: this.chestLid,
                        angle: -28,
                        y: -20,
                        duration: 420,
                        ease: "Back.easeOut"
                    });
                    this.burst(this.chest.x, this.chest.y - 20, 40);
                    this.explorer.cheer();
                });
            }

            burst(x, y, quantity) {
                if (this.reducedMotion || !this.sparks) {
                    return;
                }
                this.sparks.emitParticleAt(x, y, quantity);
            }

            update(time, delta) {
                if (this.reducedMotion) {
                    return;
                }
                const step = delta / 16.666;
                if (this.water) {
                    this.water.tilePositionX += 0.22 * step;
                }
                if (this.foam) {
                    this.foam.tilePositionX += 0.45 * step;
                }
            }
        };
    }

    root.createRiverScene = createRiverScene;
    root.FRACTION_RIVER_VIEW = {WORLD_WIDTH, VIEW_WIDTH, VIEW_HEIGHT, WATERLINE};
})(typeof globalThis !== "undefined" ? globalThis : window);
