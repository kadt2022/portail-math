(function initializePlayScene(root) {
    "use strict";

    // La couche 2 : tout ce qui vit, et rien d'autre.
    //
    // Le décor est peint. Cette scène ne dessine plus une seule berge, un seul
    // arbre, un seul village. Elle ne porte que ce qui bouge :
    //
    //   les vagues                longues ondulations dans le sens du courant
    //   les reflets               petits éclats lointains
    //   les poissons              sous la surface, dans les deux sens
    //   les oiseaux               traversée lente du ciel
    //   la pierre gagnée          contour lumineux discret, pas de gros cercle
    //   le chien                  saute d'appui en appui
    //   l'éclaboussure            à l'arrivée sur chaque pierre
    //
    // Deux règles tenues par construction :
    //
    //   Le chien ne tombe jamais à l'eau. Une mauvaise réponse ne déclenche
    //   aucun déplacement — il attend, assis, et respire.
    //
    //   Vagues et poissons sont enfermés dans un masque à la forme du lit de la
    //   rivière. Ils ne peuvent pas déborder sur les berges, même si un réglage
    //   d'amplitude est trop généreux.

    // L'ordre exigé, du fond vers l'avant :
    //   illustration (dans le DOM, derrière le canvas)
    //   poissons        — sous la surface
    //   reflets et ondulations
    //   chien et pierres gagnées
    // Un poisson au-dessus des ondulations semblait nager SUR l'eau.
    const DEPTH = {
        poisson: 4,
        vague: 6,
        reflet: 7,
        pierreGagnee: 10,
        eclaboussure: 12,
        chien: 20,
        oiseau: 25
    };

    // Le chien est encore un placeholder dessiné par le code, en attendant sa
    // vraie feuille d'animation. Les cinq poses existent déjà comme états : le
    // jour où les images arrivent, seul setPose change.
    const POSES = ["repos", "pret", "air", "atterrit", "celebre"];

    // Quatre oiseaux, quatre palettes franches. `cerne` n'assombrit pas
    // l'oiseau : c'est un liseré fin, de la même famille de teinte, qui le
    // détache du ciel. Sans lui, le jaune se dissout dans les nuages et le bleu
    // disparaît complètement.
    // Trois silhouettes d'ondelette. Des périodes non entières et des phases
    // décalées : deux ondelettes voisines ne doivent jamais se ressembler.
    // L'amplitude est comptée dans une texture de 44 px de haut. Avec 7 px dans
    // une texture de 26, la courbe s'aplatissait à l'affichage et se lisait comme
    // un faisceau droit. Ici l'ondulation occupe le tiers de la hauteur.
    const WAVE_TEXTURE = {width: 160, height: 44};
    const WAVE_SHAPES = [
        {periodes: 1.7, phase: 0, amplitude: 14, epaisseur: 2.6},
        {periodes: 2.4, phase: 1.1, amplitude: 11, epaisseur: 2.2},
        {periodes: 1.3, phase: 2.4, amplitude: 16, epaisseur: 3}
    ];

    // Quatre palettes, aucune rouge. L'oiseau rouge est retiré.
    const BIRD_PALETTES = [
        // Jaune, cerné de noir.
        {corps: 0xffd43b, aile: 0xf59f00, ventre: 0xfff9db, bec: 0xff922b, cerne: 0x1a1a1a},
        // Orange, ailes bleu foncé.
        {corps: 0xff922b, aile: 0x1864ab, ventre: 0xffe8cc, bec: 0xffd43b, cerne: 0x10243a},
        // Vert clair, ventre blanc.
        {corps: 0x94d82d, aile: 0x2f9e44, ventre: 0xffffff, bec: 0xffa94d, cerne: 0x1f4d1a},
        // Noir et blanc.
        {corps: 0x2b2b2b, aile: 0x121212, ventre: 0xffffff, bec: 0xffc93c, cerne: 0x000000}
    ];

    function createPlayScene(Phaser) {
        return class PlayScene extends Phaser.Scene {
            constructor() {
                super({key: "PlayScene"});
            }

            init(data) {
                this.anchors = root.FractionRiverAnchors;
                this.bus = (data && data.bus) || root.FractionRiverEvents;
                this.reducedMotion = Boolean(data && data.reducedMotion);
                this.completedSteps = 0;
                this.unsubscribers = [];
                this.stoneGlows = [];
                this.waves = [];
                this.glints = [];
                this.ripples = [];
                this.fish = [];
                this.birds = [];
                // Tout ce qui n'est PAS sur la liste d'affichage et doit donc
                // être détruit à la main. Un masque oublié laisse un Graphics
                // orphelin à chaque reconstruction de la scène.
                this.horsListe = [];
            }

            create() {
                const monde = this.anchors.WORLD;
                this.cameras.main.setZoom(this.anchors.RENDER_SCALE);
                this.cameras.main.centerOn(monde.width / 2, monde.height / 2);

                this.buildTextures();
                this.buildRiverMask();
                this.buildWaves();
                this.buildRipples();
                this.buildGlints();
                this.buildFish();
                this.buildBirds();
                this.buildStoneMarks();
                this.buildDog();
                this.buildSplash();

                this.wireEvents();
                this.events.once("shutdown", () => this.shutdownScene());
            }

            shutdownScene() {
                this.unwireEvents();
                this.horsListe.forEach((objet) => objet && objet.destroy());
                this.horsListe = [];
                this.riverMask = null;
            }

            // ---------- textures fabriquées ----------

            buildTextures() {
                this.buildSparkTexture();
                this.buildWaveTexture();
                this.buildBirdTexture();
                this.buildFishTexture();
                this.buildDogTexture();
            }

            buildSparkTexture() {
                if (this.textures.exists("fr2-spark")) {
                    return;
                }
                const g = this.make.graphics({x: 0, y: 0, add: false});
                g.fillStyle(0xffffff, 1);
                g.fillCircle(6, 6, 6);
                g.generateTexture("fr2-spark", 12, 12);
                g.destroy();
            }

            // Une ondelette : un TRAIT sinusoïdal fin, pas une ellipse pleine.
            //
            // Les ellipses se lisaient comme des zones de sélection posées sur
            // l'eau. Ici la courbe est tracée segment par segment, chacun avec sa
            // propre opacité : elle naît de rien, ondule, et s'éteint. C'est ce
            // fondu aux deux bouts qui en fait une ondulation incomplète plutôt
            // qu'un objet fermé.
            //
            // Trois variantes, de périodes et de phases différentes, pour que six
            // ondelettes à l'écran n'aient jamais la même silhouette.
            buildWaveTexture() {
                WAVE_SHAPES.forEach((forme, index) => {
                    const cle = `fr2-wave-${index}`;
                    if (this.textures.exists(cle)) {
                        return;
                    }
                    const L = WAVE_TEXTURE.width;
                    const H = WAVE_TEXTURE.height;
                    const g = this.make.graphics({x: 0, y: 0, add: false});
                    const pas = 4;
                    let precedentX = 0;
                    let precedentY = H / 2;

                    for (let x = pas; x <= L; x += pas) {
                        const p = x / L;
                        // Enveloppe en cloche : l'amplitude et l'opacité s'éteignent
                        // aux deux extrémités.
                        const enveloppe = Math.sin(p * Math.PI);
                        const y = H / 2
                            + Math.sin(p * Math.PI * 2 * forme.periodes + forme.phase)
                            * forme.amplitude * enveloppe;
                        g.lineStyle(forme.epaisseur, 0xffffff, Math.pow(enveloppe, 0.7));
                        g.beginPath();
                        g.moveTo(precedentX, precedentY);
                        g.lineTo(x, y);
                        g.strokePath();
                        precedentX = x;
                        precedentY = y;
                    }

                    g.generateTexture(cle, L, H);
                    g.destroy();
                });
            }

            // Quatre oiseaux, quatre palettes vives. Pas de silhouettes sombres :
            // ce sont des couleurs franches — orange, jaune et brun, bleu vif,
            // rouge et turquoise — qui portent la lecture.
            //
            // Le cerne foncé n'est pas là pour assombrir l'oiseau mais pour le
            // détacher : sans lui, un oiseau jaune se dissout dans le ciel clair
            // et un oiseau bleu disparaît purement et simplement dans le bleu.
            buildBirdTexture() {
                BIRD_PALETTES.forEach((palette, index) => {
                    const cle = `fr2-bird-${index}`;
                    if (this.textures.exists(cle)) {
                        return;
                    }
                    const L = 48;
                    const H = 30;
                    const g = this.make.graphics({x: 0, y: 0, add: false});

                    // Ailes déployées : deux traits épais dans la couleur d'aile.
                    g.lineStyle(5, palette.aile, 1);
                    g.beginPath();
                    g.moveTo(3, 17);
                    g.lineTo(15, 5);
                    g.lineTo(24, 15);
                    g.lineTo(33, 5);
                    g.lineTo(45, 17);
                    g.strokePath();
                    // Un liseré sombre par-dessus, plus fin : le trait garde sa
                    // couleur, mais il tient contre le ciel.
                    g.lineStyle(1.5, palette.cerne, 0.85);
                    g.beginPath();
                    g.moveTo(3, 17);
                    g.lineTo(15, 5);
                    g.lineTo(24, 15);
                    g.lineTo(33, 5);
                    g.lineTo(45, 17);
                    g.strokePath();

                    // Corps.
                    g.fillStyle(palette.corps, 1);
                    g.fillEllipse(24, 17, 21, 12);
                    g.lineStyle(2, palette.cerne, 1);
                    g.strokeEllipse(24, 17, 21, 12);

                    // Ventre clair.
                    g.fillStyle(palette.ventre, 1);
                    g.fillEllipse(25, 19, 14, 5);

                    // Bec et œil.
                    g.fillStyle(palette.bec, 1);
                    g.fillTriangle(33, 15, 43, 17, 33, 19);
                    g.fillStyle(palette.cerne, 1);
                    g.fillCircle(29, 14, 1.6);

                    g.generateTexture(cle, L, H);
                    g.destroy();
                });
            }

            // Poisson chaud, cerné de sombre : sous l'eau bleue, un poisson pâle
            // sans contour disparaît complètement.
            buildFishTexture() {
                if (this.textures.exists("fr2-fish")) {
                    return;
                }
                const L = 44;
                const H = 22;
                const g = this.make.graphics({x: 0, y: 0, add: false});

                g.fillStyle(0xf08c00, 1);
                g.fillTriangle(2, 11, 12, 3, 12, 19);
                g.lineStyle(2, 0x7a3b00, 1);
                g.strokeTriangle(2, 11, 12, 3, 12, 19);

                g.fillStyle(0xffa94d, 1);
                g.fillEllipse(26, 11, 32, 15);
                g.lineStyle(2, 0x7a3b00, 1);
                g.strokeEllipse(26, 11, 32, 15);

                // Une nageoire, pour que la silhouette ne soit pas un simple œuf.
                g.fillStyle(0xf08c00, 1);
                g.fillTriangle(24, 4, 32, 1, 30, 6);

                g.fillStyle(0x2b1c0e, 1);
                g.fillCircle(35, 9, 2.2);

                g.generateTexture("fr2-fish", L, H);
                g.destroy();
            }

            // Chien de remplacement. Rien de tout ceci ne survivra à la vraie
            // feuille d'animation — c'est le décor qui fixe la barre, et un
            // dessin au code ne l'atteindra pas. Il est là pour que le scénario
            // soit jouable aujourd'hui.
            buildDogTexture() {
                if (this.textures.exists("fr2-dog")) {
                    return;
                }
                const L = 120;
                const H = 92;
                const g = this.make.graphics({x: 0, y: 0, add: false});
                const contour = 0x4a2f14;

                g.lineStyle(3, contour, 1);

                // Queue, relevée : elle dit que le chien va bien.
                g.fillStyle(0xc07f3c, 1);
                g.fillEllipse(20, 40, 12, 30);
                g.strokeEllipse(20, 40, 12, 30);

                // Pattes arrière puis avant.
                g.fillStyle(0xb5762f, 1);
                [34, 47, 74, 87].forEach((x, i) => {
                    const hauteur = i < 2 ? 26 : 24;
                    g.fillRoundedRect(x, 88 - hauteur, 11, hauteur, 5);
                    g.strokeRoundedRect(x, 88 - hauteur, 11, hauteur, 5);
                });

                // Corps.
                g.fillStyle(0xd99a4e, 1);
                g.fillEllipse(58, 54, 68, 38);
                g.strokeEllipse(58, 54, 68, 38);

                // Ventre clair.
                g.fillStyle(0xf0d3a1, 1);
                g.fillEllipse(60, 64, 46, 16);

                // Tête.
                g.fillStyle(0xd99a4e, 1);
                g.fillCircle(93, 40, 19);
                g.strokeCircle(93, 40, 19);

                // Oreille tombante.
                g.fillStyle(0xb5762f, 1);
                g.fillEllipse(86, 26, 15, 22);
                g.strokeEllipse(86, 26, 15, 22);

                // Museau et truffe.
                g.fillStyle(0xf0d3a1, 1);
                g.fillEllipse(109, 46, 24, 15);
                g.strokeEllipse(109, 46, 24, 15);
                g.fillStyle(0x3d2b1a, 1);
                g.fillCircle(118, 43, 4);

                // Œil.
                g.fillStyle(0x2b1c0e, 1);
                g.fillCircle(97, 35, 3);

                // Collier rouge : un point de couleur vive qui aide l'enfant à
                // retrouver le chien d'un coup d'œil.
                g.fillStyle(0xc92a2a, 1);
                g.fillRoundedRect(76, 44, 9, 20, 3);

                g.generateTexture("fr2-dog", L, H);
                g.destroy();
            }

            // ---------- le lit de la rivière ----------

            // Un masque à la forme exacte du lit. Tout ce qui appartient à l'eau
            // y est enfermé : aucune vague, aucun poisson ne peut se retrouver
            // dans l'herbe, quel que soit le réglage d'amplitude.
            buildRiverMask() {
                const contour = this.anchors.riverPolygon();
                const forme = this.make.graphics({x: 0, y: 0, add: false});
                forme.fillStyle(0xffffff, 1);
                forme.beginPath();
                forme.moveTo(contour[0].x, contour[0].y);
                contour.slice(1).forEach((point) => forme.lineTo(point.x, point.y));
                forme.closePath();
                forme.fillPath();
                // Hors liste d'affichage : removeAll ne le verrait pas.
                this.horsListe.push(forme);
                this.riverMask = forme.createGeometryMask();
            }

            enfermerDansLaRiviere(objet) {
                if (this.riverMask) {
                    objet.setMask(this.riverMask);
                }
                return objet;
            }

            // ---------- l'eau ----------

            // Des ondulations longues, inclinées dans le sens du courant, à
            // plusieurs endroits et plusieurs profondeurs. La version d'avant ne
            // posait que des anneaux autour des pierres : on ne les voyait pas,
            // et ils se confondaient avec les repères de la pierre gagnée.
            // Six ondelettes, réparties dans les six zones d'eau libre déclarées
            // par le profil. Aucune n'est posée le long de l'axe de la rivière :
            // sur l'axe, elles se retrouvaient toutes alignées sur la file des
            // pierres, donc précisément là où il n'en faut aucune.
            //
            // Chacune a son propre dessin, sa propre longueur, sa propre durée et
            // son propre retard : rien n'est synchronisé.
            buildWaves() {
                this.anchors.ANCHORS.waves.forEach((spec, index) => {
                    const forme = index % WAVE_SHAPES.length;
                    const courant = this.anchors.flowAngleAt(spec.x, spec.y);
                    const vague = this.add.image(spec.x, spec.y, `fr2-wave-${forme}`);
                    // La crête s'étend EN TRAVERS du courant : perpendiculaire.
                    vague.setAngle(courant + 90);
                    // La hauteur suit la longueur : une ondelette courte est aussi
                    // moins ample. Sans ce rapport, la plus lointaine paraissait
                    // aussi agitée que celle du premier plan.
                    vague.setDisplaySize(spec.length, spec.length * 0.24);
                    vague.setAlpha(spec.alpha);
                    vague.setDepth(DEPTH.vague);
                    this.enfermerDansLaRiviere(vague);
                    this.waves.push(vague);

                    if (this.reducedMotion) {
                        return;
                    }

                    // L'aval, c'est l'inverse du sens de remontée de l'axe.
                    const aval = (courant + 180) * Math.PI / 180;
                    const derive = 46 * spec.speed;
                    const duree = Math.round(7000 / spec.speed);

                    // Elle descend le courant en s'éteignant, puis reparaît en
                    // amont. Pas de yoyo : une ondelette ne remonte pas la
                    // rivière à reculons.
                    this.tweens.add({
                        targets: vague,
                        x: spec.x + Math.cos(aval) * derive,
                        y: spec.y + Math.sin(aval) * derive,
                        alpha: {from: 0, to: 0},
                        duration: duree,
                        repeat: -1,
                        delay: index * 1150,
                        ease: "Linear",
                        onStart: () => vague.setAlpha(0),
                        onUpdate: (tween) => {
                            // Naît, vit, s'éteint : l'opacité suit une cloche.
                            const p = tween.progress;
                            vague.setAlpha(spec.alpha * Math.sin(p * Math.PI));
                        },
                        onRepeat: () => vague.setPosition(spec.x, spec.y)
                    });

                    // Et elle se déforme un peu en chemin.
                    this.tweens.add({
                        targets: vague,
                        scaleY: vague.scaleY * 1.45,
                        duration: 2300 + index * 420,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut"
                    });
                });
            }

            // Anneaux concentriques, comme après la chute d'un caillou. Chaque
            // impact lance trois cercles décalés ; la perspective les aplatit
            // légèrement sur la surface de l'eau.
            buildRipples() {
                this.anchors.ANCHORS.ripples.forEach((spec, impactIndex) => {
                    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
                        const ring = this.add.ellipse(spec.x, spec.y, 12, 5);
                        ring.setStrokeStyle(1.7, 0xe7fbff, spec.alpha);
                        ring.setFillStyle(0xffffff, 0);
                        ring.setDepth(DEPTH.reflet);
                        this.enfermerDansLaRiviere(ring);
                        this.ripples.push(ring);

                        const targetScaleX = (spec.radius * 2) / 12;
                        const targetScaleY = (spec.radius * 0.62) / 5;
                        if (this.reducedMotion) {
                            ring.setScale(targetScaleX * 0.72, targetScaleY * 0.72);
                            ring.setAlpha(spec.alpha * 0.45);
                            continue;
                        }

                        ring.setScale(0.18, 0.18);
                        ring.setAlpha(0);
                        this.tweens.add({
                            targets: ring,
                            scaleX: {from: 0.18, to: targetScaleX},
                            scaleY: {from: 0.18, to: targetScaleY},
                            duration: spec.period,
                            delay: impactIndex * 1450 + ringIndex * 620,
                            repeatDelay: 1450,
                            repeat: -1,
                            ease: "Sine.easeOut",
                            onUpdate: (tween) => {
                                ring.setAlpha(spec.alpha * Math.sin(tween.progress * Math.PI));
                            },
                            onRepeat: () => ring.setAlpha(0)
                        });
                    }
                });
            }

            buildGlints() {
                if (this.reducedMotion) {
                    return;
                }
                for (let i = 0; i < 14; i += 1) {
                    const t = Math.random();
                    const point = this.anchors.riverPointAt(t, (Math.random() * 2 - 1) * 0.8);
                    const largeur = (14 + Math.random() * 26) * point.scale;
                    const eclat = this.add.ellipse(point.x, point.y, largeur, 3 * point.scale, 0xffffff);
                    eclat.setDepth(DEPTH.reflet);
                    eclat.setAlpha(0);
                    this.enfermerDansLaRiviere(eclat);
                    this.glints.push(eclat);

                    this.tweens.add({
                        targets: eclat,
                        alpha: {from: 0, to: 0.14 + Math.random() * 0.18},
                        scaleX: {from: 0.7, to: 1.3},
                        duration: 2600 + Math.random() * 2800,
                        yoyo: true,
                        repeat: -1,
                        delay: Math.random() * 3200,
                        ease: "Sine.easeInOut"
                    });
                }
            }

            // Six poissons, à des positions DÉCLARÉES et validées, jamais
            // tirées au hasard. Un poisson placé par tirage s'était retrouvé sur
            // une pierre ; trois autres sortaient de l'eau en fin de course.
            // anchors.validateWaterSpots() vérifie départ et arrivée de chacun.
            buildFish() {
                this.anchors.ANCHORS.fish.forEach((spec, index) => {
                    const largeur = this.anchors.FISH_WORLD_WIDTH * (spec.scale || 1);
                    const poisson = this.add.image(spec.x, spec.y, "fr2-fish");
                    poisson.setDepth(DEPTH.poisson);
                    poisson.setDisplaySize(largeur * spec.sens, largeur * 0.5);
                    poisson.setTint(spec.teinte);
                    poisson.setAlpha(spec.alpha === undefined ? 0.82 : spec.alpha);
                    this.enfermerDansLaRiviere(poisson);
                    this.fish.push(poisson);

                    if (this.reducedMotion) {
                        return;
                    }
                    this.tweens.add({
                        targets: poisson,
                        x: spec.x + spec.course * spec.sens,
                        y: spec.y + 4,
                        duration: 8200 + index * 1600,
                        yoyo: true,
                        repeat: -1,
                        delay: index * 900,
                        ease: "Sine.easeInOut",
                        // Il se retourne quand il repart : il ne nage jamais à
                        // reculons.
                        onYoyo: () => poisson.setDisplaySize(-poisson.displayWidth, poisson.displayHeight),
                        onRepeat: () => poisson.setDisplaySize(-poisson.displayWidth, poisson.displayHeight)
                    });
                });
            }

            buildBirds() {
                const ciel = this.anchors.toWorldRect(this.anchors.ANCHORS.sky);
                this.anchors.ANCHORS.birds.forEach((spec, i) => {
                    const y = ciel.y + spec.vertical * ciel.height;
                    const largeur = this.anchors.BIRD_WORLD_WIDTH * spec.scale;
                    const marge = 44 + i * 18;
                    const departBord = spec.sens > 0 ? ciel.x - marge : ciel.x + ciel.width + marge;
                    const arrivee = spec.sens > 0 ? ciel.x + ciel.width + marge : ciel.x - marge;
                    // Le premier oiseau est déjà entré dans le ciel : sans ça,
                    // il faut attendre sa traversée pour en apercevoir un.
                    const depart = spec.inside === undefined
                        ? departBord
                        : ciel.x + ciel.width * spec.inside;
                    const oiseau = this.add.image(
                        depart,
                        y,
                        `fr2-bird-${spec.palette % BIRD_PALETTES.length}`
                    );
                    oiseau.setDepth(DEPTH.oiseau);
                    oiseau.setDisplaySize(largeur * spec.sens, largeur * 0.62);
                    oiseau.setAlpha(0.78 + spec.scale * 0.13);
                    this.birds.push(oiseau);

                    if (this.reducedMotion) {
                        return;
                    }
                    this.tweens.add({
                        targets: oiseau,
                        x: arrivee,
                        duration: Math.abs(22000 * ((arrivee - depart) / ciel.width) / spec.speed),
                        repeat: -1,
                        ease: "Linear",
                        onRepeat: () => oiseau.setX(departBord)
                    });
                    // Battement d'ailes : l'envergure se referme et s'ouvre.
                    this.tweens.add({
                        targets: oiseau,
                        displayHeight: largeur * 0.3,
                        duration: 460 + i * 70,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut"
                    });
                    // Et il monte et descend un peu, sinon il glisse sur un rail.
                    this.tweens.add({
                        targets: oiseau,
                        y: y + spec.bob,
                        duration: 4200 + i * 500,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut"
                    });
                });
            }

            // ---------- les pierres ----------

            // Exactement UN objet par pierre, et rien de plus.
            //
            // La version d'avant posait un disque jaune de 34 % d'opacité,
            // agrandi de 15 % au-delà de la pierre peinte, PLUS un anneau blanc
            // animé autour de chaque base. Dix objets ronds pour cinq pierres :
            // cela ressemblait à des repères de débogage.
            //
            // Ne reste qu'un contour lumineux posé sur l'empreinte exacte de la
            // pierre dessinée, sans remplissage et sans débordement.
            // Ni disque, ni anneau, ni contour : la pierre gagnée s'ÉCLAIRE.
            //
            // Une tache lumineuse en mode additif, posée à 72 % de la largeur de
            // la pierre peinte — donc bien à l'intérieur d'elle. Rien ne l'entoure
            // et rien n'en dépasse : ce n'est pas un repère posé sur l'eau, c'est
            // la pierre elle-même qui devient plus claire.
            buildStoneMarks() {
                this.stoneGlows = this.anchors.ANCHORS.stones.map((appui, index) => {
                    const pierre = this.anchors.paintedStoneAt(index);
                    const lueur = this.add.ellipse(
                        pierre.x,
                        pierre.y - pierre.height * 0.10,
                        // 0,72 dominait encore : la tache se lisait comme un
                        // bouton de sélection. À 0,58 elle éclaire le dessus de la
                        // pierre sans en dessiner le tour.
                        pierre.width * 0.58,
                        pierre.height * 0.40,
                        0xfff3cf
                    );
                    lueur.setBlendMode(Phaser.BlendModes.ADD);
                    lueur.setDepth(DEPTH.pierreGagnee);
                    lueur.setVisible(false);
                    return lueur;
                });
            }

            allumerPierre(index) {
                const contour = this.stoneGlows[index];
                if (!contour || contour.visible) {
                    return;
                }
                contour.setVisible(true);
                if (this.reducedMotion) {
                    contour.setAlpha(0.3);
                    return;
                }
                // Un éclat bref, puis la pierre garde une clarté douce : c'est
                // ainsi qu'on lit « celle-ci est acquise » sans repère flottant.
                contour.setAlpha(0);
                this.tweens.add({
                    targets: contour,
                    alpha: {from: 0, to: 0.55},
                    duration: 260,
                    yoyo: true,
                    hold: 90,
                    ease: "Sine.easeOut",
                    onComplete: () => contour.setAlpha(0.3)
                });
            }

            eteindreToutesLesPierres() {
                this.stoneGlows.forEach((contour) => {
                    this.tweens.killTweensOf(contour);
                    contour.setVisible(false);
                    contour.setAlpha(1);
                    contour.setScale(1);
                });
            }

            // ---------- le chien ----------

            buildDog() {
                const depart = this.anchors.toWorld(this.anchors.ANCHORS.heroStart);
                const taille = this.anchors.heroSizeAt(this.anchors.ANCHORS.heroStart);

                this.ombre = this.add.ellipse(depart.x, depart.y, taille.width * 0.7, 7, 0x0b2a3a, 0.32);
                this.ombre.setDepth(DEPTH.chien - 1);

                this.dog = this.add.image(depart.x, depart.y, "fr2-dog");
                // L'ancrage est la plante des pattes : le seul point qui doit
                // tomber juste sur une pierre peinte.
                this.dog.setOrigin(0.5, 1);
                this.dog.setDisplaySize(taille.width, taille.height);
                this.dog.setDepth(DEPTH.chien);
                this.tailleBase = taille;
                this.inclinaison = 0;
                this.setPose("repos");
                this.orienterVersProchaineEtape();
            }

            // Les cinq poses. Aujourd'hui ce sont des déformations d'une seule
            // image ; demain ce seront cinq dessins, et seule cette méthode
            // changera.
            setPose(nom) {
                if (!this.dog || POSES.indexOf(nom) === -1) {
                    return;
                }
                this.pose = nom;
                // L'inclinaison n'est appliquée qu'en l'air, et c'est celle du
                // trajet — pas une valeur fixe.
                this.dog.setAngle(nom === "air" ? (this.inclinaison || 0) : 0);
                const deformations = {
                    repos: {x: 1, y: 1},
                    pret: {x: 1.08, y: 0.84},
                    air: {x: 0.96, y: 1.08},
                    atterrit: {x: 1.12, y: 0.8},
                    celebre: {x: 1.04, y: 1.04}
                };
                const d = deformations[nom];
                this.dog.setDisplaySize(this.tailleBase.width * d.x, this.tailleBase.height * d.y);
            }

            // Le chien regarde là où il va.
            //
            // Il gardait la même orientation en montant vers la droite : il
            // semblait sauter en regardant derrière lui. L'orientation est fixée
            // AVANT le départ du tween, pas au milieu du saut, et conservée
            // pendant toute la trajectoire et après l'atterrissage.
            //
            // Le sprite est dessiné tourné vers la droite : un déplacement vers
            // la gauche demande donc un miroir.
            regarderVers(cibleX, cibleY) {
                if (!this.dog) {
                    return;
                }
                const dx = cibleX - this.dog.x;
                const dy = cibleY - this.dog.y;
                this.dog.setFlipX(dx < 0);

                // Une inclinaison de quelques degrés suffit à dire « il monte ».
                // Faire pivoter le sprite de l'angle réel du trajet — souvent
                // 30 à 50° — le coucherait sur le flanc.
                const pente = Math.atan2(dy, Math.abs(dx) || 1) * 180 / Math.PI;
                const signe = dx < 0 ? -1 : 1;
                this.inclinaison = Math.max(-12, Math.min(12, pente)) * signe;
            }

            // Où va-t-il ensuite ? Sur la cinquième pierre, c'est le ponton ; à
            // l'arrivée, il n'y a plus de destination et il reste tourné vers le
            // village. C'est ce qui lui évite d'attendre la question suivante en
            // regardant la berge d'où il vient.
            prochaineEtape() {
                const appuis = this.anchors.ANCHORS.stones;
                if (this.completedSteps <= 0) {
                    return appuis[0];
                }
                if (this.completedSteps < appuis.length) {
                    return appuis[this.completedSteps];
                }
                return this.anchors.ANCHORS.arrival;
            }

            orienterVersProchaineEtape() {
                const suite = this.prochaineEtape();
                if (!suite) {
                    return;
                }
                const point = this.anchors.toWorld(suite);
                this.regarderVers(point.x, point.y);
                // Debout, il ne penche pas : l'inclinaison ne sert qu'en l'air.
                this.dog.setAngle(0);
            }

            // Le chien attend, assis, entre deux questions. Une mauvaise réponse
            // ne le fait pas bouger d'un pixel : il respire, et c'est tout.
            attendreCalmement() {
                if (this.reducedMotion || !this.dog) {
                    return;
                }
                this.arreterRespiration();
                this.setPose("repos");
                this.respiration = this.tweens.add({
                    targets: this.dog,
                    scaleY: this.dog.scaleY * 1.035,
                    duration: 1600,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }

            arreterRespiration() {
                if (this.respiration) {
                    this.respiration.remove();
                    this.respiration = null;
                }
            }

            placerSur(anchor) {
                const point = this.anchors.toWorld(anchor);
                const taille = this.anchors.heroSizeAt(anchor);
                this.tailleBase = taille;
                this.dog.setPosition(point.x, point.y);
                this.dog.setDisplaySize(taille.width, taille.height);
                this.dog.setAngle(0);
                this.ombre.setPosition(point.x, point.y);
                this.ombre.setDisplaySize(taille.width * 0.7, 7);
            }

            sauterVers(anchor, options = {}) {
                const point = this.anchors.toWorld(anchor);
                const taille = this.anchors.heroSizeAt(anchor);
                // Sur le bois du ponton, pas d'éclaboussure : il n'y a pas d'eau.
                const eclaboussure = options.eclaboussure !== false;

                // Il se tourne vers sa cible AVANT de s'élancer.
                this.regarderVers(point.x, point.y);

                if (this.reducedMotion) {
                    this.placerSur(anchor);
                    if (eclaboussure) {
                        this.eclabousser(point.x, point.y);
                    }
                    return Promise.resolve();
                }

                this.arreterRespiration();
                const depart = {x: this.dog.x, y: this.dog.y};
                const departTaille = this.tailleBase;
                const hauteur = Math.max(30, Math.abs(point.x - depart.x) * 0.45);

                return new Promise((resolve) => {
                    // Ramassé avant l'élan.
                    this.setPose("pret");
                    this.tweens.addCounter({
                        from: 0, to: 1, duration: 160, ease: "Sine.easeIn",
                        onComplete: () => {
                            this.setPose("air");
                            this.tweens.addCounter({
                                from: 0,
                                to: 1,
                                duration: 560,
                                ease: "Sine.easeInOut",
                                onUpdate: (tween) => {
                                    const t = tween.getValue();
                                    const x = depart.x + (point.x - depart.x) * t;
                                    const sol = depart.y + (point.y - depart.y) * t;
                                    const eleve = Math.sin(Math.PI * t);
                                    this.dog.setPosition(x, sol - eleve * hauteur);
                                    // Le chien rétrécit en s'éloignant, tout au
                                    // long du saut, pas d'un coup à l'arrivée.
                                    const l = departTaille.width + (taille.width - departTaille.width) * t;
                                    const h = departTaille.height + (taille.height - departTaille.height) * t;
                                    this.dog.setDisplaySize(l * 0.96, h * 1.08);
                                    this.ombre.setPosition(x, sol);
                                    this.ombre.setDisplaySize(l * 0.7 * (1 - eleve * 0.4), 7);
                                    this.ombre.setAlpha(0.32 - eleve * 0.14);
                                },
                                onComplete: () => {
                                    this.placerSur(anchor);
                                    this.ombre.setAlpha(0.32);
                                    if (eclaboussure) {
                                        this.eclabousser(point.x, point.y);
                                    }
                                    this.setPose("atterrit");
                                    // Réception : il s'écrase puis se redresse.
                                    this.tweens.addCounter({
                                        from: 0, to: 1, duration: 190, ease: "Sine.easeOut",
                                        onComplete: () => {
                                            this.setPose("repos");
                                            // Il garde le nez sur la suite du
                                            // trajet, pas sur ce qu'il quitte.
                                            this.orienterVersProchaineEtape();
                                            this.attendreCalmement();
                                            resolve();
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }

            feter() {
                if (this.reducedMotion || !this.dog) {
                    return;
                }
                this.arreterRespiration();
                this.setPose("celebre");
                const y = this.dog.y;
                this.tweens.add({
                    targets: this.dog,
                    y: y - this.tailleBase.height * 0.28,
                    duration: 220,
                    yoyo: true,
                    repeat: 1,
                    ease: "Sine.easeOut",
                    onComplete: () => this.attendreCalmement()
                });
            }

            // ---------- éclaboussure ----------

            buildSplash() {
                this.splash = this.add.particles(0, 0, "fr2-spark", {
                    // Gouttes projetées vers les côtés, très peu vers le haut :
                    // c'est de l'eau chassée par les pattes.
                    speedX: {min: -95, max: 95},
                    speedY: {min: -55, max: -15},
                    lifespan: 420,
                    quantity: 0,
                    scale: {start: 0.26, end: 0},
                    alpha: {start: 0.9, end: 0},
                    gravityY: 190,
                    tint: [0xffffff, 0xd0ecff, 0xa5d8ff],
                    emitting: false
                });
                this.splash.setDepth(DEPTH.eclaboussure);
            }

            // Deux petits jets sur les CÔTÉS des pattes, et rien d'autre.
            //
            // L'anneau qui s'ouvrait autour de la pierre est supprimé : c'était
            // encore un cercle, et il se confondait avec l'ancien repère de pierre
            // active. Une éclaboussure dit « il a touché », pas « regarde ici » —
            // durée de vie 420 ms, sous le demi-seconde demandé.
            eclabousser(x, y) {
                if (this.reducedMotion || !this.splash) {
                    return;
                }
                this.splash.emitParticleAt(x - 6, y, 5);
                this.splash.emitParticleAt(x + 6, y, 5);
            }

            // ---------- réactions aux événements pédagogiques ----------

            wireEvents() {
                const on = (name, handler) => {
                    this.unsubscribers.push(this.bus.on(name, handler));
                };
                on("journey:started", () => this.reset());
                on("step:completed", (payload) => this.advanceTo(payload));
                on("answer:correct", () => this.feter());
                // Une erreur ne déplace rien. Le chien reste où il est.
                on("answer:incorrect", () => this.attendreCalmement());
                on("journey:finale-started", () => this.arriverAuPonton());
            }

            unwireEvents() {
                this.unsubscribers.forEach((off) => off && off());
                this.unsubscribers = [];
            }

            reset() {
                this.completedSteps = 0;
                this.arreterRespiration();
                this.tweens.killTweensOf([this.dog, this.ombre]);
                this.eteindreToutesLesPierres();
                this.placerSur(this.anchors.ANCHORS.heroStart);
                // Dès le départ, il fixe la première pierre.
                this.orienterVersProchaineEtape();
                this.attendreCalmement();
            }

            advanceTo(payload) {
                const franchies = payload && Number.isInteger(payload.completedSteps)
                    ? payload.completedSteps
                    : 0;
                this.completedSteps = franchies;
                const appui = this.anchors.ANCHORS.stones[franchies - 1];
                if (!appui) {
                    return;
                }
                // Toutes les pierres gagnées s'allument, pas seulement la
                // dernière. Sans ça, une partie reprise à l'étape 3 n'aurait
                // qu'un seul appui éclairé et le trajet parcouru disparaîtrait.
                for (let index = 0; index < franchies; index += 1) {
                    this.allumerPierre(index);
                }
                this.time.delayedCall(this.reducedMotion ? 0 : 260, () => this.sauterVers(appui));
            }

            // L'arrivée : UN seul saut, de la pierre 5 vers le centre du bois.
            //
            // Il y avait deux sauts avant, par une « entrée » puis une « sortie »
            // de pont choisies à l'œil — et la seconde tombait à côté du tablier.
            // Le chien réussissait cinq fractions pour finir dans l'eau. Un seul
            // point d'arrivée, mesuré au centre du bois, supprime l'étape où il
            // pouvait manquer sa cible.
            //
            // Pas d'éclaboussure ici : il atterrit sur du bois, pas dans l'eau.
            arriverAuPonton() {
                // Il souffle un instant sur la pierre 5 avant le dernier saut.
                this.time.delayedCall(this.reducedMotion ? 0 : 420, () => {
                    this.sauterVers(this.anchors.ANCHORS.arrival, {eclaboussure: false})
                        .then(() => this.feter());
                });
            }

            // Ce que la scène contient réellement. Sert au contrôle « aucun objet
            // orphelin » : les nombres doivent être stables après plusieurs
            // entrées et sorties du mode immersif.
            inventaire() {
                return {
                    vagues: this.waves.length,
                    anneauxDEau: this.ripples.length,
                    reflets: this.glints.length,
                    poissons: this.fish.length,
                    oiseaux: this.birds.length,
                    marquesDePierre: this.stoneGlows.length,
                    marquesAllumees: this.stoneGlows.filter((c) => c.visible).length,
                    horsListe: this.horsListe.length,
                    objetsAffiches: this.children.list.length
                };
            }
        };
    }

    root.createPlayScene = createPlayScene;
    root.FRACTION_RIVER_V2_POSES = POSES;
})(typeof globalThis !== "undefined" ? globalThis : window);
