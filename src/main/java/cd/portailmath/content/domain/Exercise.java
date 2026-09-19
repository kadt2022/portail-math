package cd.portailmath.content.domain;

import java.util.List;

public record Exercise(
        String id,
        String type,
        String prompt,
        List<String> choices,
        String correctAnswer
) {
    public Exercise {
        choices = choices == null ? List.of() : List.copyOf(choices);
    }
}
