package cd.portailmath.exetat.quiz.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class QuizAttempt {

    private final UUID id;
    private final QuizMode mode;
    private final UUID sourceQuizId;
    private final String subjectId;
    private final List<String> questionIds;
    private final Instant startedAt;
    private final List<QuizAnswer> answers = new ArrayList<>();

    private int currentQuestionIndex;
    private int score;
    private QuizStatus status;
    private Instant completedAt;

    public QuizAttempt(UUID id, String subjectId, List<String> questionIds, Instant startedAt) {
        this(id, QuizMode.STANDARD, null, subjectId, questionIds, startedAt);
    }

    public QuizAttempt(
            UUID id,
            QuizMode mode,
            UUID sourceQuizId,
            String subjectId,
            List<String> questionIds,
            Instant startedAt
    ) {
        validate(id, mode, sourceQuizId, subjectId, questionIds, startedAt);
        this.id = id;
        this.mode = mode;
        this.sourceQuizId = sourceQuizId;
        this.subjectId = subjectId;
        this.questionIds = List.copyOf(questionIds);
        this.startedAt = startedAt;
        this.status = QuizStatus.IN_PROGRESS;
    }

    private static void validate(
            UUID id,
            QuizMode mode,
            UUID sourceQuizId,
            String subjectId,
            List<String> questionIds,
            Instant startedAt
    ) {
        if (id == null || mode == null || subjectId == null || subjectId.isBlank()
                || questionIds == null || questionIds.isEmpty() || questionIds.size() > 5
                || startedAt == null || questionIds.stream().anyMatch(questionId ->
                questionId == null || questionId.isBlank())) {
            throw new IllegalArgumentException("Une tentative doit contenir une matière et entre une et cinq questions.");
        }
        if (questionIds.stream().distinct().count() != questionIds.size()) {
            throw new IllegalArgumentException("Les questions d’une tentative doivent être distinctes.");
        }
        if (mode == QuizMode.STANDARD && (questionIds.size() != 5 || sourceQuizId != null)) {
            throw new IllegalArgumentException("Une tentative standard doit contenir cinq questions sans source.");
        }
        if (mode == QuizMode.REVIEW && sourceQuizId == null) {
            throw new IllegalArgumentException("Une révision doit référencer sa tentative d’origine.");
        }
    }

    public UUID getId() {
        return id;
    }

    public QuizMode getMode() {
        return mode;
    }

    public UUID getSourceQuizId() {
        return sourceQuizId;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public List<String> getQuestionIds() {
        return questionIds;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public int getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public int getCurrentQuestionNumber() {
        return currentQuestionIndex + 1;
    }

    public String getCurrentQuestionId() {
        return questionIds.get(currentQuestionIndex);
    }

    public int getScore() {
        return score;
    }

    public QuizStatus getStatus() {
        return status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public List<QuizAnswer> getAnswers() {
        return List.copyOf(answers);
    }

    public Optional<QuizAnswer> findAnswer(String questionId) {
        return answers.stream()
                .filter(answer -> answer.questionId().equals(questionId))
                .findFirst();
    }

    public boolean isCurrentQuestionAnswered() {
        return findAnswer(getCurrentQuestionId()).isPresent();
    }

    public void recordAnswer(QuizAnswer answer) {
        answers.add(answer);
        score += answer.earnedPoints();
        if (answers.size() == questionIds.size()) {
            status = QuizStatus.COMPLETED;
            completedAt = answer.answeredAt();
        }
    }

    public void moveToNextQuestion() {
        currentQuestionIndex += 1;
    }
}
