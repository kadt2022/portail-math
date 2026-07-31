package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.quiz.domain.AnswerStatus;

import java.util.UUID;

public record AnswerResultResponse(
        UUID quizId,
        String questionId,
        AnswerStatus status,
        boolean correct,
        String selectedChoiceId,
        String correctChoiceId,
        String correctChoiceLabel,
        SolutionResponse solution,
        int score,
        int correctAnswers,
        int answeredQuestions,
        int totalQuestions,
        boolean hasNextQuestion
) {
}
