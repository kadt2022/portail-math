(function initializeRiverScene(root) {
    "use strict";

    const WORLD_WIDTH = 1680;
    const VIEW_WIDTH = 840;
    const VIEW_HEIGHT = 320;
    const WATERLINE = 176;
    const BANK_WIDTH = 150;
    const STEP_COUNT = 5;
    // Hauteur à laquelle le héros se tient debout sur une pierre.
    const STAND_Y = WATERLINE - 12;
    // Surface du tablier du pont. C'est une hauteur de SOL : la conversion vers
    // la position du conteneur est faite par l'explorateur, qui seul connaît
    // l'écart entre son ancre et ses semelles.
    const DECK_SURFACE_Y = WATERLINE - 4;

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
                // Les berges passent DEVANT l'eau : sans profondeur explicite,
                // le tableau d'eau les recouvrait et le pont semblait déboucher
                // dans la rivière.
                const BANK_DEPTH = 15;

                [BANK_WIDTH / 2, WORLD_WIDTH - BANK_WIDTH / 2].forEach((x) => {
                    const bank = this.add.rectangle(x, WATERLINE + 72, BANK_WIDTH, 150, 0xc9a227);
                    bank.setDepth(BANK_DEPTH);
                });

                [BANK_WIDTH, WORLD_WIDTH - BANK_WIDTH].forEach((x) => {
                    const sand = this.add.ellipse(x, WATERLINE + 6, 120, 26, 0xd8b23a);
                    sand.setDepth(BANK_DEPTH);
                });

                const village = this.add.container(WORLD_WIDTH - 96, WATERLINE - 46);
                village.setDepth(BANK_DEPTH + 1);
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

            // Un petit pont de bois d'un seul tenant, posé là depuis le début.
            // Sa surface est alignée sur la hauteur où le héros se tient déjà
            // sur les pierres : la marche finale est plate et continue, et les
            // pieds portent sur le tablier au lieu de flotter au-dessus.
            buildBridgeAndChest() {
                const chestX = WORLD_WIDTH - 78;
                const lastStone = this.stones.length
                    ? this.stones[this.stones.length - 1]
                    : {x: WORLD_WIDTH / 2, y: WATERLINE + 10};

                this.deckSurfaceY = DECK_SURFACE_Y;
                const deckStart = lastStone.x - 6;
                const deckEnd = WORLD_WIDTH - BANK_WIDTH + 40;
                const deckWidth = deckEnd - deckStart;
                const deckCentre = deckStart + deckWidth / 2;

                // Pilotis régulièrement espacés, plantés sous le tablier.
                for (let x = deckStart + 16; x < deckEnd; x += 34) {
                    const post = this.add.rectangle(x, this.deckSurfaceY + 30, 6, 52, 0x6b4423);
                    post.setDepth(21);
                }

                const deck = this.add.rectangle(
                    deckCentre,
                    this.deckSurfaceY + 5,
                    deckWidth,
                    10,
                    0xc98a4b
                );
                deck.setStrokeStyle(2, 0x6b4423);
                deck.setDepth(23);
                this.planks.push(deck);

                // Les joints entre planches, dessinés sur un tablier continu :
                // l'aspect des lattes sans les trous où l'on trébucherait.
                for (let x = deckStart + 22; x < deckEnd - 6; x += 22) {
                    const seam = this.add.rectangle(x, this.deckSurfaceY + 5, 2, 10, 0x8a5a2b);
                    seam.setDepth(24);
                }

                // Garde-corps côté amont, pour que ça se lise comme un pont.
                const rail = this.add.rectangle(deckCentre, this.deckSurfaceY - 20, deckWidth, 4, 0x8a5a2b);
                rail.setDepth(19);
                for (let x = deckStart + 10; x <= deckEnd - 10; x += 46) {
                    const baluster = this.add.rectangle(x, this.deckSurfaceY - 10, 4, 22, 0x8a5a2b);
                    baluster.setDepth(19);
                }

                this.bridgeEntryX = deckStart + 24;

                this.chest = this.add.container(chestX, this.deckSurfaceY - 25);
                const base = this.add.rectangle(0, 8, 46, 30, 0x8a5a2b);
                base.setStrokeStyle(2, 0x5d3d1c);
                this.chestLid = this.add.rectangle(0, -12, 50, 18, 0xa9702f);
                this.chestLid.setStrokeStyle(2, 0x5d3d1c);
                const lock = this.add.rectangle(0, 4, 10, 12, 0xffc93c);
                this.chest.add([base, this.chestLid, lock]);
                this.chest.setDepth(24);
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
                on("journey:finale-started", () => this.walkToVillage());
            }

            unwireEvents() {
                this.unsubscribers.forEach((off) => off && off());
                this.unsubscribers = [];
            }

            resetJourney() {
                this.stones.forEach((stone) => stone.reset());
                // L'escalier de sortie fait partie du décor : il reste en place.
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
                    this.explorer.jumpTo(stone.x, STAND_Y).then(() => {
                        this.burst(stone.x, stone.y - 30, 12);
                    });
                });
            }

            // Marche plate sur le tablier, du dernier appui jusqu'au coffre.
            walkToVillage() {
                const finalX = this.chest.x - 56;
                this.explorer.walkTo(finalX, this.deckSurfaceY).then(() => {
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
