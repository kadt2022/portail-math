(function initializeMultiplicationTrainGame(root) {
    "use strict";

    const QUESTION_COUNT = 5;
    const ALLOWED_TABLES = [2, 5];
    const MOBILE_JOURNEY_QUERY = "(max-width: 620px)";
    const MOBILE_SCENE_PAUSE_MS = 1500;

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

    function createGameQuestions(random = Math.random) {
        const operations = ALLOWED_TABLES.flatMap((table) =>
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

        const setupPanel = rootElement.querySelector("[data-game-setup]");
        const gamePanel = rootElement.querySelector("[data-game-panel]");
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
        const store = root.MultiplicationTrainStore;

        let questions = [];
        let state = createRoundState();
        let soundEnabled = store ? store.load().soundEnabled : true;
        let audioContext = null;
        let travelTimer = null;
        let mobileJourneyTimer = null;

        function query(selector) {
            return rootElement.querySelector(selector);
        }

        function isMobileJourney() {
            return typeof root.matchMedia === "function"
                && root.matchMedia(MOBILE_JOURNEY_QUERY).matches;
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
            scrollToElement(scene);
        }

        function scrollToQuestion() {
            scrollToElement(questionPanel);
            focusWithoutScrolling(questionTitle);
        }

        function scrollToResult() {
            scrollToElement(resultPanel);
            focusWithoutScrolling(resultTitle);
        }

        function clearMobileJourneyTimer() {
            if (mobileJourneyTimer !== null) {
                root.clearTimeout(mobileJourneyTimer);
                mobileJourneyTimer = null;
            }
        }

        function pauseOnTrainThen(callback) {
            clearMobileJourneyTimer();
            root.requestAnimationFrame(scrollToScene);
            mobileJourneyTimer = root.setTimeout(() => {
                mobileJourneyTimer = null;
                callback();
            }, MOBILE_SCENE_PAUSE_MS);
        }

        function updateSavedProgress() {
            const progress = store ? store.load() : {bestScore: 0, gamesPlayed: 0};
            query("[data-best-score]").textContent = `${progress.bestScore}/5`;
            query("[data-games-played]").textContent = String(progress.gamesPlayed);
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
            const trainWidth = train.getBoundingClientRect().width;
            const availableDistance = Math.max(0, scene.clientWidth - trainWidth - 28);
            const offset = calculateTrainOffset(
                state.completedQuestions,
                QUESTION_COUNT,
                availableDistance
            );
            train.style.transform = `translateX(${offset}px)`;
            if (animate) {
                scene.classList.add("is-travelling");
                root.clearTimeout(travelTimer);
                travelTimer = root.setTimeout(() => {
                    scene.classList.remove("is-travelling");
                }, 980);
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
                    if (isMobileJourney()) {
                        nextButton.hidden = true;
                        pauseOnTrainThen(() => continueJourney(true));
                    } else {
                        nextButton.hidden = false;
                        nextButton.focus();
                    }
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
            const progress = store
                ? store.recordGame(state.score)
                : {bestScore: state.score};
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

        function continueJourney(automatic = false) {
            clearMobileJourneyTimer();
            if (state.completedQuestions === QUESTION_COUNT) {
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
            clearMobileJourneyTimer();
            questions = createGameQuestions();
            state = createRoundState();
            setupPanel.hidden = true;
            gamePanel.hidden = false;
            learningArea.hidden = false;
            questionPanel.hidden = false;
            resultPanel.hidden = true;
            const mobileJourney = isMobileJourney();
            renderQuestion({focus: !mobileJourney});
            root.requestAnimationFrame(() => {
                updateTrainPosition(false);
                if (mobileJourney) {
                    scrollToScene();
                    mobileJourneyTimer = root.setTimeout(() => {
                        mobileJourneyTimer = null;
                        scrollToQuestion();
                    }, MOBILE_SCENE_PAUSE_MS);
                }
            });
        }

        function showLevels() {
            clearMobileJourneyTimer();
            gamePanel.hidden = true;
            setupPanel.hidden = false;
            updateSavedProgress();
            query("[data-start-game]").focus();
        }

        query("[data-start-game]").addEventListener("click", startGame);
        query("[data-replay]").addEventListener("click", startGame);
        query("[data-change-level]").addEventListener("click", showLevels);
        query("[data-result-change-level]").addEventListener("click", showLevels);
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
    }

    const api = {
        ALLOWED_TABLES,
        QUESTION_COUNT,
        shuffle,
        createAnswerOptions,
        createGameQuestions,
        createRoundState,
        evaluateAnswer,
        advanceRound,
        scoreToLargeStars,
        calculateTrainOffset,
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
