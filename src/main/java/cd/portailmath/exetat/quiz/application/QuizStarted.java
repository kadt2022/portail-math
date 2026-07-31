package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.quiz.domain.QuizMode;
import cd.portailmath.exetat.quiz.domain.QuizStatus;

import java.util.UUID;

public record QuizStarted(
        UUID quizId,
        UUID sourceQuizId,
        String subjectId,
        String subjectName,
        QuizMode mode,
        int totalQuestions,
        int currentQuestionNumber,
        QuizStatus status
) {
}
