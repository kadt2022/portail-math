package cd.portailmath.exetat.quiz.infrastructure;

import cd.portailmath.exetat.quiz.application.QuizAttemptRepository;
import cd.portailmath.exetat.quiz.domain.QuizAttempt;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Repository
public class InMemoryQuizAttemptRepository implements QuizAttemptRepository {

    private final ConcurrentMap<UUID, QuizAttempt> attempts = new ConcurrentHashMap<>();

    @Override
    public QuizAttempt save(QuizAttempt attempt) {
        attempts.put(attempt.getId(), attempt);
        return attempt;
    }

    @Override
    public Optional<QuizAttempt> findById(UUID quizId) {
        return Optional.ofNullable(attempts.get(quizId));
    }

    @Override
    public void deleteStartedBefore(Instant threshold) {
        attempts.entrySet().removeIf(entry -> entry.getValue().getStartedAt().isBefore(threshold));
    }
}

