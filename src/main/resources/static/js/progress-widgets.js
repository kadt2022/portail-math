(() => {
    "use strict";

    if (!window.ProgressStore) {
        return;
    }

    const statusLabels = {
        NOT_STARTED: "Non commencé",
        IN_PROGRESS: "En progression",
        TO_REVIEW: "À revoir",
        MASTERED: "Maîtrisé"
    };

    const dashboard = document.querySelector("[data-dashboard-progress]");
    if (dashboard) {
        const summary = window.ProgressStore.getGlobalSummary();
        dashboard.querySelector("[data-dashboard-started]").textContent =
            `${summary.startedSubjects}/4`;
        dashboard.querySelector("[data-dashboard-best]").textContent =
            `${summary.bestResult}/5`;
        dashboard.querySelector("[data-dashboard-correct]").textContent =
            summary.totalCorrectAnswers;
        dashboard.querySelector("[data-dashboard-review]").textContent =
            summary.questionsToReview;
        dashboard.querySelector("[data-dashboard-empty]").hidden =
            summary.startedSubjects > 0;
        dashboard.querySelector("[data-dashboard-active]").hidden =
            summary.startedSubjects === 0;
    }

    document.querySelectorAll("[data-catalog-subject]").forEach((card) => {
        const progress = window.ProgressStore.findBySubject(card.dataset.catalogSubject);
        const status = progress?.status || "NOT_STARTED";
        const badge = card.querySelector("[data-local-status]");
        badge.textContent = statusLabels[status];
        badge.className =
            `local-progress-badge local-progress-badge--${status.toLowerCase().replaceAll("_", "-")}`;
        const best = card.querySelector("[data-local-best]");
        best.hidden = !progress || progress.attemptCount === 0;
        if (!best.hidden) {
            best.textContent = `Meilleur score : ${progress.bestScore}/5`;
        }
    });
})();
