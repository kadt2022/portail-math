package cd.portailmath.content.domain;

import java.util.List;
import java.util.Map;

public record Lesson(
        String id,
        String title,
        String objective,
        Map<String, Map<String, Object>> content,
        List<Activity> activities
) {
    public Lesson {
        content = content == null ? Map.of() : Map.copyOf(content);
        activities = activities == null ? List.of() : List.copyOf(activities);
    }
}
