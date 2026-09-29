package cd.portailmath.content.domain;

import java.util.List;

public record CourseModule(
        String id,
        String title,
        String description,
        List<Lesson> lessons
) {
    public CourseModule {
        lessons = lessons == null ? List.of() : List.copyOf(lessons);
    }
}
