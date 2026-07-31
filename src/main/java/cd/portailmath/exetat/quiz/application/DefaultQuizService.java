package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.AnswerChoice;
import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.domain.SubjectStatus;
import cd.portailmath.exetat.quiz.domain.AnswerStatus;
import cd.portailmath.exetat.quiz.domain.QuizAnswer;
import cd.portailmath.exetat.quiz.domain.QuizAttempt;
import cd.portailmath.exetat.quiz.domain.QuizMode;
import cd.portailmath.exetat.quiz.domain.QuizStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class DefaultQuizService implements QuizService {

    static final int QUIZ_QUESTION_COUNT = 5;
    private static final Duration ATTEMPT_RETENTION = Duration.ofHours(2);

    private final ExetatCatalogService catalogService;
    private final QuizAttemptRepository attemptRepository;

    public DefaultQuizService(
            ExetatCatalogService catalogService,
            QuizAttemptRepository attemptRepository
    ) {
        this.catalogService = catalogService;
        this.attemptRepository = attemptRepository;
    }

    @Override
    public QuizStarted startQuiz(String subjectId) {
        ExetatSubject subject = catalogService.findSubjectById(subjectId)
                .filter(candidate -> candidate.status() == SubjectStatus.AVAILABLE)
                .orElseThrow(() -> new QuizException(QuizErrorCode.SUBJECT_NOT_FOUND));

        List<Question> questions = catalogService.findQuestionsBySubject(subjectId);
        if (questions.size() != QUIZ_QUESTION_COUNT) {
            throw new IllegalStateException("Une matière disponible doit contenir exactement cinq questions.");
        }

        Instant now = Instant.now();
        attemptRepository.deleteStartedBefore(now.minus(ATTEMPT_RETENTION));
        QuizAttempt attempt = new QuizAttempt(
                UUID.randomUUID(),
                QuizMode.STANDARD,
                null,
                subjectId,
                questions.stream().map(Question::id).toList(),
                now
        );
        attemptRepository.save(attempt);

        return new QuizStarted(
                attempt.getId(),
                attempt.getSourceQuizId(),
                subject.id(),
                subject.name(),
                attempt.getMode(),
                attempt.getQuestionIds().size(),
                attempt.getCurrentQuestionNumber(),
                attempt.getStatus()
        );
    }

    @Override
    public QuizStarted startReview(UUID sourceQuizId) {
        QuizAttempt source = requireAttempt(sourceQuizId);
        synchronized (source) {
            if (source.getStatus() != QuizStatus.COMPLETED) {
                throw new QuizException(QuizErrorCode.QUIZ_NOT_COMPLETED);
            }
            List<String> failedQuestionIds = source.getAnswers().stream()
                    .filter(answer -> !answer.correct())
                    .map(QuizAnswer::questionId)
                    .toList();
            if (failedQuestionIds.isEmpty()) {
                throw new QuizException(QuizErrorCode.NO_FAILED_QUESTIONS);
            }
            ExetatSubject subject = catalogService.findSubjectById(source.getSubjectId())
                    .orElseThrow(() -> new QuizException(QuizErrorCode.SUBJECT_NOT_FOUND));
            QuizAttempt review = new QuizAttempt(
                    UUID.randomUUID(),
                    QuizMode.REVIEW,
                    source.getId(),
                    source.getSubjectId(),
                    failedQuestionIds,
                    Instant.now()
            );
            attemptRepository.save(review);
            return new QuizStarted(
                    review.getId(),
                    source.getId(),
                    subject.id(),
                    subject.name(),
                    review.getMode(),
                    review.getQuestionIds().size(),
                    review.getCurrentQuestionNumber(),
                    review.getStatus()
            );
        }
    }

    @Override
    public CurrentQuestion getCurrentQuestion(UUID quizId) {
        QuizAttempt attempt = requireAttempt(quizId);
        synchronized (attempt) {
            Question question = requireCurrentQuestion(attempt);
            AnswerResult answerResult = attempt.findAnswer(question.id())
                    .map(answer -> toAnswerResult(attempt, question, answer))
                    .orElse(null);
            return new CurrentQuestion(
                    attempt.getId(),
                    attempt.getSourceQuizId(),
                    attempt.getMode(),
                    attempt.getCurrentQuestionNumber(),
                    attempt.getQuestionIds().size(),
                    question,
                    attempt.getScore(),
                    answerResult != null,
                    answerResult
            );
        }
    }

    @Override
    public AnswerResult submitAnswer(
            UUID quizId,
            String questionId,
            String selectedChoiceId
    ) {
        QuizAttempt attempt = requireAttempt(quizId);
        synchronized (attempt) {
            if (attempt.getStatus() == QuizStatus.COMPLETED) {
                throw new QuizException(QuizErrorCode.QUIZ_ALREADY_COMPLETED);
            }
            if (!attempt.getCurrentQuestionId().equals(questionId)) {
                throw new QuizException(QuizErrorCode.QUESTION_NOT_CURRENT);
            }
            if (attempt.findAnswer(questionId).isPresent()) {
                throw new QuizException(QuizErrorCode.QUESTION_ALREADY_ANSWERED);
            }

            Question question = requireCurrentQuestion(attempt);
            boolean choiceExists = question.choices().stream()
                    .map(AnswerChoice::id)
                    .anyMatch(choiceId -> choiceId.equals(selectedChoiceId));
            if (!choiceExists) {
                throw new QuizException(QuizErrorCode.ANSWER_CHOICE_NOT_FOUND);
            }

            boolean correct = question.correctChoiceId().equals(selectedChoiceId);
            QuizAnswer answer = new QuizAnswer(
                    question.id(),
                    selectedChoiceId,
                    question.correctChoiceId(),
                    correct,
                    correct ? question.points() : 0,
                    Instant.now()
            );
            attempt.recordAnswer(answer);
            attemptRepository.save(attempt);
            return toAnswerResult(attempt, question, answer);
        }
    }

    @Override
    public QuizProgress moveToNextQuestion(UUID quizId) {
        QuizAttempt attempt = requireAttempt(quizId);
        synchronized (attempt) {
            if (attempt.getStatus() == QuizStatus.COMPLETED) {
                throw new QuizException(QuizErrorCode.QUIZ_ALREADY_COMPLETED);
            }
            if (!attempt.isCurrentQuestionAnswered()) {
                throw new QuizException(QuizErrorCode.CURRENT_QUESTION_NOT_ANSWERED);
            }
            attempt.moveToNextQuestion();
            attemptRepository.save(attempt);
            return new QuizProgress(
                    attempt.getId(),
                    attempt.getStatus(),
                    attempt.getCurrentQuestionNumber(),
                    attempt.getQuestionIds().size()
            );
        }
    }

    @Override
    public QuizResult getResult(UUID quizId) {
        QuizAttempt attempt = requireAttempt(quizId);
        synchronized (attempt) {
            if (attempt.getStatus() != QuizStatus.COMPLETED) {
                throw new QuizException(QuizErrorCode.QUIZ_NOT_COMPLETED);
            }
            ExetatSubject subject = catalogService.findSubjectById(attempt.getSubjectId())
                    .orElseThrow(() -> new QuizException(QuizErrorCode.SUBJECT_NOT_FOUND));
            int totalQuestions = attempt.getQuestionIds().size();
            int correctAnswers = (int) attempt.getAnswers().stream()
                    .filter(QuizAnswer::correct)
                    .count();
            List<String> failedQuestionIds = attempt.getAnswers().stream()
                    .filter(answer -> !answer.correct())
                    .map(QuizAnswer::questionId)
                    .toList();
            List<String> correctedQuestionIds = attempt.getMode() == QuizMode.REVIEW
                    ? attempt.getAnswers().stream()
                    .filter(QuizAnswer::correct)
                    .map(QuizAnswer::questionId)
                    .toList()
                    : List.of();
            int percentage = attempt.getScore() * 100 / totalQuestions;
            return new QuizResult(
                    attempt.getId(),
                    attempt.getMode(),
                    attempt.getSourceQuizId(),
                    subject.id(),
                    subject.name(),
                    attempt.getStatus(),
                    attempt.getScore(),
                    totalQuestions,
                    percentage,
                    correctAnswers,
                    totalQuestions - correctAnswers,
                    failedQuestionIds,
                    correctedQuestionIds,
                    appreciationFor(percentage),
                    attempt.getStartedAt(),
                    attempt.getCompletedAt()
            );
        }
    }

    private QuizAttempt requireAttempt(UUID quizId) {
        return attemptRepository.findById(quizId)
                .orElseThrow(() -> new QuizException(QuizErrorCode.QUIZ_NOT_FOUND));
    }

    private Question requireCurrentQuestion(QuizAttempt attempt) {
        return catalogService.findQuestionById(
                        attempt.getSubjectId(),
                        attempt.getCurrentQuestionId()
                )
                .orElseThrow(() -> new IllegalStateException("La question de la tentative est introuvable."));
    }

    private AnswerResult toAnswerResult(
            QuizAttempt attempt,
            Question question,
            QuizAnswer answer
    ) {
        String correctChoiceLabel = question.choices().stream()
                .filter(choice -> choice.id().equals(question.correctChoiceId()))
                .map(AnswerChoice::label)
                .findFirst()
                .orElseThrow();
        int correctAnswers = (int) attempt.getAnswers().stream()
                .filter(QuizAnswer::correct)
                .count();
        return new AnswerResult(
                attempt.getId(),
                question.id(),
                answer.correct() ? AnswerStatus.SUCCESS : AnswerStatus.FAILURE,
                answer.correct(),
                answer.selectedChoiceId(),
                answer.correctChoiceId(),
                correctChoiceLabel,
                question.solution(),
                attempt.getScore(),
                correctAnswers,
                attempt.getAnswers().size(),
                attempt.getQuestionIds().size(),
                attempt.getStatus() != QuizStatus.COMPLETED
        );
    }

    private String appreciationFor(int percentage) {
        if (percentage == 100) {
            return "Excellent";
        }
        if (percentage >= 80) {
            return "Très bien";
        }
        if (percentage >= 60) {
            return "Bien";
        }
        if (percentage >= 40) {
            return "À renforcer";
        }
        return "À réviser";
    }
}
