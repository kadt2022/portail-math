(() => {
    "use strict";

    const root = document.querySelector("[data-quiz-result]");
    if (!root || !window.ProgressStore) {
        return;
    }

    const failedQuestionIds = [...root.querySelectorAll("[data-failed-question-id]")]
        .map((item) => item.dataset.failedQuestionId);
    const correctedQuestionIds = [...root.querySelectorAll("[data-corrected-question-id]")]
        .map((item) => item.dataset.correctedQuestionId);
    const result = {
        quizId: root.dataset.resultQuizId,
        mode: root.dataset.resultMode,
        subjectId: root.dataset.resultSubjectId,
        subjectName: root.dataset.resultSubjectName,
        score: Number(root.dataset.resultScore),
        totalQuestions: Number(root.dataset.resultTotal),
        correctAnswers: Number(root.dataset.resultCorrect),
        incorrectAnswers: Number(root.dataset.resultIncorrect),
        failedQuestionIds,
        correctedQuestionIds,
        completedAt: root.dataset.resultCompletedAt
    };

    window.ProgressStore.recordQuizResult(result);

    const reviewButton = root.querySelector("[data-review-errors]");
    const reviewMessage = root.querySelector("[data-review-message]");
    reviewButton?.addEventListener("click", async () => {
        reviewButton.disabled = true;
        reviewMessage.textContent = "Préparation de ta révision…";
        try {
            const response = await fetch(
                `/api/v1/exetat/quizzes/${encodeURIComponent(result.quizId)}/reviews`,
                {method: "POST", headers: {"Content-Type": "application/json"}}
            );
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "La révision ne peut pas être créée.");
            }
            window.location.assign(
                `/exetat/matieres/${encodeURIComponent(result.subjectId)}/quiz`
                + `?quizId=${encodeURIComponent(payload.quizId)}`
            );
        } catch (error) {
            reviewMessage.textContent =
                `${error.message} Tu peux recommencer un quiz normal depuis la matière.`;
            reviewButton.disabled = false;
        }
    });
})();
