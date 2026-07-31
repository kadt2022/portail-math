package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.domain.Solution;
import cd.portailmath.exetat.quiz.application.AnswerResult;
import cd.portailmath.exetat.quiz.application.CurrentQuestion;
import cd.portailmath.exetat.web.response.AnswerChoiceResponse;

final class QuizApiMapper {

    private QuizApiMapper() {
    }

    static CurrentQuestionResponse toResponse(CurrentQuestion current) {
        return new CurrentQuestionResponse(
                current.quizId(),
                current.sourceQuizId(),
                current.mode(),
                current.questionNumber(),
                current.totalQuestions(),
                toResponse(current.question()),
                current.score(),
                current.answered(),
                current.answerResult() == null ? null : toResponse(current.answerResult())
        );
    }

    static AnswerResultResponse toResponse(AnswerResult result) {
        return new AnswerResultResponse(
                result.quizId(),
                result.questionId(),
                result.status(),
                result.correct(),
                result.selectedChoiceId(),
                result.correctChoiceId(),
                result.correctChoiceLabel(),
                toResponse(result.solution()),
                result.score(),
                result.correctAnswers(),
                result.answeredQuestions(),
                result.totalQuestions(),
                result.hasNextQuestion()
        );
    }

    private static QuizQuestionResponse toResponse(Question question) {
        return new QuizQuestionResponse(
                question.id(),
                question.topic(),
                question.difficulty().name(),
                question.statement(),
                question.choices().stream()
                        .map(choice -> new AnswerChoiceResponse(choice.id(), choice.label()))
                        .toList(),
                question.points()
        );
    }

    private static SolutionResponse toResponse(Solution solution) {
        return new SolutionResponse(
                solution.summary(),
                solution.steps(),
                solution.formula(),
                solution.advice()
        );
    }
}
