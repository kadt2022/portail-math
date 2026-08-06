(function initializeCalibrationScene(root) {
    "use strict";

    // Scène de calibrage. Elle ne dessine ni héros, ni pierres : l'illustration
    // les porte déjà, et les dupliquer donnerait deux garçons et dix pierres.
    // Elle ne pose que des repères, pour répondre à une seule question :
    //
    //   les ancrages tombent-ils sur ce qui est peint ?
    //
    // La grille en pourcentage est là pour qu'on puisse LIRE la bonne valeur,
    // pas seulement constater l'erreur. On lit le centre réel d'une pierre sur
    // la grille, on le recopie dans anchors.js, on recharge.

    const CROSS_ARM = 14;
    const GRID_STEP = 0.05;
    const LABEL_STEP = 0.1;

    function createCalibrationScene(Phaser) {
        return class CalibrationScene extends Phaser.Scene {
            constructor() {
                super({key: "CalibrationScene"});
            }

            init(data) {
                this.anchors = root.FractionRiverAnchors;
                this.showGrid = !(data && data.showGrid === false);
            }

            create() {
                const monde = this.anchors.WORLD;
                this.cameras.main.setZoom(this.anchors.RENDER_SCALE);
                this.cameras.main.centerOn(monde.width / 2, monde.height / 2);

                if (this.showGrid) {
                    this.drawGrid();
                }
                this.drawPlayAreaLimit();
                this.drawQuestionZone();
                this.drawJourney();
                this.drawStones();
                this.drawPoint(this.anchors.ANCHORS.heroStart, "départ", 0xff6b00);
                this.drawPoint(this.anchors.ANCHORS.bridgeEntry, "pont ↑", 0x7048e8);
                this.drawPoint(this.anchors.ANCHORS.bridgeExit, "coffre", 0x7048e8);
                this.drawHeroBox();
            }

            // ---------- repères de mesure ----------

            drawGrid() {
                const monde = this.anchors.WORLD;
                const grille = this.add.graphics();
                grille.setDepth(1);
                grille.lineStyle(0.5, 0xffffff, 0.35);

                for (let part = GRID_STEP; part < 1; part += GRID_STEP) {
                    const x = Math.round(part * monde.width);
                    const y = Math.round(part * monde.height);
                    grille.lineBetween(x, 0, x, monde.height);
                    grille.lineBetween(0, y, monde.width, y);
                }

                // Les graduations en dizaines sont chiffrées : c'est avec elles
                // qu'on relève une position, pas avec les fines.
                for (let part = LABEL_STEP; part < 1; part += LABEL_STEP) {
                    const pourcent = Math.round(part * 100);
                    this.label(Math.round(part * monde.width), 8, `${pourcent}`, 0xffffff);
                    this.label(12, Math.round(part * monde.height), `${pourcent}`, 0xffffff);
                }
            }

            // Frontière du panneau de question : à droite, le HTML passe devant.
            drawPlayAreaLimit() {
                const monde = this.anchors.WORLD;
                const x = this.anchors.PLAY_AREA_RIGHT * monde.width;
                const trait = this.add.graphics();
                trait.setDepth(2);
                trait.lineStyle(2, 0xff0000, 0.5);
                trait.lineBetween(x, 0, x, monde.height);
            }

            drawQuestionZone() {
                const zone = this.anchors.toWorldRect(this.anchors.ANCHORS.questionPanel);
                const cadre = this.add.graphics();
                cadre.setDepth(2);
                cadre.lineStyle(2, 0x2f9e44, 0.9);
                cadre.strokeRect(zone.x, zone.y, zone.width, zone.height);
                this.label(zone.x + 6, zone.y + 12, "zone question (CSS)", 0x2f9e44);
            }

            // La ligne que le décor doit laisser lisible. Si elle traverse un
            // buisson peint, c'est l'illustration qu'il faut reprendre.
            drawJourney() {
                const points = this.anchors.journey();
                const trace = this.add.graphics();
                trace.setDepth(3);
                trace.lineStyle(3, 0xffd43b, 0.75);
                trace.beginPath();
                trace.moveTo(points[0].x, points[0].y);
                points.slice(1).forEach((point) => trace.lineTo(point.x, point.y));
                trace.strokePath();
            }

            drawStones() {
                this.anchors.ANCHORS.stones.forEach((appui, index) => {
                    const point = this.anchors.toWorld(appui);
                    this.cross(point.x, point.y, 0x1971c2);
                    this.badge(point.x, point.y - CROSS_ARM - 10, String(index + 1));
                    this.label(
                        point.x + CROSS_ARM + 4,
                        point.y + 4,
                        `${(appui.xRatio * 100).toFixed(1)} / ${(appui.yRatio * 100).toFixed(1)}`,
                        0xffffff
                    );
                });
            }

            drawPoint(anchor, texte, couleur) {
                const point = this.anchors.toWorld(anchor);
                this.cross(point.x, point.y, couleur);
                this.label(point.x + CROSS_ARM + 4, point.y + 4, texte, couleur);
            }

            // Le héros n'est pas dessiné, mais son encombrement l'est : c'est la
            // place qu'il faudra, et donc ce que le décor ne doit pas remplir.
            drawHeroBox() {
                [this.anchors.ANCHORS.heroStart]
                    .concat(this.anchors.ANCHORS.stones)
                    .forEach((anchor) => {
                        const point = this.anchors.toWorld(anchor);
                        const taille = this.anchors.heroSizeAt(anchor);
                        const boite = this.add.graphics();
                        boite.setDepth(3);
                        boite.lineStyle(1, 0xff6b00, 0.6);
                        boite.strokeRect(
                            point.x - taille.width / 2,
                            point.y - taille.height,
                            taille.width,
                            taille.height
                        );
                    });
            }

            // ---------- primitives de dessin ----------

            cross(x, y, couleur) {
                const croix = this.add.graphics();
                croix.setDepth(5);
                croix.lineStyle(3, 0x000000, 0.5);
                croix.lineBetween(x - CROSS_ARM, y, x + CROSS_ARM, y);
                croix.lineBetween(x, y - CROSS_ARM, x, y + CROSS_ARM);
                croix.lineStyle(1.5, couleur, 1);
                croix.lineBetween(x - CROSS_ARM, y, x + CROSS_ARM, y);
                croix.lineBetween(x, y - CROSS_ARM, x, y + CROSS_ARM);
                croix.fillStyle(couleur, 1);
                croix.fillCircle(x, y, 2.5);
            }

            badge(x, y, texte) {
                const pastille = this.add.circle(x, y, 9, 0x1971c2);
                pastille.setDepth(5);
                const chiffre = this.add.text(x, y, texte, {
                    fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
                    fontSize: "11px",
                    color: "#ffffff",
                    fontStyle: "bold"
                });
                chiffre.setOrigin(0.5);
                chiffre.setDepth(6);
            }

            label(x, y, texte, couleur) {
                const etiquette = this.add.text(x, y, texte, {
                    fontFamily: "Inter, Segoe UI, Roboto, sans-serif",
                    fontSize: "9px",
                    color: Phaser.Display.Color.IntegerToColor(couleur).rgba,
                    stroke: "#000000",
                    strokeThickness: 3
                });
                etiquette.setOrigin(0, 0.5);
                etiquette.setDepth(6);
                return etiquette;
            }
        };
    }

    root.createCalibrationScene = createCalibrationScene;
})(typeof globalThis !== "undefined" ? globalThis : window);
