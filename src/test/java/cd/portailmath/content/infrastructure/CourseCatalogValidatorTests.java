package cd.portailmath.content.infrastructure;

import cd.portailmath.content.domain.Activity;
import cd.portailmath.content.domain.Course;
import cd.portailmath.content.domain.CourseModule;
import cd.portailmath.content.domain.Exercise;
import cd.portailmath.content.domain.Lesson;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseCatalogValidatorTests {

    private final CourseCatalogValidator validator = new CourseCatalogValidator();

    @Test
    void allowsTheSameExerciseIdInDifferentCourses() {
        Course primaryThree = course("MATH-3P", "u01l01-practice");
        Course primaryFour = course("MATH-4P", "u01l01-practice");

        assertThatCode(() -> validator.validate(List.of(primaryThree, primaryFour)))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsDuplicateExerciseIdsInsideOneCourse() {
        Course course = course("MATH-4P", "u01l01-practice", "u01l01-practice");
        List<Course> courses = List.of(course);

        assertThatThrownBy(() -> validator.validate(courses))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("L’identifiant d’exercice u01l01-practice est dupliqué.");
    }

    private Course course(String courseId, String... exerciseIds) {
        List<Activity> activities = IntStream.range(0, exerciseIds.length)
                .mapToObj(index -> activity(courseId + "-activity-" + index, exerciseIds[index]))
                .toList();
        Lesson lesson = new Lesson("lesson-1", "Leçon", "Objectif", Map.of(), activities);
        CourseModule module = new CourseModule("module-1", "Module", "Description", List.of(lesson));
        return new Course(courseId, "Cours", "Primaire", "Description", List.of(module));
    }

    private Activity activity(String activityId, String exerciseId) {
        Exercise exercise = new Exercise(
                exerciseId,
                "numeric-question",
                Map.of("prompt", "Question"),
                Map.of("answer", 42)
        );
        return new Activity(activityId, "practice", "Activité", "Consigne", Map.of(), List.of(exercise));
    }
}
