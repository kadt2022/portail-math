(() => {
    "use strict";

    const root = document.querySelector("[data-quiz-root]");
    if (!root) {
        return;
    }

    const elements = {
        loading: root.querySelector("[data-quiz-loading]"),
        error: root.querySelector("[data-quiz-error]"),
        errorMessage: root.querySelector("[data-error-message]"),
        panel: root.querySelector("[data-quiz-panel]"),
        questionNumber: root.querySelector("[data-question-number]"),
        totalQuestions: root.querySelector("[data-total-questions]"),
        score: root.querySelector("[data-score]"),
        scoreTotal: root.querySelector("[data-score-total]"),
        progress: root.querySelector("[data-progress-bar]"),
        heading: root.querySelector("[data-quiz-heading]"),
        reviewNotice: root.querySelector("[data-review-notice]"),
        topic: root.querySelector("[data-question-topic]"),
        difficulty: root.querySelector("[data-question-difficulty]"),
        statement: root.querySelector("[data-question-statement]"),
        choices: root.querySelector("[data-choice-list]"),
        validate: root.querySelector("[data-validate-answer]"),
        next: root.querySelector("[data-next-question]"),
        feedback: root.querySelector("[data-answer-feedback]"),
        feedbackIcon: root.querySelector("[data-feedback-icon]"),
        feedbackKicker: root.querySelector("[data-feedback-kicker]"),
        feedbackTitle: root.querySelector("[data-feedback-title]"),
        selectedAnswer: root.querySelector("[data-selected-answer]"),
        correctAnswer: root.querySelector("[data-correct-answer]"),
        solutionSummary: root.querySelector("[data-solution-summary]"),
        solutionFormula: root.querySelector("[data-solution-formula]"),
        solutionSteps: root.querySelector("[data-solution-steps]"),
        solutionAdvice: root.querySelector("[data-solution-advice]")
    };

    const difficultyLabels = {
        EASY: "Facile",
        INTERMEDIATE: "Intermédiaire",
        HARD: "Difficile"
    };

    let quizId = new URLSearchParams(window.location.search).get("quizId");
    let currentQuestion = null;
    let selectedChoiceId = null;

    async function request(path, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
            ? await response.json()
            : null;

        if (!response.ok) {
            throw new Error(payload?.message || "Le serveur n’a pas pu traiter la demande.");
        }
        return payload;
    }

    async function initialize() {
        try {
            if (!quizId) {
                const started = await request("/api/v1/exetat/quizzes", {
                    method: "POST",
                    body: JSON.stringify({subjectId: root.dataset.subjectId})
                });
                quizId = started.quizId;
                const url = new URL(window.location.href);
                url.searchParams.set("quizId", quizId);
                window.history.replaceState({}, "", url);
            }
            await loadCurrentQuestion();
        } catch (error) {
            showError(error);
        }
    }

    async function loadCurrentQuestion() {
        currentQuestion = await request(
            `/api/v1/exetat/quizzes/${encodeURIComponent(quizId)}/current-question`
        );
        selectedChoiceId = currentQuestion.answerResult?.selectedChoiceId || null;
        renderQuestion();
    }

    function renderQuestion() {
        const question = currentQuestion.question;
        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.panel.hidden = false;
        elements.questionNumber.textContent = currentQuestion.questionNumber;
        elements.totalQuestions.textContent = currentQuestion.totalQuestions;
        elements.score.textContent = currentQuestion.score;
        elements.scoreTotal.textContent = currentQuestion.totalQuestions;
        elements.progress.style.width =
            `${Math.round((currentQuestion.questionNumber / currentQuestion.totalQuestions) * 100)}%`;
        const reviewMode = currentQuestion.mode === "REVIEW";
        elements.heading.textContent = reviewMode
            ? `Révision — ${root.dataset.subjectName}`
            : root.dataset.subjectName;
        elements.reviewNotice.hidden = !reviewMode;
        elements.topic.textContent = question.topic;
        elements.difficulty.textContent = difficultyLabels[question.difficulty] || question.difficulty;
        elements.difficulty.className =
            `difficulty-badge difficulty-badge--${question.difficulty.toLowerCase()}`;
        elements.statement.textContent = question.statement;

        elements.choices.replaceChildren();
        question.choices.forEach((choice) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "quiz-choice";
            button.dataset.choiceId = choice.id;
            button.setAttribute("role", "radio");
            button.setAttribute("aria-checked", String(choice.id === selectedChoiceId));

            const letter = document.createElement("span");
            letter.className = "quiz-choice__letter";
            letter.textContent = choice.id;

            const label = document.createElement("span");
            label.className = "quiz-choice__label";
            label.textContent = choice.label;

            button.append(letter, label);
            if (!currentQuestion.answered) {
                button.addEventListener("click", () => selectChoice(choice.id));
            }
            elements.choices.append(button);
        });

        elements.feedback.hidden = true;
        elements.next.hidden = true;
        elements.validate.hidden = false;
        elements.validate.disabled = !selectedChoiceId;

        if (currentQuestion.answered && currentQuestion.answerResult) {
            renderCorrection(currentQuestion.answerResult);
        }
    }

    function selectChoice(choiceId) {
        selectedChoiceId = choiceId;
        elements.choices.querySelectorAll(".quiz-choice").forEach((button) => {
            const selected = button.dataset.choiceId === choiceId;
            button.classList.toggle("quiz-choice--selected", selected);
            button.setAttribute("aria-checked", String(selected));
        });
        elements.validate.disabled = false;
    }

    async function submitAnswer() {
        if (!selectedChoiceId || !currentQuestion) {
            return;
        }
        elements.validate.disabled = true;
        try {
            const answerResult = await request(
                `/api/v1/exetat/quizzes/${encodeURIComponent(quizId)}/answers`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        questionId: currentQuestion.question.id,
                        selectedChoiceId
                    })
                }
            );
            currentQuestion = {
                ...currentQuestion,
                answered: true,
                score: answerResult.score,
                answerResult
            };
            renderCorrection(answerResult);
        } catch (error) {
            showError(error);
        }
    }

    function renderCorrection(result) {
        const selectedChoice = currentQuestion.question.choices
            .find((choice) => choice.id === result.selectedChoiceId);

        elements.choices.querySelectorAll(".quiz-choice").forEach((button) => {
            const choiceId = button.dataset.choiceId;
            button.disabled = true;
            button.classList.toggle("quiz-choice--selected", choiceId === result.selectedChoiceId);
            button.classList.toggle("quiz-choice--correct", choiceId === result.correctChoiceId);
            button.classList.toggle(
                "quiz-choice--incorrect",
                choiceId === result.selectedChoiceId && !result.correct
            );

            if (choiceId === result.correctChoiceId || choiceId === result.selectedChoiceId) {
                const status = document.createElement("span");
                status.className = "quiz-choice__status";
                status.textContent = choiceId === result.correctChoiceId
                    ? "Bonne réponse"
                    : "Réponse incorrecte";
                button.append(status);
            }
        });

        elements.score.textContent = result.score;
        elements.validate.hidden = true;
        elements.next.hidden = false;
        elements.next.innerHTML = result.hasNextQuestion
            ? 'Question suivante <span aria-hidden="true">→</span>'
            : 'Voir mes résultats <span aria-hidden="true">→</span>';
        elements.feedback.hidden = false;
        elements.feedback.classList.toggle("answer-feedback--correct", result.correct);
        elements.feedback.classList.toggle("answer-feedback--incorrect", !result.correct);
        elements.feedbackIcon.textContent = result.correct ? "✓" : "×";
        const reviewMode = currentQuestion.mode === "REVIEW";
        elements.feedbackKicker.textContent = reviewMode
            ? (result.correct ? "Erreur corrigée" : "À revoir encore une fois")
            : (result.correct ? "Réussi" : "Échec");
        elements.feedbackTitle.textContent = reviewMode
            ? (result.correct
                ? "Tu as trouvé la bonne réponse cette fois."
                : "Lis attentivement la solution avant de continuer.")
            : (result.correct
                ? "Bravo, c’est la bonne réponse !"
                : "Ce n’est pas la bonne réponse.");
        elements.selectedAnswer.textContent =
            `${result.selectedChoiceId}. ${selectedChoice?.label || ""}`;
        elements.correctAnswer.textContent =
            `${result.correctChoiceId}. ${result.correctChoiceLabel}`;
        elements.solutionSummary.textContent = result.solution.summary;
        elements.solutionFormula.textContent = result.solution.formula || "";
        elements.solutionFormula.hidden = !result.solution.formula;
        elements.solutionSteps.replaceChildren();
        result.solution.steps.forEach((step) => {
            const item = document.createElement("li");
            item.textContent = step;
            elements.solutionSteps.append(item);
        });
        elements.solutionAdvice.textContent = result.solution.advice;
        elements.feedback.scrollIntoView({behavior: "smooth", block: "nearest"});
    }

    async function goNext() {
        if (!currentQuestion?.answerResult) {
            return;
        }
        elements.next.disabled = true;
        try {
            if (!currentQuestion.answerResult.hasNextQuestion) {
                window.location.assign(`/exetat/quizzes/${encodeURIComponent(quizId)}/resultats`);
                return;
            }
            await request(`/api/v1/exetat/quizzes/${encodeURIComponent(quizId)}/next`, {
                method: "POST"
            });
            selectedChoiceId = null;
            await loadCurrentQuestion();
            window.scrollTo({top: 0, behavior: "smooth"});
        } catch (error) {
            showError(error);
        } finally {
            elements.next.disabled = false;
        }
    }

    function showError(error) {
        elements.loading.hidden = true;
        elements.panel.hidden = true;
        elements.error.hidden = false;
        elements.errorMessage.textContent = error.message;
    }

    elements.validate.addEventListener("click", submitAnswer);
    elements.next.addEventListener("click", goNext);
    initialize();
})();
