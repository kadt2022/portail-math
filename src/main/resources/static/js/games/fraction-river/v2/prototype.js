(function initializeFractionRiverLayers(root) {
    "use strict";

    // Plomberie des trois couches. Ce fichier ne crée pas le jeu — c'est play.js
    // qui le fait — il garde les couches alignées :
    //
    //   couche 1  l'illustration, en <img> plein cadre, 16/9
    //   couche 2  le canvas Phaser transparent, aux mêmes proportions
    //   couche 3  la question en HTML, posée sur le panneau peint
    //
    // Tout est aligné par des pourcentages. La seule chose que cette plomberie
    // doit garantir, c'est que la couche 2 reste collée au dessin de la couche 1
    // dans toutes les tailles et après chaque bascule de mode.

    const CONTAINER = "[data-river-v2]";

    function attachLayers(game) {
        const doc = root.document;
        const bloc = doc.querySelector(CONTAINER);
        const anchors = root.FractionRiverAnchors;
        if (!bloc || !anchors || !game) {
            return null;
        }

        // Le relevé vit HORS du cadre 16/9 : il ne doit rien recouvrir. Le
        // chercher dans le bloc ne donnait rien, et la mesure restait muette
        // sans que rien ne signale l'erreur.
        const mesure = doc.querySelector("[data-river-v2-readout]");

        // Le relevé n'est pas décoratif : c'est lui qui dit si le héros reste
        // lisible sur un téléphone, et si le canvas suit bien l'image.
        function rafraichirMesure() {
            if (!mesure || !game.canvas) {
                return;
            }
            const cadre = bloc.getBoundingClientRect();
            const toile = game.canvas.getBoundingClientRect();
            const heros = anchors.heroScreenSize(cadre.width, cadre.height);
            const rapportCadre = cadre.height ? cadre.width / cadre.height : 0;
            const derive = Math.round(Math.abs(toile.width - cadre.width))
                + Math.round(Math.abs(toile.height - cadre.height));

            mesure.textContent = [
                `cadre ${Math.round(cadre.width)} × ${Math.round(cadre.height)}`,
                `(${rapportCadre.toFixed(3)} — cible 1.778)`,
                `· canvas ${Math.round(toile.width)} × ${Math.round(toile.height)}`,
                `· écart ${derive} px`,
                `· héros ${heros.width} × ${heros.height} px`
            ].join(" ");
        }

        // Phaser recalcule tout seul sur redimensionnement de fenêtre, mais pas
        // quand c'est le DOM qui bouge autour de lui — l'entrée en mode immersif
        // déplace le bloc entier. Il faut alors le lui dire.
        function replacer() {
            if (!game.scale) {
                return;
            }
            // Relire la taille du parent AVANT de recadrer. Phaser ne la relit
            // que dans sa boucle de jeu, et cette boucle ne produit aucune image
            // dans un onglet qui ne compose pas — arrière-plan, volet fermé.
            // Sans cette ligne, refresh() recadre sur une mesure périmée : le
            // canvas gardait sa taille d'avant, décalé de plusieurs centaines
            // de pixels par rapport à l'illustration.
            game.scale.getParentBounds();
            game.scale.refresh();
            rafraichirMesure();
        }

        // Un recadrage après l'amorçage, et ce n'est pas une précaution : sur le
        // premier chargement, Phaser a mesuré un parent de 0 x 0 et posé un
        // canvas de 0 px. Rien ne changeant de taille ensuite, il n'a jamais
        // remesuré, et le canvas est resté invisible. Le défaut est
        // intermittent — raison de plus pour recadrer sans condition.
        //
        // Deux délais, pas un requestAnimationFrame : dans un onglet qui ne
        // compose pas d'image, rAF ne se déclenche jamais, et le recadrage ne
        // démarrait pas du tout.
        function armer() {
            replacer();
            if (typeof root.ResizeObserver === "function") {
                new root.ResizeObserver(() => replacer()).observe(bloc);
            }
            root.setTimeout(replacer, 240);
        }

        root.addEventListener("resize", replacer);
        root.addEventListener("orientationchange", () => root.setTimeout(replacer, 120));
        if (game.isBooted) {
            armer();
        } else {
            game.events.once("ready", () => root.setTimeout(armer, 60));
        }

        const consoleController = brancherConsole(doc, bloc, replacer);
        return {replacer, gameConsole: consoleController};
    }

    // La console immersive déplaçait deux zones : la scène d'un côté, le panneau
    // de questions de l'autre. Dans cette architecture il n'y a plus qu'un bloc,
    // la question vivant DANS l'image. On lui donne donc un panneau vide.
    //
    // C'est un constat, pas une astuce : le modèle à deux zones de la console est
    // périmé par cette architecture, et il lui faudra un mode à une seule zone.
    // Mesuré sur un écran de 740 x 360, le créneau du panneau retient 277 px de
    // large pour ne rien afficher, et le héros tombe de 52 à 24 pixels.
    function brancherConsole(doc, bloc, replacer) {
        const GameConsole = root.GameConsole;
        const consoleElement = doc.querySelector("[data-game-console]");
        if (!GameConsole || !consoleElement) {
            return null;
        }

        // La console laisse un repère à la place de chaque élément déplacé, pour
        // le rendre exactement où il était. Elle exige donc que les deux soient
        // déjà DANS le document : un panneau détaché la fait échouer sur
        // panel.parentNode. Le placeholder est donc inséré, puis caché.
        const panneauVide = doc.createElement("div");
        panneauVide.hidden = true;
        panneauVide.setAttribute("data-river-v2-panel-placeholder", "");
        bloc.parentNode.insertBefore(panneauVide, bloc.nextSibling);

        return GameConsole.createGameConsole({
            document: doc,
            console: consoleElement,
            stageSlot: doc.querySelector("[data-console-stage]"),
            panelSlot: doc.querySelector("[data-console-panel]"),
            stage: bloc,
            panel: panneauVide,
            launchButton: doc.querySelector("[data-console-launch]"),
            quitButton: doc.querySelector("[data-console-quit]"),
            // Le bloc vient de changer de parent : ses dimensions ne sont
            // connues qu'au tour suivant du moteur de rendu.
            onEnter: () => root.setTimeout(replacer, 80),
            onExit: () => root.setTimeout(replacer, 80)
        });
    }

    root.attachFractionRiverLayers = attachLayers;
})(typeof globalThis !== "undefined" ? globalThis : window);
