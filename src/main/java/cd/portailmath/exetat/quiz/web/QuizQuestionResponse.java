package cd.portailmath.exetat.quiz.web;

import cd.portailmath.exetat.web.response.AnswerChoiceResponse;

import java.util.List;

public record QuizQuestionResponse(
        String id,
        String topic,
        String difficulty,
        String statement,
        List<AnswerChoiceResponse> choices,
        int points
) {
}
