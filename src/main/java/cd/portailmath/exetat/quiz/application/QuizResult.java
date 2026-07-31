package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.quiz.domain.QuizMode;
import cd.portailmath.exetat.quiz.domain.QuizStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizResult(
        UUID quizId,
        QuizMode mode,
        UUID sourceQuizId,
        String subjectId,
        String subjectName,
        QuizStatus status,
        int score,
        int totalQuestions,
        int percentage,
        int correctAnswers,
        int incorrectAnswers,
        List<String> failedQuestionIds,
        List<String> correctedQuestionIds,
        String appreciation,
        Instant startedAt,
        Instant completedAt
) {
    public QuizResult {
        failedQuestionIds = List.copyOf(failedQuestionIds);
        correctedQuestionIds = List.copyOf(correctedQuestionIds);
    }
}
