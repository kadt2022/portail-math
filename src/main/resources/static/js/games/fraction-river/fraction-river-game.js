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

        const layouts = root.FractionRiverLayouts;
        const echelle = root.FRACTION_RIVER_RENDER_SCALE || 2;

        const profilInitial = layouts.createLayout("panoramic");
        const sceneData = {bus, reducedMotion, layout: profilInitial.name};

        let game;
        try {
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent,
                width: profilInitial.width * echelle,
                height: profilInitial.height * echelle,
                transparent: true,
                banner: false,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
                },
                fps: {target: 60},
                // Plus de bandeau de texte dessiné dans le canvas : le message
                // de fin vit dans le panneau HTML, net à tous les zooms et
                // lisible par un lecteur d'écran.
                scene: [
                    root.createBootScene(Phaser),
                    root.createRiverScene(Phaser)
                ]
            });
        } catch (error) {
            console.warn("Scène Phaser indisponible, le jeu reste jouable en HTML :", error);
            return null;
        }

        game.scene.start("BootScene", sceneData);
        game.events.once("ready", () => {
            game.scene.start("RiverScene", sceneData);
        });

        parent.setAttribute("aria-hidden", "true");

        // Seul contrat offert à l'extérieur. La scène ignore le plein écran,
        // l'orientation et le navigateur : elle ne reçoit qu'un nom de profil.
        function sceneCourante() {
            return game.scene.getScene("RiverScene");
        }

        // Aucun mode n'est mémorisé ici : la scène est la seule source de
        // vérité. Un état dupliqué avait divergé du sien, et la garde d'égalité
        // empêchait alors une reconstruction sur deux.
        function modeCourant() {
            const scene = sceneCourante();
            return scene && scene.layout ? scene.layout.name : profilInitial.name;
        }

        function setLayoutMode(nom) {
            const profil = layouts.createLayout(nom);
            const scene = sceneCourante();
            if (!scene || typeof scene.applyLayout !== "function") {
                return null;
            }
            if (scene.layout && scene.layout.name === profil.name) {
                return profil.name;
            }

            // La progression logique voyage d'un profil à l'autre : le héros se
            // replace sur l'appui déjà gagné, sans rejouer la moindre animation.
            const progression = typeof scene.progressSnapshot === "function"
                ? scene.progressSnapshot()
                : {completedSteps: 0};

            // La scène se reconstruit sur place : les écouteurs du bus ne sont
            // ni retirés ni repris, aucun second canvas n'est créé.
            game.scale.setGameSize(profil.width * echelle, profil.height * echelle);
            scene.applyLayout(profil.name, progression);
            // Le rafraîchissement vient après que le DOM a recalculé la taille
            // du conteneur, sinon Phaser mesure l'ancienne disposition.
            root.setTimeout(() => game.scale.refresh(), 60);
            return profil.name;
        }

        const controller = {
            game,
            setLayoutMode,
            get layoutMode() {
                return modeCourant();
            }
        };

        root.fractionRiverGame = game;
        root.fractionRiverGameController = controller;
        return controller;
    }

    root.startFractionRiverGame = startFractionRiverGame;
    root.FRACTION_RIVER_CONTAINER_ID = CONTAINER_ID;
})(typeof globalThis !== "undefined" ? globalThis : window);
