package cd.portailmath.content.application;

import cd.portailmath.content.domain.Exercise;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ExerciseAnswerService {

    private final CourseCatalogService catalogService;

    public ExerciseAnswerService(CourseCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    public ValidationResult validate(String courseId, String exerciseId, int round, Object answer) {
        if (catalogService.findCourseById(courseId).isEmpty()) {
            return ValidationResult.courseNotFound();
        }
        Exercise exercise = catalogService.findExerciseById(courseId, exerciseId).orElse(null);
        if (exercise == null) {
            return ValidationResult.exerciseNotFound();
        }
        if (round < 0 || answer == null) {
            return ValidationResult.invalidRequest();
        }

        Map<String, Object> serverData = exercise.serverData();
        Object expected = answerAt(serverData, round);
        List<?> acceptedAnswers = acceptedAnswers(serverData, round);
        if (expected == null && acceptedAnswers == null) {
            return ValidationResult.invalidRequest();
        }
        if (acceptedAnswers != null) {
            boolean accepted = acceptedAnswers.stream().anyMatch(candidate -> Objects.deepEquals(candidate, answer));
            return ValidationResult.valid(accepted);
        }
        return ValidationResult.valid(Objects.deepEquals(expected, answer));
    }

    private Object answerAt(Map<String, Object> serverData, int round) {
        Object answers = serverData.get("answers");
        if (!(answers instanceof List<?> answerList) || round >= answerList.size()) {
            return null;
        }
        return answerList.get(round);
    }

    private List<?> acceptedAnswers(Map<String, Object> serverData, int round) {
        Object acceptedAnswers = serverData.get("acceptedAnswers");
        if (!(acceptedAnswers instanceof List<?> answersByRound) || round >= answersByRound.size()) {
            return null;
        }
        Object roundAnswers = answersByRound.get(round);
        return roundAnswers instanceof List<?> answerList ? answerList : null;
    }

    public record ValidationResult(Status status, boolean correct) {
        public static ValidationResult valid(boolean correct) {
            return new ValidationResult(Status.VALID, correct);
        }

        public static ValidationResult courseNotFound() {
            return new ValidationResult(Status.COURSE_NOT_FOUND, false);
        }

        public static ValidationResult exerciseNotFound() {
            return new ValidationResult(Status.EXERCISE_NOT_FOUND, false);
        }

        public static ValidationResult invalidRequest() {
            return new ValidationResult(Status.INVALID_REQUEST, false);
        }
    }

    public enum Status {
        VALID,
        COURSE_NOT_FOUND,
        EXERCISE_NOT_FOUND,
        INVALID_REQUEST
    }
}
