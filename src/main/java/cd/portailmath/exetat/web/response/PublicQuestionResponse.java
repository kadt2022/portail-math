package cd.portailmath.exetat.web.response;

import java.util.List;

public record PublicQuestionResponse(
        String id,
        String subjectId,
        String topic,
        String difficulty,
        String statement,
        List<AnswerChoiceResponse> choices,
        int points
) {
    public PublicQuestionResponse {
        choices = List.copyOf(choices);
    }
}

