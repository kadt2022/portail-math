package cd.portailmath.content.domain;

import java.util.List;
import java.util.Map;

public record Activity(
        String id,
        String type,
        String title,
        String instructions,
        Map<String, Object> data,
        List<Exercise> exercises
) {
    public Activity {
        data = data == null ? Map.of() : Map.copyOf(data);
        exercises = exercises == null ? List.of() : List.copyOf(exercises);
    }
}
