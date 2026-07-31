package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.domain.Solution;
import cd.portailmath.exetat.quiz.domain.AnswerStatus;

import java.util.UUID;

public record AnswerResult(
        UUID quizId,
        String questionId,
        AnswerStatus status,
        boolean correct,
        String selectedChoiceId,
        String correctChoiceId,
        String correctChoiceLabel,
        Solution solution,
        int score,
        int correctAnswers,
        int answeredQuestions,
        int totalQuestions,
        boolean hasNextQuestion
) {
}

