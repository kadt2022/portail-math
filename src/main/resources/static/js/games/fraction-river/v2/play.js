(function initializeFractionRiverPlay(root) {
    "use strict";

    // La couche 3, jouable. Elle réutilise TOUT le moteur pédagogique existant :
    // les questions, les visuels, les distracteurs, les indices. Rien n'a été
    // réécrit — c'était le point à ne pas perdre, et il est tenu.
    //
    //   FractionRiverQuestions.createLevel1Steps()  les cinq défis
    //   FractionRiverVisuals.renderStaticVisual()   les disques et les barres
    //   FractionRiverEvents                         le bus vers Phaser
    //
    // Le HTML pose les questions, Phaser fait bouger le héros, l'illustration
    // porte le décor. Aucune des trois couches ne connaît les autres autrement
    // que par le bus et par la grille d'ancrage.

    const CONTAINER = "[data-river-v2]";

    function readFlag(search, name) {
        return new URLSearchParams(search || "").get(name) === "true";
    }

    function prefersReducedMotion() {
        return typeof root.matchMedia === "function"
            && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function startPlay() {
        const doc = root.document;
        const bloc = doc.querySelector(CONTAINER);
        const anchors = root.FractionRiverAnchors;
        const questions = root.FractionRiverQuestions;
        const visuals = root.FractionRiverVisuals;
        const bus = root.FractionRiverEvents;
        const Phaser = root.Phaser;

        if (!bloc || !anchors || !questions || !visuals || !bus) {
            return null;
        }

        const vue = {
            etape: bloc.querySelector("[data-v2-step]"),
            titre: bloc.querySelector("[data-v2-prompt]"),
            visuel: bloc.querySelector("[data-v2-visual]"),
            reponses: bloc.querySelector("[data-v2-answers]"),
            retour: bloc.querySelector("[data-v2-feedback]"),
            valider: bloc.querySelector("[data-v2-validate]"),
            rejouer: bloc.querySelector("[data-v2-replay]")
        };

        const reducedMotion = prefersReducedMotion();
        const showAnchors = readFlag(root.location && root.location.search, "debugAnchors");

        let game = null;
        if (Phaser) {
            const parent = bloc.querySelector("[data-river-v2-phaser]");
            const monde = anchors.WORLD;
            const scenes = [root.createPlayScene(Phaser)];
            if (showAnchors && root.createCalibrationScene) {
                scenes.push(root.createCalibrationScene(Phaser));
            }
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent,
                width: monde.width * anchors.RENDER_SCALE,
                height: monde.height * anchors.RENDER_SCALE,
                transparent: true,
                banner: false,
                scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
                scene: scenes
            });
            game.scene.start("PlayScene", {bus, reducedMotion});
            if (showAnchors && root.createCalibrationScene) {
                game.scene.start("CalibrationScene", {showGrid: true});
            }
        }

        // ---------- état de la partie ----------

        let etapes = [];
        let index = 0;
        let selection = new Set();
        let dejaRate = false;

        function demarrer() {
            etapes = questions.createLevel1Steps();
            index = 0;
            bus.emit("journey:started", {});
            if (vue.rejouer) {
                vue.rejouer.hidden = true;
            }
            afficherEtape();
        }

        function etapeCourante() {
            return etapes[index];
        }

        function afficherEtape() {
            const etape = etapeCourante();
            selection = new Set();
            dejaRate = false;

            vue.etape.textContent = `Étape ${index + 1} sur ${etapes.length}`;
            vue.titre.textContent = etape.prompt;
            vue.retour.textContent = "";
            vue.retour.dataset.tone = "";
            vue.reponses.innerHTML = "";
            vue.visuel.innerHTML = "";
            vue.valider.hidden = true;

            if (etape.type === "SELECT_PARTS") {
                afficherPartsCliquables(etape);
            } else {
                if (etape.visual) {
                    vue.visuel.innerHTML = visuals.renderStaticVisual({
                        ...etape.visual,
                        id: `v2-${index}`
                    });
                }
                afficherOptions(etape);
            }

            bus.emit("step:rendered", {index, id: etape.id});
        }

        function afficherOptions(etape) {
            etape.options.forEach((option, rang) => {
                const bouton = doc.createElement("button");
                bouton.type = "button";
                if (option.visual) {
                    // MATCH_VISUAL : c'est le dessin qui est la réponse.
                    bouton.classList.add("est-visuel");
                    bouton.innerHTML = visuals.renderStaticVisual({
                        ...option.visual,
                        id: `v2-${index}-${rang}`
                    });
                    bouton.setAttribute("aria-label", `Proposition ${rang + 1}`);
                } else {
                    bouton.textContent = option.label;
                }
                bouton.addEventListener("click", () => repondre(option, bouton));
                vue.reponses.appendChild(bouton);
            });
        }

        function afficherPartsCliquables(etape) {
            vue.visuel.innerHTML = visuals.renderInteractiveParts({
                kind: etape.visualKind,
                total: etape.totalParts,
                selected: []
            });
            vue.valider.hidden = false;
            vue.valider.onclick = () => validerParts(etape);

            vue.visuel.querySelectorAll("[data-part]").forEach((part) => {
                part.addEventListener("click", () => {
                    const rang = Number(part.dataset.part);
                    if (selection.has(rang)) {
                        selection.delete(rang);
                    } else {
                        selection.add(rang);
                    }
                    part.setAttribute("aria-pressed", String(selection.has(rang)));
                    part.classList.toggle("est-choisie", selection.has(rang));
                });
            });
        }

        function validerParts(etape) {
            if (selection.size === etape.requiredCount) {
                reussir();
                return;
            }
            echouer(
                `Tu as choisi ${selection.size} `
                + `${selection.size > 1 ? "parts" : "part"}, il en faut ${etape.requiredCount}.`
            );
        }

        function repondre(option, bouton) {
            if (option.correct) {
                bouton.classList.add("est-juste");
                reussir();
                return;
            }
            bouton.classList.add("est-fausse");
            bouton.disabled = true;
            echouer(questions.hintFor(option.distractor));
        }

        function echouer(indice) {
            dejaRate = true;
            vue.retour.dataset.tone = "erreur";
            vue.retour.textContent = indice || "Regarde bien le dessin.";
            bus.emit("answer:incorrect", {index, hint: indice});
        }

        function reussir() {
            const etape = etapeCourante();
            vue.retour.dataset.tone = "reussite";
            vue.retour.textContent = etape.explanation;
            vue.reponses.querySelectorAll("button").forEach((b) => {
                b.disabled = true;
            });
            vue.valider.hidden = true;

            bus.emit("answer:correct", {index, firstTry: !dejaRate});
            bus.emit("step:completed", {index, completedSteps: index + 1});

            // Le temps que le héros saute. La pédagogie n'attend pas Phaser :
            // c'est un délai de confort, pas une dépendance.
            root.setTimeout(() => {
                index += 1;
                if (index < etapes.length) {
                    afficherEtape();
                    return;
                }
                terminer();
            }, reducedMotion ? 400 : 1100);
        }

        function terminer() {
            vue.etape.textContent = "Traversée terminée";
            vue.titre.textContent = "Tu as rejoint le village !";
            vue.visuel.innerHTML = "";
            vue.reponses.innerHTML = "";
            vue.valider.hidden = true;
            vue.retour.dataset.tone = "reussite";
            vue.retour.textContent = "Le coffre est ouvert. Bravo.";
            if (vue.rejouer) {
                vue.rejouer.hidden = false;
                vue.rejouer.onclick = demarrer;
            }
            bus.emit("journey:finale-started", {});
            bus.emit("journey:completed", {steps: etapes.length});
        }

        // Les couches sont accrochées après la création du jeu : c'est la
        // plomberie qui garde le canvas collé à l'illustration.
        const couches = typeof root.attachFractionRiverLayers === "function"
            ? root.attachFractionRiverLayers(game)
            : null;

        demarrer();

        const controller = {
            game,
            demarrer,
            replacer: couches && couches.replacer,
            gameConsole: couches && couches.gameConsole,
            get index() {
                return index;
            }
        };
        root.fractionRiverV2 = controller;
        return controller;
    }

    root.startFractionRiverPlay = startPlay;

    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", startPlay);
        } else {
            startPlay();
        }
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
