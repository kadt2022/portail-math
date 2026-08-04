(function initializeBootScene(root) {
    "use strict";

    const EXPLORER_ASSET_PATH = "/images/games/fraction-river/explorer-boy.png";
    const EXPLORER_PADDLING_ASSET_PATH = "/images/games/fraction-river/explorer-boy-paddling.png";
    // Mesurés au pixel sur explorer-boy.png (1024x1536) : le short s'arrête à
    // la ligne 1044, les jambes se séparent à 1056, et l'ensemble des jambes est
    // centré sur x = 526.
    const HIP_RATIO = 0.684;
    const STRIDE_MIRROR_RATIO = 0.514;

    function createBootScene(Phaser) {
        return class BootScene extends Phaser.Scene {
            constructor() {
                super({key: "BootScene"});
            }

            preload() {
                this.load.image("fr-explorer-boy", EXPLORER_ASSET_PATH);
                this.load.image("fr-explorer-boy-paddling", EXPLORER_PADDLING_ASSET_PATH);
            }

            create() {
                this.buildSparkTexture();
                this.buildWaterTexture();
                this.buildOppositeStrideTexture();
                this.scene.start("RiverScene");
            }

            // Le dessin montre déjà une foulée : une jambe devant, l'autre
            // derrière. En miroitant la seule moitié basse, on obtient la
            // foulée inverse — donc un vrai cycle de marche à deux images,
            // dessiné dans le trait de l'illustration d'origine.
            buildOppositeStrideTexture() {
                if (this.textures.exists("fr-explorer-boy-step")) {
                    return;
                }
                const source = this.textures.get("fr-explorer-boy").getSourceImage();
                const width = source.width;
                const height = source.height;
                if (!width || !height) {
                    return;
                }

                // Ligne de séparation des jambes et axe de symétrie, mesurés au
                // pixel sur explorer-boy.png.
                const hanche = Math.round(height * HIP_RATIO);
                const axe = Math.round(width * STRIDE_MIRROR_RATIO);

                const texture = this.textures.createCanvas("fr-explorer-boy-step", width, height);
                if (!texture) {
                    return;
                }
                const ctx = texture.getContext();
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(source, 0, 0, width, hanche, 0, 0, width, hanche);
                ctx.save();
                ctx.translate(axe * 2, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    source,
                    0, hanche, width, height - hanche,
                    0, hanche, width, height - hanche
                );
                ctx.restore();
                texture.refresh();
            }

            buildSparkTexture() {
                if (this.textures.exists("fr-spark")) {
                    return;
                }
                const graphics = this.make.graphics({x: 0, y: 0, add: false});
                graphics.fillStyle(0xffffff, 1);
                graphics.fillCircle(6, 6, 6);
                graphics.generateTexture("fr-spark", 12, 12);
                graphics.destroy();
            }

            buildWaterTexture() {
                if (this.textures.exists("fr-water")) {
                    return;
                }
                const width = 128;
                const height = 64;
                const graphics = this.make.graphics({x: 0, y: 0, add: false});
                graphics.fillStyle(0x2a86c4, 1);
                graphics.fillRect(0, 0, width, height);
                graphics.fillStyle(0x3a9bd6, 1);
                graphics.fillRect(0, 10, width, 6);
                graphics.fillStyle(0x1f6ea8, 1);
                graphics.fillRect(0, 34, width, 5);
                graphics.fillStyle(0xffffff, 0.22);
                graphics.fillRect(8, 4, 34, 3);
                graphics.fillRect(70, 22, 28, 3);
                graphics.fillRect(40, 46, 30, 3);
                graphics.generateTexture("fr-water", width, height);
                graphics.destroy();
            }
        };
    }

    root.createBootScene = createBootScene;
    root.FRACTION_RIVER_EXPLORER_ASSET_PATH = EXPLORER_ASSET_PATH;
    root.FRACTION_RIVER_EXPLORER_PADDLING_ASSET_PATH = EXPLORER_PADDLING_ASSET_PATH;
})(typeof globalThis !== "undefined" ? globalThis : window);
