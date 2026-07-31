package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.quiz.domain.QuizMode;

import java.util.UUID;

public record CurrentQuestion(
        UUID quizId,
        UUID sourceQuizId,
        QuizMode mode,
        int questionNumber,
        int totalQuestions,
        Question question,
        int score,
        boolean answered,
        AnswerResult answerResult
) {
}
