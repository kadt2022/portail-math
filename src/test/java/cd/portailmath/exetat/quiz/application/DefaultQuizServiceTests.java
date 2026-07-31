package cd.portailmath.exetat.quiz.application;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.quiz.domain.AnswerStatus;
import cd.portailmath.exetat.quiz.domain.QuizMode;
import cd.portailmath.exetat.quiz.domain.QuizStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

@SpringBootTest
class DefaultQuizServiceTests {

    @Autowired
    private QuizService quizService;

    @Autowired
    private ExetatCatalogService catalogService;

    @Test
    void startsAQuizWithFiveOrderedQuestions() {
        QuizStarted started = quizService.startQuiz("cercle");
        CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());

        assertThat(started.subjectId()).isEqualTo("cercle");
        assertThat(started.totalQuestions()).isEqualTo(5);
        assertThat(started.currentQuestionNumber()).isEqualTo(1);
        assertThat(started.mode()).isEqualTo(QuizMode.STANDARD);
        assertThat(started.sourceQuizId()).isNull();
        assertThat(started.status()).isEqualTo(QuizStatus.IN_PROGRESS);
        assertThat(current.question().id()).isEqualTo("cercle-001");
        assertThat(current.answered()).isFalse();
        assertThat(current.answerResult()).isNull();
    }

    @Test
    void rejectsAnUnknownSubject() {
        QuizException exception = catchThrowableOfType(
                () -> quizService.startQuiz("inconnue"),
                QuizException.class
        );

        assertThat(exception.getCode()).isEqualTo(QuizErrorCode.SUBJECT_NOT_FOUND);
    }

    @Test
    void returnsImmediateCorrectionAndRejectsASecondAnswer() {
        QuizStarted started = quizService.startQuiz("cercle");
        AnswerResult result = quizService.submitAnswer(started.quizId(), "cercle-001", "C");

        assertThat(result.status()).isEqualTo(AnswerStatus.SUCCESS);
        assertThat(result.correct()).isTrue();
        assertThat(result.score()).isEqualTo(1);
        assertThat(result.correctChoiceId()).isEqualTo("C");
        assertThat(result.solution().steps()).isNotEmpty();

        QuizException exception = catchThrowableOfType(
                () -> quizService.submitAnswer(started.quizId(), "cercle-001", "A"),
                QuizException.class
        );
        assertThat(exception.getCode()).isEqualTo(QuizErrorCode.QUESTION_ALREADY_ANSWERED);
    }

    @Test
    void rejectsInvalidChoiceAndNonCurrentQuestion() {
        QuizStarted invalidChoiceQuiz = quizService.startQuiz("cercle");
        QuizException invalidChoice = catchThrowableOfType(
                () -> quizService.submitAnswer(invalidChoiceQuiz.quizId(), "cercle-001", "Z"),
                QuizException.class
        );
        assertThat(invalidChoice.getCode()).isEqualTo(QuizErrorCode.ANSWER_CHOICE_NOT_FOUND);
        AnswerResult incorrect = quizService.submitAnswer(
                invalidChoiceQuiz.quizId(),
                "cercle-001",
                "A"
        );
        assertThat(incorrect.status()).isEqualTo(AnswerStatus.FAILURE);
        assertThat(incorrect.score()).isZero();

        QuizStarted wrongQuestionQuiz = quizService.startQuiz("cercle");
        QuizException wrongQuestion = catchThrowableOfType(
                () -> quizService.submitAnswer(wrongQuestionQuiz.quizId(), "cercle-002", "A"),
                QuizException.class
        );
        assertThat(wrongQuestion.getCode()).isEqualTo(QuizErrorCode.QUESTION_NOT_CURRENT);
    }

    @Test
    void requiresAnAnswerBeforeMovingOrShowingAResult() {
        QuizStarted started = quizService.startQuiz("droite");

        QuizException moveError = catchThrowableOfType(
                () -> quizService.moveToNextQuestion(started.quizId()),
                QuizException.class
        );
        assertThat(moveError.getCode()).isEqualTo(QuizErrorCode.CURRENT_QUESTION_NOT_ANSWERED);

        QuizException resultError = catchThrowableOfType(
                () -> quizService.getResult(started.quizId()),
                QuizException.class
        );
        assertThat(resultError.getCode()).isEqualTo(QuizErrorCode.QUIZ_NOT_COMPLETED);
    }

    @Test
    void completesFiveQuestionsAndCalculatesTheFinalScore() {
        QuizStarted started = quizService.startQuiz("cercle");

        for (int index = 0; index < 5; index++) {
            CurrentQuestion current = quizService.getCurrentQuestion(started.quizId());
            Question question = catalogService.findQuestionById("cercle", current.question().id()).orElseThrow();
            AnswerResult answer = quizService.submitAnswer(
                    started.quizId(),
                    question.id(),
                    question.correctChoiceId()
            );
            if (answer.hasNextQuestion()) {
                QuizProgress progress = quizService.moveToNextQuestion(started.quizId());
                assertThat(progress.currentQuestionNumber()).isEqualTo(index + 2);
            }
        }

        QuizResult result = quizService.getResult(started.quizId());
        assertThat(result.status()).isEqualTo(QuizStatus.COMPLETED);
        assertThat(result.score()).isEqualTo(5);
        assertThat(result.totalQuestions()).isEqualTo(5);
        assertThat(result.percentage()).isEqualTo(100);
        assertThat(result.correctAnswers()).isEqualTo(5);
        assertThat(result.incorrectAnswers()).isZero();
        assertThat(result.failedQuestionIds()).isEmpty();
        assertThat(result.correctedQuestionIds()).isEmpty();
        assertThat(result.appreciation()).isEqualTo("Excellent");
        assertThat(result.completedAt()).isNotNull();

        QuizException completedError = catchThrowableOfType(
                () -> quizService.moveToNextQuestion(started.quizId()),
                QuizException.class
        );
        assertThat(completedError.getCode()).isEqualTo(QuizErrorCode.QUIZ_ALREADY_COMPLETED);
    }
}
