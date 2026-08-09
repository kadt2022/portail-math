(function initializeMultiplicationTrainGame(root) {
    "use strict";

    const QUESTION_COUNT = 5;
    const LEVELS = Object.freeze([
        Object.freeze({
            id: "LEVEL_1",
            label: "Niveau 1 · Tables de 2 et 5",
            tables: Object.freeze([2, 5])
        })
    ]);
    const ALLOWED_TABLES = LEVELS[0].tables;
    const GUIDED_INITIAL_SCENE_PAUSE_MS = 1500;
    const GUIDED_CORRECTION_PAUSE_MS = 4500;
    const TRAIN_TRAVEL_DURATION_MS = 3600;
    const TRAIN_WHEEL_DIAMETER_PX = 40;

    function shuffle(values, random = Math.random) {
        const items = [...values];
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
        return items;
    }

    function createAnswerOptions(table, multiplier, random = Math.random) {
        const correctAnswer = table * multiplier;
        const otherTable = table === 2 ? 5 : 2;
        const candidates = [
            table * (multiplier - 1),
            table * (multiplier + 1),
            table * (multiplier - 2),
            table * (multiplier + 2),
            otherTable * multiplier,
            correctAnswer - 5,
            correctAnswer + 5
        ].filter((value, index, values) => value > 0
            && value !== correctAnswer
            && values.indexOf(value) === index);

        let nextCandidate = correctAnswer + 1;
        while (candidates.length < 2) {
            if (nextCandidate !== correctAnswer && !candidates.includes(nextCandidate)) {
                candidates.push(nextCandidate);
            }
            nextCandidate += 1;
        }

        const wrongAnswers = shuffle(candidates, random).slice(0, 2);
        return shuffle([correctAnswer, ...wrongAnswers], random);
    }

    function createGameQuestions(random = Math.random, allowedTables = ALLOWED_TABLES) {
        const operations = allowedTables.flatMap((table) =>
            Array.from({length: 10}, (_, index) => ({
                table,
                multiplier: index + 1
            }))
        );

        return shuffle(operations, random)
            .slice(0, QUESTION_COUNT)
            .map(({table, multiplier}) => ({
                id: `${table}x${multiplier}`,
                table,
                multiplier,
                correctAnswer: table * multiplier,
                answers: createAnswerOptions(table, multiplier, random)
            }));
    }

    function createRoundState() {
        return {
            questionIndex: 0,
            completedQuestions: 0,
            score: 0,
            hadMistake: false,
            locked: false,
            outcome: null
        };
    }

    function nextAvailableLevelIndex(currentLevelIndex, levels = LEVELS) {
        const nextIndex = currentLevelIndex + 1;
        return nextIndex < levels.length ? nextIndex : null;
    }

    function evaluateAnswer(state, question, answer) {
        if (state.locked) {
            return {...state, outcome: "LOCKED"};
        }
        if (Number(answer) !== question.correctAnswer) {
            return {
                ...state,
                hadMistake: true,
                outcome: "INCORRECT"
            };
        }
        return {
            ...state,
            completedQuestions: state.completedQuestions + 1,
            score: state.score + (state.hadMistake ? 0 : 1),
            locked: true,
            outcome: "CORRECT"
        };
    }

    function advanceRound(state) {
        return {
            ...state,
            questionIndex: state.questionIndex + 1,
            hadMistake: false,
            locked: false,
            outcome: null
        };
    }

    function scoreToLargeStars(score) {
        if (score >= 5) {
            return 3;
        }
        if (score === 4) {
            return 2;
        }
        if (score >= 2) {
            return 1;
        }
        return 0;
    }

    function calculateTrainOffset(completedQuestions, totalQuestions, availableDistance) {
        if (!Number.isFinite(availableDistance) || availableDistance <= 0) {
            return 0;
        }
        const progress = Math.max(0, Math.min(totalQuestions, completedQuestions));
        return Math.round((progress / totalQuestions) * availableDistance);
    }

    function calculateTrainTravelDistance(trainFrontRight, finishTargetX, currentOffset = 0) {
        if (![trainFrontRight, finishTargetX, currentOffset].every(Number.isFinite)) {
            return 0;
        }
        const trainStartFrontRight = trainFrontRight - currentOffset;
        return Math.max(0, Math.round(finishTargetX - trainStartFrontRight));
    }

    function calculateWheelRotation(distance, wheelDiameter = TRAIN_WHEEL_DIAMETER_PX) {
        if (![distance, wheelDiameter].every(Number.isFinite) || wheelDiameter <= 0) {
            return 0;
        }
        return (distance / (Math.PI * wheelDiameter)) * 360;
    }

    function multiplicationExplanation(question) {
        const groups = Array.from(
            {length: question.table},
            () => question.multiplier
        ).join(" + ");
        return `${question.table} × ${question.multiplier} signifie : ${groups} = ${question.correctAnswer}.`;
    }

    function mountGame(document) {
        const rootElement = document.querySelector("[data-multiplication-train]");
        if (!rootElement) {
            return;
        }

        const gamePanel = rootElement.querySelector("[data-game-panel]");
        const consoleContent = rootElement.querySelector("[data-console-content]");
        const learningArea = rootElement.querySelector(".game-learning-area");
        const questionPanel = rootElement.querySelector("[data-question-panel]");
        const resultPanel = rootElement.querySelector("[data-game-result]");
        const questionTitle = rootElement.querySelector("#game-question-title");
        const resultTitle = rootElement.querySelector("#game-result-title");
        const answersContainer = rootElement.querySelector("[data-answer-options]");
        const feedback = rootElement.querySelector("[data-answer-feedback]");
        const nextButton = rootElement.querySelector("[data-next-question]");
        const scene = rootElement.querySelector("[data-game-scene]");
        const train = rootElement.querySelector("[data-train]");
        const trainFront = train.querySelector(".train-front");
        const finishMarker = scene.querySelector(".station-marker--finish i");
        const store = root.MultiplicationTrainStore;

        function returnToCatalogue() {
            if (root.parent && root.parent !== root) {
                root.parent.postMessage({type: "portal-game:exit"}, root.location.origin);
                return;
            }
            root.location.assign("/app/jeux");
        }

        const gameConsole = root.GameConsole
            ? root.GameConsole.createGameConsole({
                document,
                console: rootElement.querySelector("[data-game-console]"),
                stageSlot: rootElement.querySelector("[data-console-stage]"),
                panelSlot: rootElement.querySelector("[data-console-panel]"),
                stage: scene,
                panel: consoleContent,
                quitButton: rootElement.querySelector("[data-console-quit]"),
                focusOnEnter: questionTitle,
                keepImmersiveOnFullscreenExit: true,
                onEnter: () => root.requestAnimationFrame(() => updateTrainPosition(false)),
                onQuit: returnToCatalogue
            })
            : null;

        rootElement.style.setProperty("--train-travel-duration", `${TRAIN_TRAVEL_DURATION_MS}ms`);

        let questions = [];
        let state = createRoundState();
        let soundEnabled = store ? store.load().soundEnabled : true;
        let audioContext = null;
        let travelTimer = null;
        let guidedJourneyTimer = null;
        let appliedTrainOffset = 0;
        let appliedWheelRotation = 0;
        let currentLevelIndex = 0;

        function consoleActive() {
            return Boolean(gameConsole && gameConsole.isActive);
        }

        function query(selector) {
            return rootElement.querySelector(selector);
        }

        function preferredScrollBehavior() {
            const reduceMotion = typeof root.matchMedia === "function"
                && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
            return reduceMotion ? "auto" : "smooth";
        }

        function focusWithoutScrolling(element) {
            try {
                element.focus({preventScroll: true});
            } catch (error) {
                element.focus();
            }
        }

        function scrollToElement(element) {
            if (typeof element.scrollIntoView === "function") {
                element.scrollIntoView({
                    behavior: preferredScrollBehavior(),
                    block: "start"
                });
            }
        }

        function scrollToScene() {
            if (!consoleActive()) {
                scrollToElement(scene);
            }
        }

        function scrollToQuestion() {
            if (!consoleActive()) {
                scrollToElement(questionPanel);
            }
            focusWithoutScrolling(questionTitle);
        }

        function scrollToResult() {
            if (!consoleActive()) {
                scrollToElement(resultPanel);
            }
            focusWithoutScrolling(resultTitle);
        }

        function clearGuidedJourneyTimer() {
            if (guidedJourneyTimer !== null) {
                root.clearTimeout(guidedJourneyTimer);
                guidedJourneyTimer = null;
            }
        }

        function showCorrectionSceneThen(callback) {
            clearGuidedJourneyTimer();
            root.requestAnimationFrame(scrollToScene);
            guidedJourneyTimer = root.setTimeout(() => {
                guidedJourneyTimer = null;
                callback();
            }, GUIDED_CORRECTION_PAUSE_MS);
        }

        function updateSavedProgress() {
            const progress = store ? store.load() : {bestScore: 0, gamesPlayed: 0};
            const bestScore = query("[data-best-score]");
            const gamesPlayed = query("[data-games-played]");
            if (bestScore) {
                bestScore.textContent = `${progress.bestScore}/5`;
            }
            if (gamesPlayed) {
                gamesPlayed.textContent = String(progress.gamesPlayed);
            }
        }

        function updateSoundButton() {
            const button = query("[data-sound-toggle]");
            button.setAttribute("aria-pressed", String(soundEnabled));
            button.textContent = soundEnabled ? "🔊 Son activé" : "🔇 Son désactivé";
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
                incorrect: [245, 220],
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

        function renderFeedback(kind, title, detail) {
            feedback.textContent = "";
            feedback.className = `answer-feedback answer-feedback--${kind}`;
            const strong = document.createElement("strong");
            strong.textContent = title;
            const paragraph = document.createElement("span");
            paragraph.textContent = detail;
            feedback.append(strong, paragraph);
        }

        function updateTrainPosition(animate = false) {
            const trainFrontRect = trainFront.getBoundingClientRect();
            const finishMarkerRect = finishMarker.getBoundingClientRect();
            const availableDistance = calculateTrainTravelDistance(
                trainFrontRect.right,
                finishMarkerRect.right,
                appliedTrainOffset
            );
            const offset = calculateTrainOffset(
                state.completedQuestions,
                QUESTION_COUNT,
                availableDistance
            );
            const travelledDistance = offset - appliedTrainOffset;
            if (animate) {
                scene.classList.add("is-travelling");
            } else {
                scene.classList.remove("is-travelling");
            }
            appliedWheelRotation += calculateWheelRotation(travelledDistance);
            appliedTrainOffset = offset;
            rootElement.style.setProperty("--wheel-rotation", `${appliedWheelRotation}deg`);
            train.style.transform = `translateX(${offset}px)`;
            if (animate) {
                root.clearTimeout(travelTimer);
                travelTimer = root.setTimeout(() => {
                    scene.classList.remove("is-travelling");
                }, TRAIN_TRAVEL_DURATION_MS + 100);
            }
        }

        function updateStatus() {
            query("[data-question-progress]").textContent = `${state.questionIndex + 1}/${QUESTION_COUNT}`;
            query("[data-star-count]").textContent = String(state.completedQuestions);
        }

        function createAnswerButton(value, question) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "answer-option";
            button.textContent = String(value);
            button.addEventListener("click", () => {
                const nextState = evaluateAnswer(state, question, value);
                state = nextState;

                if (state.outcome === "INCORRECT") {
                    button.classList.add("is-wrong");
                    button.disabled = true;
                    renderFeedback(
                        "wrong",
                        "Réponse incorrecte — presque !",
                        `${multiplicationExplanation(question)} Essaie encore.`
                    );
                    query("[data-encouragement]").textContent = "Presque, regarde les groupes un par un.";
                    playTone("incorrect");
                    return;
                }

                if (state.outcome === "CORRECT") {
                    answersContainer.querySelectorAll("button").forEach((answerButton) => {
                        answerButton.disabled = true;
                        if (Number(answerButton.textContent) === question.correctAnswer) {
                            answerButton.classList.add("is-correct");
                        }
                    });
                    renderFeedback(
                        "correct",
                        "Bonne réponse — bravo !",
                        `${question.table} groupes de ${question.multiplier} donnent ${question.correctAnswer}. Le train avance !`
                    );
                    query("[data-encouragement]").textContent = state.hadMistake
                        ? "Bien corrigé ! Ton effort fait avancer le train."
                        : "Bien joué ! Tu progresses gare après gare.";
                    nextButton.innerHTML = state.completedQuestions === QUESTION_COUNT
                        ? "Arriver à la gare finale <span aria-hidden=\"true\">→</span>"
                        : "Continuer vers la prochaine gare <span aria-hidden=\"true\">→</span>";
                    updateStatus();
                    updateTrainPosition(true);
                    playTone("correct");
                    nextButton.hidden = true;
                    showCorrectionSceneThen(() => continueJourney(true));
                }
            });
            return button;
        }

        function renderQuestion({focus = true} = {}) {
            const question = questions[state.questionIndex];
            query("[data-operation-left]").textContent = String(question.table);
            query("[data-operation-right]").textContent = String(question.multiplier);
            answersContainer.textContent = "";
            question.answers.forEach((answer) => {
                answersContainer.appendChild(createAnswerButton(answer, question));
            });
            feedback.textContent = "";
            feedback.className = "answer-feedback";
            nextButton.hidden = true;
            query("[data-encouragement]").textContent = "Ton effort fait avancer le train.";
            updateStatus();
            if (focus) {
                questionTitle.focus();
            }
        }

        function finishGame({focus = true} = {}) {
            const progress = recordCompletedLevel();
            const largeStarCount = scoreToLargeStars(state.score);
            learningArea.hidden = true;
            resultPanel.hidden = false;
            query("[data-final-score]").textContent = `${state.score}/5`;
            query("[data-final-best]").textContent = `${progress.bestScore}/5`;
            const stars = query("[data-large-stars]");
            stars.textContent = largeStarCount ? "⭐".repeat(largeStarCount) : "🌱";
            stars.setAttribute(
                "aria-label",
                largeStarCount
                    ? `${largeStarCount} grande${largeStarCount > 1 ? "s" : ""} étoile${largeStarCount > 1 ? "s" : ""}`
                    : "Encouragement à recommencer"
            );
            const messages = {
                3: "Magnifique voyage ! Les tables de 2 et 5 n’ont presque plus de secrets pour toi.",
                2: "Très beau voyage ! Continue comme ça pour gagner la troisième étoile.",
                1: "Tu progresses ! Un nouveau voyage t’aidera à consolider tes tables.",
                0: "Chaque essai te fait avancer. Reprends le train quand tu es prêt."
            };
            query("[data-result-message]").textContent = messages[largeStarCount];
            updateSavedProgress();
            playTone("arrival");
            if (focus) {
                resultTitle.focus();
            }
        }

        function recordCompletedLevel() {
            return store ? store.recordGame(state.score) : {bestScore: state.score};
        }

        function continueJourney(automatic = false) {
            clearGuidedJourneyTimer();
            if (state.completedQuestions === QUESTION_COUNT) {
                const nextLevelIndex = nextAvailableLevelIndex(currentLevelIndex);
                if (nextLevelIndex !== null) {
                    recordCompletedLevel();
                    currentLevelIndex = nextLevelIndex;
                    startGame();
                    return;
                }
                finishGame({focus: !automatic});
                if (automatic) {
                    root.requestAnimationFrame(scrollToResult);
                }
                return;
            }
            state = advanceRound(state);
            renderQuestion({focus: !automatic});
            if (automatic) {
                root.requestAnimationFrame(scrollToQuestion);
            }
        }

        function startGame() {
            clearGuidedJourneyTimer();
            const currentLevel = LEVELS[currentLevelIndex];
            questions = createGameQuestions(Math.random, currentLevel.tables);
            query("[data-level-label]").textContent = currentLevel.label;
            state = createRoundState();
            appliedTrainOffset = 0;
            appliedWheelRotation = 0;
            rootElement.style.setProperty("--wheel-rotation", "0deg");
            gamePanel.hidden = false;
            learningArea.hidden = false;
            questionPanel.hidden = false;
            resultPanel.hidden = true;
            renderQuestion({focus: false});
            root.requestAnimationFrame(() => {
                updateTrainPosition(false);
                scrollToScene();
                guidedJourneyTimer = root.setTimeout(() => {
                    guidedJourneyTimer = null;
                    scrollToQuestion();
                }, GUIDED_INITIAL_SCENE_PAUSE_MS);
            });
        }

        query("[data-replay]").addEventListener("click", startGame);
        query("[data-result-quit]").addEventListener("click", () => {
            if (gameConsole) {
                gameConsole.exit();
            }
            returnToCatalogue();
        });
        nextButton.addEventListener("click", () => continueJourney(false));
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
        root.addEventListener("resize", () => {
            if (!gamePanel.hidden) {
                updateTrainPosition(false);
            }
        });

        updateSavedProgress();
        updateSoundButton();
        startGame();
        root.setTimeout(() => {
            if (gameConsole && !gameConsole.isActive) {
                gameConsole.enter();
            }
        }, 0);
    }

    const api = {
        ALLOWED_TABLES,
        LEVELS,
        QUESTION_COUNT,
        GUIDED_INITIAL_SCENE_PAUSE_MS,
        GUIDED_CORRECTION_PAUSE_MS,
        TRAIN_TRAVEL_DURATION_MS,
        TRAIN_WHEEL_DIAMETER_PX,
        shuffle,
        createAnswerOptions,
        createGameQuestions,
        createRoundState,
        nextAvailableLevelIndex,
        evaluateAnswer,
        advanceRound,
        scoreToLargeStars,
        calculateTrainOffset,
        calculateTrainTravelDistance,
        calculateWheelRotation,
        multiplicationExplanation,
        mountGame
    };

    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", () => mountGame(root.document));
        } else {
            mountGame(root.document);
        }
    }

    root.MultiplicationTrainGame = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : window);
