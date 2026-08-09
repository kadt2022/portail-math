(function initializeFractionRiverGame(root) {
    "use strict";

    const questions = typeof require === "function" && typeof module !== "undefined"
        ? require("./fraction-river-questions.js")
        : root.FractionRiverQuestions;
    const visuals = typeof require === "function" && typeof module !== "undefined"
        ? require("./fraction-river-visuals.js")
        : root.FractionRiverVisuals;

    const STEP_COUNT = questions.STEP_COUNT;
    const LEVEL = 1;
    const GUIDED_INITIAL_SCENE_PAUSE_MS = 1500;
    const GUIDED_CORRECTION_SCENE_PAUSE_MS = 3000;
    const GUIDED_FINALE_SCENE_PAUSE_MS = 4200;

    function createTraversalState() {
        return {
            stepIndex: 0,
            completedSteps: 0,
            firstTryCorrect: 0,
            correctedErrors: 0,
            hadMistake: false,
            locked: false,
            outcome: null,
            lastDistractor: null
        };
    }

    // Une question corrigée après plusieurs erreurs augmente completedSteps,
    // augmente correctedErrors une seule fois, et jamais firstTryCorrect (§4.5).
    function registerSuccess(state) {
        return {
            ...state,
            completedSteps: state.completedSteps + 1,
            firstTryCorrect: state.firstTryCorrect + (state.hadMistake ? 0 : 1),
            correctedErrors: state.correctedErrors + (state.hadMistake ? 1 : 0),
            locked: true,
            outcome: "CORRECT",
            lastDistractor: null
        };
    }

    function evaluateChoice(state, step, optionKey) {
        if (state.locked) {
            return {...state, outcome: "LOCKED"};
        }
        const option = step.options.find((candidate) => candidate.key === optionKey);
        if (!option) {
            return {...state, outcome: "UNKNOWN"};
        }
        if (!option.correct) {
            return {
                ...state,
                hadMistake: true,
                outcome: "INCORRECT",
                lastDistractor: option.distractor
            };
        }
        return registerSuccess(state);
    }

    // Étape « Sélectionne n parts » : un essai est une validation, pas un clic.
    function evaluateSelection(state, step, selectedIndices) {
        if (state.locked) {
            return {...state, outcome: "LOCKED"};
        }
        const selection = [...new Set(selectedIndices)].filter(
            (index) => Number.isInteger(index) && index >= 0 && index < step.totalParts
        );
        if (selection.length === step.requiredCount) {
            return registerSuccess(state);
        }
        return {
            ...state,
            hadMistake: true,
            outcome: "INCORRECT",
            lastDistractor: selection.length > step.requiredCount ? "OFF_BY_ONE" : "COLORED_CONFUSION"
        };
    }

    function advanceStep(state) {
        return {
            ...state,
            stepIndex: state.stepIndex + 1,
            hadMistake: false,
            locked: false,
            outcome: null,
            lastDistractor: null
        };
    }

    function createBridgeState(pairs) {
        return {
            visualOrder: pairs.visualOrder,
            associated: [],
            currentIndex: 0,
            completed: false,
            outcome: null
        };
    }

    function evaluateBridgeAssociation(bridgeState, fractionKey) {
        if (bridgeState.completed) {
            return {...bridgeState, outcome: "LOCKED"};
        }
        const expected = bridgeState.visualOrder[bridgeState.currentIndex];
        if (fractionKey !== expected) {
            return {...bridgeState, outcome: "INCORRECT"};
        }
        const associated = [...bridgeState.associated, expected];
        const currentIndex = bridgeState.currentIndex + 1;
        return {
            ...bridgeState,
            associated,
            currentIndex,
            completed: associated.length === bridgeState.visualOrder.length,
            outcome: "CORRECT"
        };
    }

    function resultMessage(firstTryCorrect) {
        if (firstTryCorrect >= 5) {
            return "Traversée parfaite ! Tu lis les fractions comme un explorateur chevronné.";
        }
        if (firstTryCorrect >= 3) {
            return "Belle traversée ! Tu reconnais déjà bien les parts d’un tout.";
        }
        if (firstTryCorrect >= 1) {
            return "Tu progresses ! Chaque erreur corrigée t’a fait avancer d’une pierre.";
        }
        return "Tu as traversé la rivière grâce à ta persévérance. Recommence quand tu veux.";
    }

    function mountGame(document) {
        const rootElement = document.querySelector("[data-fraction-river]");
        if (!rootElement) {
            return;
        }

        const store = root.FractionRiverStore;
        const query = (selector) => rootElement.querySelector(selector);

        const setupPanel = query("[data-game-setup]");
        const gamePanel = query("[data-game-panel]");
        const learningArea = query("[data-learning-area]");
        const stepPanel = query("[data-step-panel]");
        const resultPanel = query("[data-game-result]");
        const stepTitle = query("[data-step-title]");
        const resultTitle = query("[data-result-title]");
        const optionsContainer = query("[data-step-options]");
        const feedback = query("[data-step-feedback]");
        const nextButton = query("[data-next-step]");
        const riverStage = query("[data-river-stage]");
        const bus = root.FractionRiverEvents;
        const resultAnchor = document.createComment("emplacement du résultat de la rivière");

        function returnToCatalogue() {
            if (root.parent && root.parent !== root) {
                root.parent.postMessage({type: "portal-game:exit"}, root.location.origin);
                return;
            }
            root.location.assign("/app/jeux");
        }

        function moveResultIntoGame() {
            if (!resultAnchor.parentNode) {
                resultPanel.parentNode.insertBefore(resultAnchor, resultPanel);
            }
            riverStage.appendChild(resultPanel);
            resultPanel.classList.add("river-result--immersive");
        }

        function restoreResultPosition() {
            if (resultAnchor.parentNode) {
                resultAnchor.parentNode.insertBefore(resultPanel, resultAnchor);
                resultAnchor.parentNode.removeChild(resultAnchor);
            }
            resultPanel.classList.remove("river-result--immersive");
        }

        // Console immersive. Tant qu'elle est active, la scène et les questions
        // sont côte à côte : plus rien ne doit défiler ni attendre.
        const gameConsole = root.GameConsole
            ? root.GameConsole.createGameConsole({
                document,
                console: query("[data-game-console]"),
                stageSlot: query("[data-console-stage]"),
                // Le panneau de questions n'est plus posé À CÔTÉ de la scène :
                // il est posé DEDANS. Le décor peint réserve un parchemin sur sa
                // droite, et c'est là que la question doit s'afficher — sinon
                // deux interfaces se font concurrence, un parchemin vide dans
                // l'image et un panneau blanc à côté.
                panelSlot: riverStage,
                stage: riverStage,
                panel: stepPanel,
                launchButton: query("[data-console-launch]"),
                quitButton: query("[data-console-quit]"),
                focusOnEnter: stepTitle,
                keepImmersiveOnFullscreenExit: true,
                onQuit: returnToCatalogue,
                // La bascule change la largeur disponible pour l'énoncé : sur le
                // parchemin peint il n'y a que 114 px, contre toute la page en
                // dehors. Sans ce rafraîchissement, la formulation longue restait
                // affichée en immersif et débordait du parchemin.
                onEnter: () => {
                    setLayoutMode("immersive");
                    rafraichirEnonce();
                },
                onExit: () => {
                    setLayoutMode("panoramic");
                    rafraichirEnonce();
                }
            })
            : null;

        function consoleActive() {
            return Boolean(gameConsole && gameConsole.isActive);
        }

        // Réécrit le seul énoncé, sans toucher au reste de l'étape : ni options
        // régénérées, ni progression, ni état de la traversée.
        function rafraichirEnonce() {
            const step = steps[state.stepIndex];
            if (step && stepTitle) {
                stepTitle.textContent = consoleActive() ? promptCourt(step) : step.prompt;
            }
        }

        // Unique contrat avec le moteur : un nom de profil géométrique.
        function setLayoutMode(nom) {
            const controleur = root.fractionRiverGameController;
            if (controleur && typeof controleur.setLayoutMode === "function") {
                controleur.setLayoutMode(nom);
            }
        }

        let steps = [];
        let state = createTraversalState();
        let selection = new Set();
        let soundEnabled = store ? store.load().soundEnabled : true;
        let audioContext = null;
        let guidedJourneyTimer = null;

        function prefersReducedMotion() {
            return typeof root.matchMedia === "function"
                && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
        }

        function scrollToElement(element) {
            // Aucun déplacement automatique de la page pendant le mode immersif.
            if (consoleActive()) {
                return;
            }
            if (element && typeof element.scrollIntoView === "function") {
                element.scrollIntoView({
                    behavior: prefersReducedMotion() ? "auto" : "smooth",
                    block: "start"
                });
            }
        }

        function focusWithoutScrolling(element) {
            try {
                element.focus({preventScroll: true});
            } catch (error) {
                element.focus();
            }
        }

        function scrollToStep() {
            scrollToElement(stepPanel);
            focusWithoutScrolling(stepTitle);
        }


        function clearGuidedJourneyTimer() {
            if (guidedJourneyTimer !== null) {
                root.clearTimeout(guidedJourneyTimer);
                guidedJourneyTimer = null;
            }
        }

        // La scène doit être ENTIÈREMENT à l'écran avant que quoi que ce soit
        // ne s'y anime, sur téléphone comme sur ordinateur.
        function sceneFullyVisible() {
            const rect = riverStage.getBoundingClientRect();
            const hauteur = root.innerHeight || document.documentElement.clientHeight;
            return rect.top >= -1 && rect.bottom <= hauteur + 1;
        }

        function scrollToRiverScene() {
            if (typeof riverStage.scrollIntoView === "function") {
                riverStage.scrollIntoView({
                    behavior: prefersReducedMotion() ? "auto" : "smooth",
                    block: "center"
                });
            }
        }

        // On amène la scène à l'écran, on attend qu'elle y soit vraiment, et
        // seulement ensuite on déclenche l'animation. Sans cette attente, la
        // pierre apparaissait pendant que la page défilait encore et l'enfant
        // manquait le saut.
        function whenSceneVisible(action, timeout = 1600) {
            // En mode immersif, la scène et la question sont déjà visibles
            // ensemble : aucun défilement, aucune attente, l'animation part.
            if (consoleActive()) {
                action();
                return;
            }
            scrollToRiverScene();
            if (prefersReducedMotion() || typeof root.requestAnimationFrame !== "function") {
                action();
                return;
            }
            const debut = Date.now();
            const verifier = () => {
                if (sceneFullyVisible() || Date.now() - debut > timeout) {
                    action();
                    return;
                }
                root.requestAnimationFrame(verifier);
            };
            root.requestAnimationFrame(verifier);
        }

        function showRiverSceneThen(callback, duration = GUIDED_CORRECTION_SCENE_PAUSE_MS) {
            clearGuidedJourneyTimer();
            scrollToRiverScene();
            guidedJourneyTimer = root.setTimeout(() => {
                guidedJourneyTimer = null;
                callback();
            }, duration);
        }

        // Défilement, puis animation, puis pause, puis suite.
        function playSceneThen(emitAnimation, callback, duration = GUIDED_CORRECTION_SCENE_PAUSE_MS) {
            clearGuidedJourneyTimer();
            whenSceneVisible(() => {
                emitAnimation();
                guidedJourneyTimer = root.setTimeout(() => {
                    guidedJourneyTimer = null;
                    callback();
                }, duration);
            });
        }

        function playTone(kind) {
            if (!soundEnabled) {
                return;
            }
            const AudioContext = root.AudioContext || root.webkitAudioContext;
            if (!AudioContext) {
                return;
            }
            audioContext = audioContext || new AudioContext();
            const sequences = {
                correct: [523, 659, 784],
                incorrect: [262, 233],
                arrival: [523, 659, 784, 1047]
            };
            const frequencies = sequences[kind] || [440];
            const start = audioContext.currentTime;
            frequencies.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = frequency;
                gain.gain.setValueAtTime(0.0001, start + index * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.12, start + index * 0.1 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.1 + 0.15);
                oscillator.connect(gain);
                gain.connect(audioContext.destination);
                oscillator.start(start + index * 0.1);
                oscillator.stop(start + index * 0.1 + 0.17);
            });
        }

        function renderFeedback(target, kind, title, detail) {
            target.textContent = "";
            target.className = `answer-feedback answer-feedback--${kind}`;
            const strong = document.createElement("strong");
            strong.textContent = title;
            const paragraph = document.createElement("span");
            paragraph.textContent = detail;
            target.append(strong, paragraph);
        }

        function clearFeedback(target) {
            target.textContent = "";
            target.className = "answer-feedback";
        }

        function updateStatus() {
            const avancement = `${Math.min(state.stepIndex + 1, STEP_COUNT)}/${STEP_COUNT}`;
            const stepProgress = query("[data-step-progress]");
            const stoneCount = query("[data-stone-count]");
            if (stepProgress) {
                stepProgress.textContent = avancement;
            }
            if (stoneCount) {
                stoneCount.textContent = String(state.completedSteps);
            }
            // La barre de la console porte le même compteur : elle reste dehors
            // quand le panneau de questions est déplacé à l'intérieur.
            const compteurConsole = query("[data-console-step]");
            if (compteurConsole) {
                compteurConsole.textContent = avancement;
            }
        }

        function updateSavedProgress() {
            if (!query("[data-best-first-try]") || !query("[data-games-played]")) {
                return;
            }
            const progress = store ? store.levelProgress(LEVEL) : null;
            const played = store ? store.load().gamesPlayed : 0;
            query("[data-best-first-try]").textContent = `${progress ? progress.firstTryCorrect : 0}/${STEP_COUNT}`;
            query("[data-games-played]").textContent = String(played);
        }

        function updateSoundButton() {
            const button = query("[data-sound-toggle]");
            button.setAttribute("aria-pressed", String(soundEnabled));
            button.textContent = soundEnabled ? "🔊 Son activé" : "🔇 Son désactivé";
        }

        function renderVisualInto(container, visual, id) {
            container.innerHTML = visual
                ? visuals.renderStaticVisual({...visual, id})
                : "";
        }

        function showNextButton(label) {
            nextButton.textContent = label;
            nextButton.hidden = false;
        }

        function handleCorrectStep(step) {
            renderFeedback(
                feedback,
                "correct",
                state.hadMistake ? "Bien corrigé !" : "Bonne réponse — bravo !",
                `${step.explanation} Une pierre apparaît dans la rivière.`
            );
            query("[data-encouragement]").textContent = state.hadMistake
                ? "Ton effort t’a fait traverser cette étape."
                : "Tu avances de pierre en pierre.";
            updateStatus();
            bus.emit("answer:correct", {step, hadMistake: state.hadMistake});
            playTone("correct");
            showNextButton(state.completedSteps === STEP_COUNT
                ? "Monter l’escalier et rejoindre le village →"
                : "Continuer vers la pierre suivante →");
            nextButton.hidden = true;
            // La pierre n'apparaît qu'une fois la scène sous les yeux de l'enfant.
            playSceneThen(
                () => bus.emit("step:completed", {
                    step,
                    completedSteps: state.completedSteps,
                    totalSteps: STEP_COUNT
                }),
                () => continueTraversal({automatic: true})
            );
        }

        function handleIncorrectStep(step) {
            const hint = questions.hintFor(state.lastDistractor);
            renderFeedback(feedback, "wrong", "Pas encore — regarde bien le dessin.", hint);
            query("[data-encouragement]").textContent = "Tu peux essayer autant de fois que tu veux.";
            // La grenouille répète l'indice dans la scène ; le texte HTML reste
            // la source lisible par un lecteur d'écran.
            bus.emit("answer:incorrect", {step, hint, distractor: state.lastDistractor});
            playTone("incorrect");
        }

        function createOptionButton(step, option) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = option.visual
                ? "answer-option answer-option--visual"
                : "answer-option";
            if (option.visual) {
                button.innerHTML = visuals.renderStaticVisual({...option.visual, id: `opt-${option.key}`});
            } else {
                button.textContent = option.label;
            }
            button.addEventListener("click", () => {
                state = evaluateChoice(state, step, option.key);
                if (state.outcome === "INCORRECT") {
                    button.classList.add("is-wrong");
                    button.disabled = true;
                    handleIncorrectStep(step);
                    return;
                }
                if (state.outcome === "CORRECT") {
                    optionsContainer.querySelectorAll("button").forEach((candidate) => {
                        candidate.disabled = true;
                    });
                    button.classList.add("is-correct");
                    handleCorrectStep(step);
                }
            });
            return button;
        }

        function renderSelectionStep(step) {
            selection = new Set();
            optionsContainer.innerHTML = visuals.renderInteractiveParts({
                kind: step.visual.kind,
                total: step.totalParts,
                selected: []
            });
            const validate = document.createElement("button");
            validate.type = "button";
            validate.className = "game-primary-button fr-validate";
            validate.textContent = "Valider ma sélection";
            validate.setAttribute("data-validate-selection", "");

            optionsContainer.querySelectorAll("[data-part]").forEach((partButton) => {
                partButton.addEventListener("click", () => {
                    if (state.locked) {
                        return;
                    }
                    const index = Number(partButton.dataset.part);
                    if (selection.has(index)) {
                        selection.delete(index);
                    } else {
                        selection.add(index);
                    }
                    partButton.setAttribute("aria-pressed", String(selection.has(index)));
                    partButton.classList.toggle("is-selected", selection.has(index));
                });
            });

            validate.addEventListener("click", () => {
                state = evaluateSelection(state, step, [...selection]);
                if (state.outcome === "INCORRECT") {
                    handleIncorrectStep(step);
                    return;
                }
                if (state.outcome === "CORRECT") {
                    optionsContainer.querySelectorAll("[data-part]").forEach((partButton) => {
                        partButton.disabled = true;
                    });
                    validate.disabled = true;
                    handleCorrectStep(step);
                }
            });

            optionsContainer.appendChild(validate);
        }

        // Énoncé court, pour le mode immersif seulement.
        //
        // La question s'affiche là sur le parchemin peint de l'illustration : une
        // bande de 114 px de large sur un téléphone en paysage. Mesuré, « Quelle
        // fraction est représentée ? » y occupe QUATRE lignes et 92 px de haut, et
        // le contenu débordait de 53 px.
        //
        // Rien n'est retiré à la pédagogie : la formulation complète reste dans
        // les données, et c'est elle qui s'affiche sur la page normale. Ce qui
        // disparaît ici, c'est la reprise des nombres déjà lisibles sur le dessin
        // juste en dessous.
        function promptCourt(step) {
            const fraction = step.fraction
                ? `${step.fraction.numerator}/${step.fraction.denominator}`
                : "";
            if (step.type === "IDENTIFY") {
                return "Quelle fraction ?";
            }
            if (step.type === "MATCH_VISUAL") {
                return `Quel dessin montre ${fraction} ?`;
            }
            if (step.type === "NUMERATOR") {
                return "Le nombre du haut ?";
            }
            if (step.type === "DENOMINATOR") {
                return "Le nombre du bas ?";
            }
            return step.prompt;
        }

        function renderStep({focus = true} = {}) {
            const step = steps[state.stepIndex];
            // Même découpage que le Train : un intitulé court en capitales,
            // puis la question seule dans le titre.
            query("[data-step-kicker]").textContent = `Étape ${state.stepIndex + 1} sur ${STEP_COUNT}`;
            stepTitle.textContent = consoleActive() ? promptCourt(step) : step.prompt;
            renderVisualInto(query("[data-step-visual]"), step.visual, `step-${state.stepIndex}`);
            optionsContainer.textContent = "";
            optionsContainer.className = step.type === "MATCH_VISUAL"
                ? "answer-options answer-options--visual"
                : "answer-options";

            if (step.type === "SELECT_PARTS") {
                renderSelectionStep(step);
            } else {
                step.options.forEach((option) => {
                    optionsContainer.appendChild(createOptionButton(step, option));
                });
            }

            clearFeedback(feedback);
            nextButton.hidden = true;
            query("[data-encouragement]").textContent = "Prends ton temps, il n’y a pas de chronomètre.";
            updateStatus();
            bus.emit("step:rendered", {step, stepIndex: state.stepIndex});
            if (focus) {
                stepTitle.focus();
            }
        }

        function finishGame() {
            const progress = store
                ? store.recordTraversal({
                    level: LEVEL,
                    completedSteps: state.completedSteps,
                    firstTryCorrect: state.firstTryCorrect,
                    correctedErrors: state.correctedErrors,
                    bridgeCompleted: true,
                    questionIds: steps.map((step) => step.id)
                })
                : null;

            learningArea.hidden = true;
            stepPanel.hidden = true;
            if (consoleActive()) {
                moveResultIntoGame();
            }
            resultPanel.hidden = false;
            query("[data-final-steps]").textContent = `${state.completedSteps}/${STEP_COUNT}`;
            query("[data-final-first-try]").textContent = `${state.firstTryCorrect}/${STEP_COUNT}`;
            query("[data-final-corrected]").textContent = String(state.correctedErrors);
            query("[data-result-message]").textContent = resultMessage(state.firstTryCorrect);

            const badgeList = query("[data-final-badges]");
            badgeList.textContent = "";
            const badgeCodes = progress ? progress.badges : [];
            const labels = root.FractionRiverStoreApi ? root.FractionRiverStoreApi.BADGES : {};
            badgeCodes.forEach((code) => {
                const item = document.createElement("li");
                item.className = "fr-badge";
                item.textContent = `🏅 ${labels[code] || code}`;
                badgeList.appendChild(item);
            });

            updateSavedProgress();
            bus.emit("journey:completed", {
                completedSteps: state.completedSteps,
                firstTryCorrect: state.firstTryCorrect,
                correctedErrors: state.correctedErrors
            });
            playTone("arrival");
            resultTitle.focus();
            if (!consoleActive()) {
                scrollToElement(resultPanel);
            }
        }

        function startFinale() {
            // Même règle pour la marche finale : la scène d'abord, l'animation
            // ensuite, sinon l'enfant rate la traversée du pont.
            playSceneThen(
                () => bus.emit("journey:finale-started", {
                    completedSteps: state.completedSteps,
                    firstTryCorrect: state.firstTryCorrect,
                    correctedErrors: state.correctedErrors
                }),
                finishGame,
                GUIDED_FINALE_SCENE_PAUSE_MS
            );
        }

        function continueTraversal({automatic = false} = {}) {
            clearGuidedJourneyTimer();
            if (state.completedSteps >= STEP_COUNT) {
                // Plus de questions pour la passerelle : l’escalier est déjà là,
                // le héros le gravit et quitte la rivière.
                startFinale();
                return;
            }
            state = advanceStep(state);
            renderStep({focus: !automatic});
            root.requestAnimationFrame(scrollToStep);
        }

        function startGame() {
            clearGuidedJourneyTimer();
            restoreResultPosition();
            const saved = store ? store.load() : {recentQuestionIds: []};
            steps = questions.createLevel1Steps(Math.random, saved.recentQuestionIds || []);
            state = createTraversalState();
            if (setupPanel) {
                setupPanel.hidden = true;
            }
            gamePanel.hidden = false;
            learningArea.hidden = false;
            stepPanel.hidden = false;
            resultPanel.hidden = true;
            bus.emit("journey:started", {level: LEVEL, totalSteps: STEP_COUNT});
            renderStep({focus: false});
            root.requestAnimationFrame(() => {
                showRiverSceneThen(
                    scrollToStep,
                    GUIDED_INITIAL_SCENE_PAUSE_MS
                );
            });
        }

        query("[data-replay]").addEventListener("click", startGame);
        query("[data-result-quit]").addEventListener("click", () => {
            if (gameConsole) {
                gameConsole.exit();
            }
            returnToCatalogue();
        });
        nextButton.addEventListener("click", continueTraversal);
        query("[data-sound-toggle]").addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            if (store) {
                store.setSoundEnabled(soundEnabled);
            }
            updateSoundButton();
            if (soundEnabled) {
                playTone("correct");
            }
        });
        updateSavedProgress();
        updateSoundButton();

        // Lancement direct depuis le catalogue.
        //
        // /riviere-des-fractions?mode=immersive ouvre le jeu sans aucun écran
        // intermédiaire : ni présentation, ni choix de niveau, ni confirmation.
        // La première question s'affiche tout de suite.
        //
        // Le plein écran et le verrouillage paysage sont TENTÉS par la console,
        // jamais exigés : un navigateur qui les refuse (Safari iOS, Chrome après
        // une navigation sans geste) laisse simplement la disposition immersive
        // en place. Le message « Tourne ton téléphone » est géré par CSS en
        // portrait et disparaît seul en paysage — aucun bouton n'est demandé.
        function autoLaunchImmersive() {
            document.documentElement.classList.add("is-fraction-river-immersive");
            document.body.classList.add("is-fraction-river-immersive");
            // La traversée démarre : première question rendue immédiatement. Un
            // nouvel enfant part au niveau 1 ; un enfant déjà venu retrouve sa
            // progression via les questions récemment vues (createLevel1Steps).
            startGame();
            if (!gameConsole) {
                return;
            }
            // L'entrée déplace la scène dans la console. On la diffère d'un tour
            // de boucle pour que Phaser ait amorcé son canvas dans le conteneur
            // avant qu'il ne change de parent.
            //
            // setTimeout et non requestAnimationFrame : rAF ne se déclenche pas
            // dans un onglet qui ne peint pas (arrière-plan au moment de la
            // navigation), et l'entrée immersive ne partait alors jamais.
            root.setTimeout(() => {
                if (!gameConsole.isActive) {
                    gameConsole.enter();
                }
            }, 0);
        }

        // La scène Phaser est un enrichissement : si elle ne démarre pas, la
        // page reste entièrement jouable.
        if (typeof root.startFractionRiverGame === "function") {
            root.startFractionRiverGame({bus, reducedMotion: prefersReducedMotion()});
        }

        autoLaunchImmersive();
    }

    const api = {
        STEP_COUNT,
        GUIDED_INITIAL_SCENE_PAUSE_MS,
        GUIDED_CORRECTION_SCENE_PAUSE_MS,
        GUIDED_FINALE_SCENE_PAUSE_MS,
        createTraversalState,
        evaluateChoice,
        evaluateSelection,
        advanceStep,
        createBridgeState,
        evaluateBridgeAssociation,
        resultMessage,
        mountGame
    };

    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", () => mountGame(root.document));
        } else {
            mountGame(root.document);
        }
    }

    root.FractionRiverGame = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
