package cd.portailmath.exetat.domain;

import java.util.List;

public record Question(
        String id,
        String subjectId,
        String topic,
        Difficulty difficulty,
        String statement,
        List<AnswerChoice> choices,
        String correctChoiceId,
        Solution solution,
        int points
) {
    public Question {
        choices = choices == null ? List.of() : List.copyOf(choices);
    }
}

