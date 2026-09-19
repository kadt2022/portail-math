package cd.portailmath.content.domain;

import java.util.List;

public record Activity(
        String id,
        String type,
        String title,
        String instructions,
        List<Exercise> exercises
) {
    public Activity {
        exercises = exercises == null ? List.of() : List.copyOf(exercises);
    }
}
