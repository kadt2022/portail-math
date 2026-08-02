(function initializeFractionRiverGame(root) {
    "use strict";

    const CONTAINER_ID = "fraction-river-game";

    function prefersReducedMotion() {
        return typeof root.matchMedia === "function"
            && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Le jeu est facultatif : si Phaser manque ou si le navigateur ne sait pas
    // dessiner, la page reste entièrement jouable en HTML.
    function startFractionRiverGame(options = {}) {
        const Phaser = root.Phaser;
        const parent = root.document && root.document.getElementById(CONTAINER_ID);
        if (!Phaser || !parent) {
            return null;
        }

        const bus = options.bus || root.FractionRiverEvents;
        const reducedMotion = options.reducedMotion !== undefined
            ? Boolean(options.reducedMotion)
            : prefersReducedMotion();

        const view = root.FRACTION_RIVER_VIEW || {VIEW_WIDTH: 840, VIEW_HEIGHT: 320};
        const sceneData = {bus, reducedMotion};

        let game;
        try {
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent,
                width: view.VIEW_WIDTH,
                height: view.VIEW_HEIGHT,
                transparent: true,
                banner: false,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
                },
                fps: {target: 60},
                scene: [
                    root.createBootScene(Phaser),
                    root.createRiverScene(Phaser),
                    root.createResultScene(Phaser)
                ]
            });
        } catch (error) {
            console.warn("Scène Phaser indisponible, le jeu reste jouable en HTML :", error);
            return null;
        }

        game.scene.start("BootScene", sceneData);
        game.events.once("ready", () => {
            game.scene.start("RiverScene", sceneData);
            game.scene.run("ResultScene", sceneData);
        });

        parent.setAttribute("aria-hidden", "true");
        return game;
    }

    root.startFractionRiverGame = startFractionRiverGame;
    root.FRACTION_RIVER_CONTAINER_ID = CONTAINER_ID;
})(typeof globalThis !== "undefined" ? globalThis : window);
