(function initializeFractionRiverGame(root) {
    "use strict";

    // Amorçage de la scène de La Rivière des fractions.
    //
    // Le décor n'est plus construit par le code. Il était fait d'ellipses, de
    // rectangles et de triangles — un arbre valait trois ellipses empilées, un
    // village un rectangle et un triangle — et cette manière de faire avait
    // atteint sa limite : toute retouche esthétique se réglait en modifiant des
    // nombres dans une classe de cinq cents lignes.
    //
    // Trois couches, désormais :
    //
    //   couche 1  une illustration peinte, en <img>, 16/9
    //   couche 2  ce canvas Phaser, transparent : chien, eau, oiseaux, poissons
    //   couche 3  les questions, en HTML, hors de ce fichier
    //
    // Les positions ne sont plus calculées : elles sont déclarées en
    // pourcentages dans v2/anchors.js, relevés par analyse des pixels de
    // l'illustration. Recadrer l'image invalide ces nombres.

    const CONTAINER_ID = "fraction-river-game";
    const BACKGROUND_PATH = "/images/games/fraction-river/river-scene.png";

    function prefersReducedMotion() {
        return typeof root.matchMedia === "function"
            && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Couche 1. L'illustration est insérée devant le canvas, une seule fois.
    function poserIllustration(doc, parent) {
        parent.classList.add("fraction-river-illustrated");
        if (parent.querySelector(".fraction-river-illustrated__background")) {
            return;
        }
        const fond = doc.createElement("img");
        fond.className = "fraction-river-illustrated__background";
        fond.src = BACKGROUND_PATH;
        fond.alt = "";
        fond.setAttribute("aria-hidden", "true");
        parent.insertBefore(fond, parent.firstChild);
    }

    // Le jeu est facultatif : si Phaser manque ou si le navigateur ne sait pas
    // dessiner, la page reste entièrement jouable en HTML.
    function startFractionRiverGame(options = {}) {
        const Phaser = root.Phaser;
        const doc = root.document;
        const parent = doc && doc.getElementById(CONTAINER_ID);
        const anchors = root.FractionRiverAnchors;
        if (!parent || !anchors) {
            return null;
        }

        // L'illustration est posée même sans Phaser : un décor fixe vaut mieux
        // qu'un cadre vide, et il ne coûte rien.
        poserIllustration(doc, parent);
        if (!Phaser || typeof root.createPlayScene !== "function") {
            return null;
        }

        const bus = options.bus || root.FractionRiverEvents;
        const reducedMotion = options.reducedMotion !== undefined
            ? Boolean(options.reducedMotion)
            : prefersReducedMotion();

        const monde = anchors.WORLD;
        const echelle = anchors.RENDER_SCALE;

        const hote = doc.createElement("div");
        hote.className = "fraction-river-illustrated__phaser";
        parent.appendChild(hote);

        let game;
        try {
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent: hote,
                width: monde.width * echelle,
                height: monde.height * echelle,
                // Sans transparence, le canvas recouvrirait l'illustration.
                // C'est la condition de toute l'architecture.
                transparent: true,
                banner: false,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                fps: {target: 60},
                scene: [root.createPlayScene(Phaser)]
            });
        } catch (error) {
            console.warn("Scène Phaser indisponible, le jeu reste jouable en HTML :", error);
            return null;
        }

        game.scene.start("PlayScene", {bus, reducedMotion});
        parent.setAttribute("aria-hidden", "true");

        // Recadrage du canvas sur l'illustration.
        //
        // getParentBounds() avant refresh() : Phaser ne relit la taille de son
        // parent que dans sa boucle de jeu, et cette boucle ne produit aucune
        // image dans un onglet en arrière-plan. Sans cette lecture, refresh()
        // recadre sur une mesure périmée et le canvas se décale de plusieurs
        // centaines de pixels par rapport au dessin.
        function recadrer() {
            if (!game.scale) {
                return;
            }
            game.scale.getParentBounds();
            game.scale.refresh();
        }

        // Deux délais plutôt qu'un requestAnimationFrame : à l'amorçage, la
        // hauteur du cadre vient de son aspect-ratio et n'est pas toujours
        // résolue. Phaser mesure alors un parent de 0 x 0, pose un canvas de
        // 0 px, et — rien ne changeant ensuite de taille — ne remesure jamais.
        // Et dans un onglet qui ne compose pas d'image, rAF ne se déclenche pas.
        function armer() {
            recadrer();
            if (typeof root.ResizeObserver === "function") {
                new root.ResizeObserver(() => recadrer()).observe(parent);
            }
            root.setTimeout(recadrer, 240);
        }

        root.addEventListener("resize", recadrer);
        root.addEventListener("orientationchange", () => root.setTimeout(recadrer, 120));
        if (game.isBooted) {
            armer();
        } else {
            game.events.once("ready", () => root.setTimeout(armer, 60));
        }

        // Il n'y a plus deux géométries à choisir : l'illustration est unique et
        // la scène ne se reconstruit plus. Ce que la console immersive demandait
        // en changeant de profil, c'était en réalité un recadrage — et c'est tout
        // ce qu'il reste ici. La signature est conservée pour que
        // fraction-river.js n'ait pas à savoir que le décor a changé de nature.
        function setLayoutMode() {
            root.setTimeout(recadrer, 80);
            return "illustrated";
        }

        const controller = {
            game,
            setLayoutMode,
            recadrer,
            get layoutMode() {
                return "illustrated";
            }
        };

        root.fractionRiverGame = game;
        root.fractionRiverGameController = controller;
        return controller;
    }

    root.startFractionRiverGame = startFractionRiverGame;
    root.FRACTION_RIVER_CONTAINER_ID = CONTAINER_ID;
    root.FRACTION_RIVER_BACKGROUND_PATH = BACKGROUND_PATH;
})(typeof globalThis !== "undefined" ? globalThis : window);
