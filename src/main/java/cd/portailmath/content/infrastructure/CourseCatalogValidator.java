package cd.portailmath.content.infrastructure;

import cd.portailmath.content.domain.Activity;
import cd.portailmath.content.domain.Course;
import cd.portailmath.content.domain.CourseModule;
import cd.portailmath.content.domain.Exercise;
import cd.portailmath.content.domain.Lesson;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class CourseCatalogValidator {

    private static final String DUPLICATED_SUFFIX = " est dupliqué.";
    private static final String REQUIRED_SUFFIX = " est obligatoire.";

    public void validate(List<Course> courses) {
        require(courses != null && !courses.isEmpty(), "Le catalogue de cours ne peut pas être vide.");
        Set<String> courseIds = new HashSet<>();
        for (Course course : courses) {
            validateCourse(course);
            require(courseIds.add(course.id()), "L’identifiant de cours " + course.id() + DUPLICATED_SUFFIX);
        }
    }

    private void validateCourse(Course course) {
        require(course != null, "Un cours ne peut pas être absent.");
        require(hasText(course.id()), "L’identifiant du cours" + REQUIRED_SUFFIX);
        require(hasText(course.title()), "Le titre du cours " + course.id() + REQUIRED_SUFFIX);
        require(hasText(course.level()), "Le niveau du cours " + course.id() + REQUIRED_SUFFIX);
        require(hasText(course.description()), "La description du cours " + course.id() + REQUIRED_SUFFIX);
        require(!course.modules().isEmpty(), "Le cours " + course.id() + " doit contenir au moins un module.");

        Set<String> moduleIds = new HashSet<>();
        Set<String> lessonIds = new HashSet<>();
        Set<String> activityIds = new HashSet<>();
        Set<String> exerciseIds = new HashSet<>();
        for (CourseModule module : course.modules()) {
            require(module != null && hasText(module.id()) && hasText(module.title()),
                    "Chaque module du cours " + course.id() + " doit avoir un identifiant et un titre.");
            require(moduleIds.add(module.id()), "L’identifiant de module " + module.id() + DUPLICATED_SUFFIX);
            require(!module.lessons().isEmpty(), "Le module " + module.id() + " doit contenir au moins une leçon.");
            validateLessons(module.lessons(), lessonIds, activityIds, exerciseIds);
        }
    }

    private void validateLessons(
            List<Lesson> lessons,
            Set<String> lessonIds,
            Set<String> activityIds,
            Set<String> exerciseIds
    ) {
        for (Lesson lesson : lessons) {
            require(lesson != null && hasText(lesson.id()) && hasText(lesson.title()) && hasText(lesson.objective()),
                    "Chaque leçon doit avoir un identifiant, un titre et un objectif.");
            require(lessonIds.add(lesson.id()), "L’identifiant de leçon " + lesson.id() + DUPLICATED_SUFFIX);
            require(!lesson.activities().isEmpty(), "La leçon " + lesson.id() + " doit contenir au moins une activité.");
            for (Activity activity : lesson.activities()) {
                require(activity != null && hasText(activity.id()) && hasText(activity.type())
                                && hasText(activity.title()) && hasText(activity.instructions()),
                        "Chaque activité de la leçon " + lesson.id() + " doit être complète.");
                require(activityIds.add(activity.id()), "L’identifiant d’activité " + activity.id() + DUPLICATED_SUFFIX);
                for (Exercise exercise : activity.exercises()) {
                    validateExercise(exercise, exerciseIds);
                }
            }
        }
    }

    private void validateExercise(Exercise exercise, Set<String> exerciseIds) {
        require(exercise != null && hasText(exercise.id()) && hasText(exercise.type()),
                "Chaque exercice doit avoir un identifiant et un type.");
        require(exerciseIds.add(exercise.id()), "L’identifiant d’exercice " + exercise.id() + DUPLICATED_SUFFIX);
        require(!exercise.data().isEmpty(),
                "L’exercice " + exercise.id() + " doit fournir des données au composant frontend.");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }
}
