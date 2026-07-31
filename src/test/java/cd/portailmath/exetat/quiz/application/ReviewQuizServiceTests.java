package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.quiz.domain.QuizMode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

@SpringBootTest
class ReviewQuizServiceTests {

    @Autowired
    private QuizService quizService;

    @Autowired
    private ExetatCatalogService catalogService;

    @Test
    void createsAReviewWithOnlyFailedQuestionsAndTracksCorrections() {
        QuizStarted source = completeStandardQuizWithFirstAnswerWrong();
        QuizResult sourceResult = quizService.getResult(source.quizId());
        assertThat(sourceResult.failedQuestionIds()).containsExactly("cercle-001");

        QuizStarted review = quizService.startReview(source.quizId());
        assertThat(review.mode()).isEqualTo(QuizMode.REVIEW);
        assertThat(review.sourceQuizId()).isEqualTo(source.quizId());
        assertThat(review.totalQuestions()).isEqualTo(1);

        CurrentQuestion current = quizService.getCurrentQuestion(review.quizId());
        assertThat(current.mode()).isEqualTo(QuizMode.REVIEW);
        assertThat(current.question().id()).isEqualTo("cercle-001");

        quizService.submitAnswer(review.quizId(), "cercle-001", "C");
        QuizResult result = quizService.getResult(review.quizId());
        assertThat(result.mode()).isEqualTo(QuizMode.REVIEW);
        assertThat(result.sourceQuizId()).isEqualTo(source.quizId());
        assertThat(result.correctedQuestionIds()).containsExactly("cercle-001");
        assertThat(result.failedQuestionIds()).isEmpty();
        assertThat(result.score()).isEqualTo(1);

        QuizResult unchangedSource = quizService.getResult(source.quizId());
        assertThat(unchangedSource.score()).isEqualTo(sourceResult.score());
        assertThat(unchangedSource.failedQuestionIds()).isEqualTo(sourceResult.failedQuestionIds());
    }

    @Test
    void keepsAQuestionToReviewWhenItFailsAgain() {
        QuizStarted source = completeStandardQuizWithFirstAnswerWrong();
        QuizStarted review = quizService.startReview(source.quizId());

        quizService.submitAnswer(review.quizId(), "cercle-001", "A");
        QuizResult result = quizService.getResult(review.quizId());

        assertThat(result.score()).isZero();
        assertThat(result.correctedQuestionIds()).isEmpty();
        assertThat(result.failedQuestionIds()).containsExactly("cercle-001");
    }

    @Test
    void refusesReviewBeforeCompletionOrWithoutErrors() {
        QuizStarted unfinished = quizService.startQuiz("droite");
        QuizException unfinishedError = catchThrowableOfType(
                () -> quizService.startReview(unfinished.quizId()),
                QuizException.class
        );
        assertThat(unfinishedError.getCode()).isEqualTo(QuizErrorCode.QUIZ_NOT_COMPLETED);

        QuizStarted perfect = completePerfectQuiz("droite");
        QuizException perfectError = catchThrowableOfType(
                () -> quizService.startReview(perfect.quizId()),
                QuizException.class
        );
        assertThat(perfectError.getCode()).isEqualTo(QuizErrorCode.NO_FAILED_QUESTIONS);
    }

    private QuizStarted completeStandardQuizWithFirstAnswerWrong() {
        QuizStarted started = quizService.startQuiz("cercle");
        for (int index = 0; index < 5; index++) {
            CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());
            Question question = current.question();
            String choice = index == 0
                    ? question.choices().stream()
                    .map(choiceItem -> choiceItem.id())
                    .filter(choiceId -> !choiceId.equals(question.correctChoiceId()))
                    .findFirst()
                    .orElseThrow()
                    : question.correctChoiceId();
            AnswerResult answer = quizService.submitAnswer(started.quizId(), question.id(), choice);
            if (answer.hasNextQuestion()) {
                quizService.moveToNextQuestion(started.quizId());
            }
        }
        return started;
    }

    private QuizStarted completePerfectQuiz(String subjectId) {
        QuizStarted started = quizService.startQuiz(subjectId);
        for (int index = 0; index < 5; index++) {
            CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());
            Question question = catalogService
                    .findQuestionById(subjectId, current.question().id())
                    .orElseThrow();
            AnswerResult answer = quizService.submitAnswer(
                    started.quizId(),
                    question.id(),
                    question.correctChoiceId()
            );
            if (answer.hasNextQuestion()) {
                quizService.moveToNextQuestion(started.quizId());
            }
        }
        return started;
    }
}
