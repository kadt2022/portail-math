package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.quiz.domain.QuizStatus;

import java.util.UUID;

public record QuizProgress(
        UUID quizId,
        QuizStatus status,
        int currentQuestionNumber,
        int totalQuestions
) {
}

