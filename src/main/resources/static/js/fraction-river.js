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
    const MOBILE_JOURNEY_QUERY = "(max-width: 620px)";

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
        const bridgePanel = query("[data-bridge-panel]");
        const resultPanel = query("[data-game-result]");
        const stepTitle = query("[data-step-title]");
        const resultTitle = query("[data-result-title]");
        const optionsContainer = query("[data-step-options]");
        const feedback = query("[data-step-feedback]");
        const nextButton = query("[data-next-step]");
        const bus = root.FractionRiverEvents;

        let steps = [];
        let bridge = null;
        let bridgePairs = null;
        let state = createTraversalState();
        let selection = new Set();
        let soundEnabled = store ? store.load().soundEnabled : true;
        let audioContext = null;

        function isMobileJourney() {
            return typeof root.matchMedia === "function"
                && root.matchMedia(MOBILE_JOURNEY_QUERY).matches;
        }

        function prefersReducedMotion() {
            return typeof root.matchMedia === "function"
                && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
        }

        function scrollToElement(element) {
            if (element && typeof element.scrollIntoView === "function") {
                element.scrollIntoView({
                    behavior: prefersReducedMotion() ? "auto" : "smooth",
                    block: "start"
                });
            }
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
            query("[data-step-progress]").textContent = `${Math.min(state.stepIndex + 1, STEP_COUNT)}/${STEP_COUNT}`;
            query("[data-stone-count]").textContent = String(state.completedSteps);
        }

        function updateSavedProgress() {
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
            if (!isMobileJourney()) {
                nextButton.focus();
            }
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
            bus.emit("step:completed", {
                step,
                completedSteps: state.completedSteps,
                totalSteps: STEP_COUNT
            });
            playTone("correct");
            showNextButton(state.completedSteps === STEP_COUNT
                ? "Rejoindre la passerelle →"
                : "Continuer vers la pierre suivante →");
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
            button.className = option.visual ? "fr-option fr-option--visual" : "fr-option";
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

        function renderStep({focus = true} = {}) {
            const step = steps[state.stepIndex];
            stepTitle.textContent = `Étape ${state.stepIndex + 1} — ${step.prompt}`;
            renderVisualInto(query("[data-step-visual]"), step.visual, `step-${state.stepIndex}`);
            optionsContainer.textContent = "";
            optionsContainer.className = step.type === "MATCH_VISUAL"
                ? "fr-options fr-options--visual"
                : "fr-options";

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

        function renderBridge() {
            const currentKey = bridge.visualOrder[bridge.currentIndex];
            const pair = bridgePairs.slabs.find((slab) => slab.key === currentKey);
            renderVisualInto(query("[data-bridge-visual]"), pair.visual, `bridge-${bridge.currentIndex}`);
            query("[data-bridge-progress]").textContent = `${bridge.associated.length}/3`;

            const container = query("[data-bridge-fractions]");
            container.textContent = "";
            bridgePairs.fractionOrder.forEach((key) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "fr-option";
                button.textContent = key;
                button.disabled = bridge.associated.includes(key);
                button.addEventListener("click", () => {
                    bridge = evaluateBridgeAssociation(bridge, key);
                    if (bridge.outcome === "INCORRECT") {
                        renderFeedback(
                            query("[data-bridge-feedback]"),
                            "wrong",
                            "Ce n’est pas ce dessin.",
                            "Compte les parts coloriées, puis toutes les parts du tout."
                        );
                        playTone("incorrect");
                        return;
                    }
                    const slabs = rootElement.querySelectorAll("[data-slab]");
                    slabs.forEach((slab, index) => {
                        slab.classList.toggle("is-placed", index < bridge.associated.length);
                    });
                    bus.emit("bridge:slab", {placed: bridge.associated.length, key});
                    playTone("correct");
                    if (bridge.completed) {
                        finishGame();
                        return;
                    }
                    renderFeedback(
                        query("[data-bridge-feedback]"),
                        "correct",
                        "Dalle posée !",
                        "La passerelle s’allonge. Continue."
                    );
                    renderBridge();
                });
                container.appendChild(button);
            });
        }

        function startBridge() {
            stepPanel.hidden = true;
            bridgePanel.hidden = false;
            bridgePairs = questions.createBridgePairs();
            bridge = createBridgeState(bridgePairs);
            clearFeedback(query("[data-bridge-feedback]"));
            bus.emit("bridge:started", {slabs: bridgePairs.slabs.length});
            renderBridge();
            query("[data-bridge-title]").focus();
            scrollToElement(bridgePanel);
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
            scrollToElement(resultPanel);
        }

        function continueTraversal() {
            if (state.completedSteps >= STEP_COUNT) {
                startBridge();
                return;
            }
            state = advanceStep(state);
            renderStep();
            if (isMobileJourney()) {
                scrollToElement(stepPanel);
            }
        }

        function startGame() {
            const saved = store ? store.load() : {recentQuestionIds: []};
            steps = questions.createLevel1Steps(Math.random, saved.recentQuestionIds || []);
            state = createTraversalState();
            bridge = null;
            setupPanel.hidden = true;
            gamePanel.hidden = false;
            learningArea.hidden = false;
            stepPanel.hidden = false;
            bridgePanel.hidden = true;
            resultPanel.hidden = true;
            bus.emit("journey:started", {level: LEVEL, totalSteps: STEP_COUNT});
            renderStep();
        }

        function showLevels() {
            gamePanel.hidden = true;
            setupPanel.hidden = false;
            updateSavedProgress();
            query("[data-start-game]").focus();
        }

        query("[data-start-game]").addEventListener("click", startGame);
        query("[data-replay]").addEventListener("click", startGame);
        query("[data-change-level]").addEventListener("click", showLevels);
        query("[data-result-change-level]").addEventListener("click", showLevels);
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

        // La scène Phaser est un enrichissement : si elle ne démarre pas, la
        // page reste entièrement jouable.
        if (typeof root.startFractionRiverGame === "function") {
            root.startFractionRiverGame({bus, reducedMotion: prefersReducedMotion()});
        }
    }

    const api = {
        STEP_COUNT,
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
