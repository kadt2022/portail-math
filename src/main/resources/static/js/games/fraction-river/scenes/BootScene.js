(function initializeBootScene(root) {
    "use strict";

    const EXPLORER_ASSET_PATH = "/images/games/fraction-river/explorer-boy.png";
    const EXPLORER_PADDLING_ASSET_PATH = "/images/games/fraction-river/explorer-boy-paddling.png";

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
                this.scene.start("RiverScene");
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
