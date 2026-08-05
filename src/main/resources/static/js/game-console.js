(function initializeGameConsole(root) {
    "use strict";

    // Console de jeu immersive, partagée par tous les jeux du portail.
    // Elle ne connaît ni Phaser, ni Babylon, ni le contenu pédagogique : elle
    // déplace deux zones du document dans une disposition plein écran, puis les
    // rend exactement à leur place d'origine.
    //
    // Le mode ne dépend jamais du succès du plein écran ni du verrouillage de
    // l'orientation : ces deux demandes sont des bonus, refusés par plusieurs
    // navigateurs, notamment Safari sur iPhone.

    function createGameConsole(options) {
        const doc = options.document || root.document;
        const consoleElement = options.console;
        const stageSlot = options.stageSlot;
        const panelSlot = options.panelSlot;
        const stage = options.stage;
        const panel = options.panel;
        const launchButton = options.launchButton;
        const quitButton = options.quitButton;

        if (!consoleElement || !stageSlot || !panelSlot || !stage || !panel) {
            return null;
        }

        // Repères laissés à la place des éléments déplacés, pour les remettre
        // exactement où ils étaient — et non à la fin de leur parent.
        const stageAnchor = doc.createComment("emplacement de la scène");
        const panelAnchor = doc.createComment("emplacement des questions");

        let active = false;
        let previousFocus = null;
        const detachers = [];

        function estPleinEcran() {
            return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
        }

        function demanderPleinEcran() {
            const demande = consoleElement.requestFullscreen
                || consoleElement.webkitRequestFullscreen;
            if (typeof demande !== "function") {
                return Promise.reject(new Error("plein écran non supporté"));
            }
            try {
                const resultat = demande.call(consoleElement);
                return resultat && typeof resultat.then === "function"
                    ? resultat
                    : Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            }
        }

        function quitterPleinEcran() {
            if (!estPleinEcran()) {
                return Promise.resolve();
            }
            const sortie = doc.exitFullscreen || doc.webkitExitFullscreen;
            if (typeof sortie !== "function") {
                return Promise.resolve();
            }
            try {
                const resultat = sortie.call(doc);
                return resultat && typeof resultat.then === "function"
                    ? resultat.catch(() => {})
                    : Promise.resolve();
            } catch (error) {
                return Promise.resolve();
            }
        }

        // Le verrouillage n'est possible qu'en plein écran, et seulement sur
        // certains navigateurs mobiles. Un échec n'a aucune conséquence : le
        // message « tourne ton téléphone » prend le relais.
        function verrouillerPaysage() {
            const orientation = root.screen && root.screen.orientation;
            if (!orientation || typeof orientation.lock !== "function") {
                return Promise.resolve(false);
            }
            try {
                const resultat = orientation.lock("landscape");
                return resultat && typeof resultat.then === "function"
                    ? resultat.then(() => true).catch(() => false)
                    : Promise.resolve(true);
            } catch (error) {
                return Promise.resolve(false);
            }
        }

        function deverrouillerOrientation() {
            const orientation = root.screen && root.screen.orientation;
            if (orientation && typeof orientation.unlock === "function") {
                try {
                    orientation.unlock();
                } catch (error) {
                    // Rien à faire : l'orientation reprend son comportement normal.
                }
            }
        }

        function ecouter(cible, evenement, gestionnaire, options2) {
            cible.addEventListener(evenement, gestionnaire, options2);
            detachers.push(() => cible.removeEventListener(evenement, gestionnaire, options2));
        }

        function focusSansDefilement(element) {
            if (!element || typeof element.focus !== "function") {
                return;
            }
            try {
                element.focus({preventScroll: true});
            } catch (error) {
                element.focus();
            }
        }

        function enter() {
            if (active) {
                return;
            }
            active = true;
            previousFocus = doc.activeElement;

            stage.parentNode.insertBefore(stageAnchor, stage);
            panel.parentNode.insertBefore(panelAnchor, panel);
            stageSlot.appendChild(stage);
            panelSlot.appendChild(panel);

            consoleElement.hidden = false;
            doc.documentElement.classList.add("is-game-console");
            doc.body.classList.add("is-game-console");

            // Le plein écran et l'orientation sont demandés après coup : même
            // refusés, la disposition immersive est déjà en place.
            demanderPleinEcran()
                .then(() => verrouillerPaysage())
                .catch(() => false);

            ecouter(doc, "fullscreenchange", surChangementPleinEcran);
            ecouter(doc, "webkitfullscreenchange", surChangementPleinEcran);
            ecouter(doc, "keydown", surTouche);
            ecouter(doc, "visibilitychange", surVisibilite);

            focusSansDefilement(options.focusOnEnter || quitButton);

            if (typeof options.onEnter === "function") {
                options.onEnter();
            }
        }

        function exit() {
            if (!active) {
                return;
            }
            active = false;

            detachers.splice(0).forEach((detacher) => detacher());

            deverrouillerOrientation();
            quitterPleinEcran();

            if (stageAnchor.parentNode) {
                stageAnchor.parentNode.insertBefore(stage, stageAnchor);
                stageAnchor.parentNode.removeChild(stageAnchor);
            }
            if (panelAnchor.parentNode) {
                panelAnchor.parentNode.insertBefore(panel, panelAnchor);
                panelAnchor.parentNode.removeChild(panelAnchor);
            }

            consoleElement.hidden = true;
            doc.documentElement.classList.remove("is-game-console");
            doc.body.classList.remove("is-game-console");

            focusSansDefilement(launchButton || previousFocus);

            if (typeof options.onExit === "function") {
                options.onExit();
            }
        }

        // Sortie native du plein écran : bouton du navigateur, geste système,
        // ou touche Échap interceptée par le navigateur lui-même.
        function surChangementPleinEcran() {
            if (active && !estPleinEcran()) {
                exit();
            }
        }

        function surTouche(evenement) {
            if (active && evenement.key === "Escape") {
                exit();
            }
        }

        // Changement d'onglet ou passage en arrière-plan : on rend la main.
        function surVisibilite() {
            if (active && doc.hidden) {
                exit();
            }
        }

        if (launchButton) {
            launchButton.addEventListener("click", enter);
        }
        if (quitButton) {
            quitButton.addEventListener("click", exit);
        }

        return {
            enter,
            exit,
            get isActive() {
                return active;
            }
        };
    }

    const api = {createGameConsole};

    root.GameConsole = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
