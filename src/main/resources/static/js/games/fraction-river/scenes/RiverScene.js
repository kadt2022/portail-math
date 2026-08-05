(function initializeRiverScene(root) {
    "use strict";

    // Le canvas est créé deux fois plus grand que le monde, et la caméra
    // compense par un zoom : chaque trait est tracé sur deux fois plus de
    // pixels, ce qui enlève le flou quand la scène est étirée.
    const RENDER_SCALE = 2;
    // Distance entre l'ancre du conteneur du héros et la plante de ses pieds.
    const FOOT_OFFSET = 8;
    const BANK_DEPTH = 15;

    function createRiverScene(Phaser) {
        return class RiverScene extends Phaser.Scene {
            constructor() {
                super({key: "RiverScene"});
            }

            init(data) {
                this.bus = (data && data.bus) || root.FractionRiverEvents;
                this.reducedMotion = Boolean(data && data.reducedMotion);
                // La scène ne connaît qu'un nom de profil. Ni plein écran, ni
                // orientation, ni navigateur : seulement une géométrie.
                this.layout = root.FractionRiverLayouts.createLayout(data && data.layout);
                // Progression logique reçue de l'extérieur, pour se replacer à
                // l'identique après un changement de profil.
                this.completedSteps = Math.max(
                    0,
                    Math.min(
                        this.layout.stones.length,
                        (data && data.progress && data.progress.completedSteps) || 0
                    )
                );
                this.stones = [];
                this.planks = [];
                this.unsubscribers = [];
            }

            create() {
                this.buildWorld();
                this.wireEvents();
                this.events.once("shutdown", () => this.unwireEvents());
            }

            // Changement de profil sans redémarrer la scène : les écouteurs du
            // bus restent en place, donc aucun risque de doublon, et aucun
            // second canvas n'est créé. Seul le décor est refait.
            applyLayout(name, progress) {
                const profil = root.FractionRiverLayouts.createLayout(name);
                if (profil.name === this.layout.name) {
                    return this.layout.name;
                }
                this.tweens.killAll();
                this.children.removeAll(true);
                this.stones = [];
                this.planks = [];
                this.terraces = null;
                this.water = null;
                this.foam = null;
                this.layout = profil;
                this.completedSteps = Math.max(
                    0,
                    Math.min(profil.stones.length, (progress && progress.completedSteps) || 0)
                );
                this.buildWorld();
                return this.layout.name;
            }

            buildWorld() {
                const layout = this.layout;
                this.cameras.main.setZoom(RENDER_SCALE);
                this.cameras.main.centerOn(layout.width / 2, layout.height / 2);

                this.buildSky();
                this.buildBanks();
                this.buildVegetation();
                this.buildWater();
                this.buildFish();
                this.buildStones();
                this.buildBridgeAndChest();

                this.explorer = root.createExplorer(
                    this,
                    layout.explorerHome.x,
                    layout.explorerHome.y,
                    {reducedMotion: this.reducedMotion}
                );
                this.explorer.container.setDepth(40);

                this.frog = root.createFrog(this, layout.frog.x, layout.frog.y, {
                    reducedMotion: this.reducedMotion
                });

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

                // Après un changement de profil, on rejoue l'état sans rejouer
                // les animations : les appuis déjà gagnés sont simplement là.
                this.restoreProgress();
            }

            // Ce que la scène sait de la partie, et rien de plus : de quoi se
            // reconstruire à l'identique dans l'autre géométrie.
            progressSnapshot() {
                return {completedSteps: this.completedSteps};
            }

            restoreProgress() {
                if (this.completedSteps <= 0) {
                    return;
                }
                for (let index = 0; index < this.completedSteps; index += 1) {
                    this.stones[index].placeInstantly();
                }
                const appui = this.stones[this.completedSteps - 1];
                this.explorer.resetTo(appui.x, appui.standY);
            }

            // ---------- décor ----------

            skyBottom() {
                const layout = this.layout;
                if (layout.name === "panoramic") {
                    return layout.waterline;
                }
                return layout.stones[layout.stones.length - 1].y - 24;
            }

            buildSky() {
                const layout = this.layout;
                const bas = this.skyBottom();
                const sky = this.add.graphics();
                sky.fillGradientStyle(0xbfe4ff, 0xbfe4ff, 0xeaf7ff, 0xeaf7ff, 1);
                sky.fillRect(0, 0, layout.width, bas);

                const soleil = Math.round(layout.width * 0.14);
                this.add.circle(soleil, 46, 26, 0xffc93c);
                this.add.circle(soleil, 46, 38, 0xffc93c, 0.25);

                const collines = layout.name === "panoramic" ? 4 : 3;
                const pas = layout.width / collines;
                for (let index = 0; index < collines; index += 1) {
                    this.add.ellipse(
                        Math.round(pas * (index + 0.5)),
                        bas,
                        Math.round(pas * 1.15),
                        90,
                        index % 2 ? 0x2f8a5c : 0x25764c,
                        0.85
                    );
                }
            }

            buildBanks() {
                const layout = this.layout;
                // Les berges passent DEVANT l'eau : sans profondeur explicite,
                // la nappe les recouvrirait et le pont semblerait déboucher
                // dans la rivière.
                const gaucheY = layout.leftWaterY;
                const droiteY = layout.deckSurfaceY;

                const gauche = this.add.rectangle(
                    layout.bankWidth / 2,
                    gaucheY + layout.height,
                    layout.bankWidth,
                    layout.height * 2,
                    0xc9a227
                );
                gauche.setDepth(BANK_DEPTH);

                const droite = this.add.rectangle(
                    layout.width - layout.bankWidth / 2,
                    droiteY + layout.height,
                    layout.bankWidth,
                    layout.height * 2,
                    0xc9a227
                );
                droite.setDepth(BANK_DEPTH);

                const sableGauche = this.add.ellipse(layout.bankWidth, gaucheY + 6, 120, 26, 0xd8b23a);
                sableGauche.setDepth(BANK_DEPTH);
                const sableDroite = this.add.ellipse(
                    layout.width - layout.bankWidth,
                    droiteY + 6,
                    120,
                    26,
                    0xd8b23a
                );
                sableDroite.setDepth(BANK_DEPTH);

                const village = this.add.container(layout.village.x, layout.village.y);
                village.setDepth(BANK_DEPTH + 1);
                const mur = this.add.rectangle(0, 12, 62, 46, 0xe8dcc0);
                const toit = this.add.triangle(0, -18, -40, 18, 40, 18, 0, -18, 0x9c4722);
                const porte = this.add.rectangle(0, 22, 16, 24, 0x6b4423);
                village.add([mur, toit, porte]);
            }

            buildVegetation() {
                const layout = this.layout;
                const planterArbre = (x, echelle, sol) => {
                    const arbre = this.add.container(x, sol);
                    const tronc = this.add.rectangle(0, 4, 12, 46, 0x7a5326);
                    const bas = this.add.ellipse(0, -26, 88, 44, 0x17734a);
                    const milieu = this.add.ellipse(-6, -48, 70, 38, 0x1f8a58);
                    const haut = this.add.ellipse(6, -66, 50, 30, 0x2aa46a);
                    arbre.add([tronc, bas, milieu, haut]);
                    arbre.setScale(echelle);
                    arbre.setDepth(BANK_DEPTH + 1);
                    if (!this.reducedMotion) {
                        this.tweens.add({
                            targets: [bas, milieu, haut],
                            angle: {from: -1.8, to: 1.8},
                            duration: 4200 + Math.random() * 1200,
                            yoyo: true,
                            repeat: -1,
                            ease: "Sine.easeInOut"
                        });
                    }
                };

                planterArbre(layout.trees[0].x, layout.trees[0].scale, layout.leftWaterY - 4);
                planterArbre(layout.trees[1].x, layout.trees[1].scale, layout.deckSurfaceY - 4);

                layout.palms.forEach((x, index) => {
                    const sol = this.groundLevelAt(x) - 2;
                    const palmier = this.add.container(x, sol);
                    const tronc = this.add.rectangle(0, 0, 9, 54, 0x8a5f2c);
                    tronc.setOrigin(0.5, 1);
                    tronc.setAngle(index % 2 ? 4 : -4);
                    palmier.add(tronc);
                    [-42, -14, 16, 44].forEach((angle) => {
                        const palme = this.add.ellipse(0, -52, 46, 14, 0x17734a);
                        palme.setOrigin(0, 0.5);
                        palme.setAngle(angle);
                        palmier.add(palme);
                    });
                    palmier.setDepth(5);
                });
            }

            // Hauteur de l'eau à une abscisse donnée. En panoramique elle est
            // constante ; en immersif la rivière descend en paliers.
            groundLevelAt(x) {
                const layout = this.layout;
                if (layout.name === "panoramic") {
                    return layout.waterline;
                }
                const appuis = layout.stones;
                if (x <= appuis[0].x) {
                    return layout.leftWaterY;
                }
                for (let index = appuis.length - 1; index >= 0; index -= 1) {
                    if (x >= appuis[index].x) {
                        return appuis[index].y + 6;
                    }
                }
                return layout.leftWaterY;
            }

            buildWater() {
                const layout = this.layout;
                if (layout.name === "panoramic") {
                    this.water = this.add.tileSprite(
                        layout.width / 2,
                        layout.waterline + 72,
                        layout.width,
                        150,
                        "fr-water"
                    );
                    this.water.setDepth(10);

                    this.foam = this.add.tileSprite(
                        layout.width / 2,
                        layout.waterline + 3,
                        layout.width,
                        8,
                        "fr-water"
                    );
                    this.foam.setAlpha(0.5);
                    this.foam.setDepth(12);
                    return;
                }

                // Rivière en gradins : un plan d'eau par palier, relié au
                // suivant par une petite chute. Le regard suit la montée.
                this.terraces = [];
                const appuis = layout.stones;
                const bornes = [0];
                for (let index = 1; index < appuis.length; index += 1) {
                    bornes.push(Math.round((appuis[index - 1].x + appuis[index].x) / 2));
                }
                bornes.push(layout.width);

                for (let index = 0; index < appuis.length; index += 1) {
                    const gauche = bornes[index];
                    const droite = bornes[index + 1];
                    const largeur = droite - gauche;
                    const haut = appuis[index].y + 6;

                    const nappe = this.add.tileSprite(
                        gauche + largeur / 2,
                        haut + layout.height / 2,
                        largeur,
                        layout.height,
                        "fr-water"
                    );
                    nappe.setDepth(10);
                    this.terraces.push(nappe);

                    const ecume = this.add.tileSprite(
                        gauche + largeur / 2,
                        haut + 3,
                        largeur,
                        8,
                        "fr-water"
                    );
                    ecume.setAlpha(0.5);
                    ecume.setDepth(12);
                    this.terraces.push(ecume);

                    // La chute qui relie ce palier au précédent.
                    if (index > 0) {
                        const chute = this.add.rectangle(
                            gauche,
                            haut - 14,
                            10,
                            34,
                            0xffffff,
                            0.55
                        );
                        chute.setDepth(13);
                    }
                }
            }

            buildFish() {
                const layout = this.layout;
                this.fish = [];
                layout.fish.forEach((position, index) => {
                    const poisson = this.add.container(position.x, position.y);
                    const corps = this.add.ellipse(0, 0, 26, 12, index % 2 ? 0xffa94d : 0xffd43b);
                    const queue = this.add.triangle(-16, 0, 0, -6, 0, 6, 10, 0, 0xf08c00);
                    const oeil = this.add.circle(7, -2, 1.8, 0x14301f);
                    poisson.add([queue, corps, oeil]);
                    poisson.setDepth(11);
                    poisson.setAlpha(0.85);
                    this.fish.push(poisson);

                    if (this.reducedMotion) {
                        return;
                    }
                    this.tweens.add({
                        targets: poisson,
                        x: position.x + 70,
                        duration: 6000 + index * 900,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut",
                        onYoyo: () => poisson.setScale(-1, 1),
                        onRepeat: () => poisson.setScale(1, 1)
                    });
                });
            }

            buildStones() {
                this.layout.stones.forEach((appui) => {
                    const pierre = root.createFractionStone(this, appui.x, appui.y, {
                        reducedMotion: this.reducedMotion
                    });
                    pierre.container.setDepth(20);
                    pierre.standY = appui.standY;
                    this.stones.push(pierre);
                });
            }

            buildBridgeAndChest() {
                const layout = this.layout;
                const surface = layout.deckSurfaceY;
                const largeur = layout.deckEnd - layout.deckStart;
                const centre = layout.deckStart + largeur / 2;

                for (let x = layout.deckStart + 16; x < layout.deckEnd; x += 34) {
                    const pilotis = this.add.rectangle(x, surface + 30, 6, 52, 0x6b4423);
                    pilotis.setDepth(21);
                }

                const tablier = this.add.rectangle(centre, surface + 5, largeur, 10, 0xc98a4b);
                tablier.setStrokeStyle(2, 0x6b4423);
                tablier.setDepth(23);
                this.planks.push(tablier);

                for (let x = layout.deckStart + 22; x < layout.deckEnd - 6; x += 22) {
                    const joint = this.add.rectangle(x, surface + 5, 2, 10, 0x8a5a2b);
                    joint.setDepth(24);
                }

                const rampe = this.add.rectangle(centre, surface - 20, largeur, 4, 0x8a5a2b);
                rampe.setDepth(19);
                for (let x = layout.deckStart + 10; x <= layout.deckEnd - 10; x += 46) {
                    const barreau = this.add.rectangle(x, surface - 10, 4, 22, 0x8a5a2b);
                    barreau.setDepth(19);
                }

                this.chest = this.add.container(layout.chest.x, surface - 25);
                const base = this.add.rectangle(0, 8, 46, 30, 0x8a5a2b);
                base.setStrokeStyle(2, 0x5d3d1c);
                this.chestLid = this.add.rectangle(0, -12, 50, 18, 0xa9702f);
                this.chestLid.setStrokeStyle(2, 0x5d3d1c);
                const serrure = this.add.rectangle(0, 4, 10, 12, 0xffc93c);
                this.chest.add([base, this.chestLid, serrure]);
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
                this.completedSteps = 0;
                this.stones.forEach((pierre) => pierre.reset());
                this.chestLid.setAngle(0);
                this.chestLid.setY(-12);
                this.explorer.resetTo(this.layout.explorerHome.x, this.layout.explorerHome.y);
                this.frog.hide();
                this.cameras.main.centerOn(this.layout.width / 2, this.layout.height / 2);
            }

            advanceTo(payload) {
                const franchies = payload && Number.isInteger(payload.completedSteps)
                    ? payload.completedSteps
                    : 0;
                this.completedSteps = franchies;
                const pierre = this.stones[franchies - 1];
                if (!pierre) {
                    return;
                }
                pierre.reveal().then(() => {
                    this.explorer.jumpTo(pierre.x, pierre.standY).then(() => {
                        this.burst(pierre.x, pierre.standY - 8, 12);
                    });
                });
            }

            walkToVillage() {
                const arrivee = this.chest.x - 48;
                this.explorer.walkTo(arrivee, this.layout.deckSurfaceY).then(() => {
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
                const pas = delta / 16.666;
                if (this.water) {
                    this.water.tilePositionX += 0.22 * pas;
                }
                if (this.foam) {
                    this.foam.tilePositionX += 0.45 * pas;
                }
                if (this.terraces) {
                    this.terraces.forEach((nappe, index) => {
                        nappe.tilePositionX += (index % 2 ? 0.45 : 0.22) * pas;
                    });
                }
            }
        };
    }

    root.createRiverScene = createRiverScene;
    root.FRACTION_RIVER_RENDER_SCALE = RENDER_SCALE;
    root.FRACTION_RIVER_FOOT_OFFSET = FOOT_OFFSET;
})(typeof globalThis !== "undefined" ? globalThis : window);
