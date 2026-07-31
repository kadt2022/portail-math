package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.quiz.domain.QuizAttempt;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository {

    QuizAttempt save(QuizAttempt attempt);

    Optional<QuizAttempt> findById(UUID quizId);

    void deleteStartedBefore(Instant threshold);
}

