package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.quiz.domain.QuizMode;

import java.util.UUID;

public record CurrentQuestionResponse(
        UUID quizId,
        UUID sourceQuizId,
        QuizMode mode,
        int questionNumber,
        int totalQuestions,
        QuizQuestionResponse question,
        int score,
        boolean answered,
        AnswerResultResponse answerResult
) {
}
