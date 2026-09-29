package cd.portailmath.content.domain;

import java.util.List;

public record Course(
        String id,
        String title,
        String level,
        String description,
        List<CourseModule> modules
) {
    public Course {
        modules = modules == null ? List.of() : List.copyOf(modules);
    }
}
