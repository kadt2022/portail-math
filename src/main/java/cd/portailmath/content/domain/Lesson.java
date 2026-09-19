package cd.portailmath.content.domain;

import java.util.List;

public record Lesson(
        String id,
        String title,
        String objective,
        List<Activity> activities
) {
    public Lesson {
        activities = activities == null ? List.of() : List.copyOf(activities);
    }
}
