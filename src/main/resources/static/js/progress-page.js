(() => {
    "use strict";

    const root = document.querySelector("[data-progress-page]");
    if (!root || !window.ProgressStore) {
        return;
    }

    const statusLabels = {
        NOT_STARTED: "Non commencé",
        IN_PROGRESS: "En progression",
        TO_REVIEW: "À revoir",
        MASTERED: "Maîtrisé"
    };

    function formatDate(value) {
        if (!value) {
            return "—";
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(date);
    }

    function render() {
        const summary = window.ProgressStore.getGlobalSummary();
        root.querySelector("[data-summary-started]").textContent = summary.startedSubjects;
        root.querySelector("[data-summary-average]").textContent =
            `${summary.bestAveragePercentage} %`;
        root.querySelector("[data-summary-correct]").textContent = summary.totalCorrectAnswers;
        root.querySelector("[data-summary-review]").textContent = summary.questionsToReview;

        root.querySelectorAll("[data-progress-subject]").forEach((card) => {
            const progress = window.ProgressStore.findBySubject(card.dataset.progressSubject);
            const status = progress?.status || "NOT_STARTED";
            const statusBadge = card.querySelector("[data-progress-status]");
            statusBadge.textContent = statusLabels[status];
            statusBadge.className =
                `local-progress-badge local-progress-badge--${status.toLowerCase().replaceAll("_", "-")}`;

            const started = Boolean(progress && progress.attemptCount > 0);
            card.querySelector("[data-progress-empty]").hidden = started;
            card.querySelector("[data-progress-metrics]").hidden = !started;
            card.querySelector("[data-progress-last]").textContent =
                started ? `${progress.lastScore}/5` : "0/5";
            card.querySelector("[data-progress-best]").textContent =
                started ? `${progress.bestScore}/5` : "0/5";
            card.querySelector("[data-progress-attempts]").textContent =
                started ? progress.attemptCount : 0;
            card.querySelector("[data-progress-date]").textContent =
                started ? formatDate(progress.lastActivityAt || progress.lastAttemptAt) : "—";

            const primary = card.querySelector("[data-progress-primary]");
            primary.textContent = started ? "Continuer" : "Commencer";

            const review = card.querySelector("[data-progress-review]");
            const reviewAvailable = Boolean(
                started
                && (progress.reviewSourceQuizId || progress.lastQuizId)
                && progress.lastFailedQuestionIds.length
            );
            review.hidden = !reviewAvailable;
            review.dataset.sourceQuizId = reviewAvailable
                ? (progress.reviewSourceQuizId || progress.lastQuizId)
                : "";
        });
    }

    async function startReview(button) {
        button.disabled = true;
        const card = button.closest("[data-progress-subject]");
        const message = card.querySelector("[data-progress-message]");
        message.textContent = "Préparation de ta révision…";
        try {
            const response = await fetch(
                `/api/v1/exetat/quizzes/${encodeURIComponent(button.dataset.sourceQuizId)}/reviews`,
                {method: "POST", headers: {"Content-Type": "application/json"}}
            );
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "La révision n’est plus disponible.");
            }
            const subjectId = encodeURIComponent(card.dataset.progressSubject);
            window.location.assign(
                `/exetat/matieres/${subjectId}/quiz?quizId=${encodeURIComponent(payload.quizId)}`
            );
        } catch (error) {
            message.textContent = `${error.message} Termine un nouveau quiz pour actualiser tes erreurs.`;
            button.disabled = false;
        }
    }

    root.querySelectorAll("[data-progress-review]").forEach((button) => {
        button.addEventListener("click", () => startReview(button));
    });

    root.querySelector("[data-progress-reset]").addEventListener("click", () => {
        const confirmed = window.confirm(
            "Cette action supprimera tous les scores enregistrés sur cet appareil. Continuer ?"
        );
        if (!confirmed) {
            return;
        }
        window.ProgressStore.clearAll();
        render();
        root.querySelector("[data-reset-confirmation]").hidden = false;
    });

    render();
})();
