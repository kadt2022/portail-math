package cd.portailmath.content.web;

import cd.portailmath.content.application.CourseCatalogService;
import cd.portailmath.content.application.ExerciseAnswerService;
import cd.portailmath.content.web.request.SubmitExerciseAnswerRequest;
import cd.portailmath.content.web.response.ContentApiErrorResponse;
import cd.portailmath.content.web.response.CourseSummaryResponse;
import cd.portailmath.content.web.response.ExerciseAnswerResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseApiController {

    private static final String COURSE_NOT_FOUND = "COURSE_NOT_FOUND";
    private static final String COURSE_NOT_FOUND_MESSAGE = "Le cours demandé est introuvable.";

    private final CourseCatalogService catalogService;
    private final CourseApiMapper mapper;
    private final ExerciseAnswerService answerService;

    public CourseApiController(
            CourseCatalogService catalogService,
            CourseApiMapper mapper,
            ExerciseAnswerService answerService
    ) {
        this.catalogService = catalogService;
        this.mapper = mapper;
        this.answerService = answerService;
    }

    @GetMapping
    public List<CourseSummaryResponse> findAllCourses() {
        return catalogService.findAllCourses().stream().map(mapper::toSummary).toList();
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<Object> findCourse(@PathVariable String courseId, HttpServletRequest request) {
        return catalogService.findCourseById(courseId)
                .map(course -> ResponseEntity.<Object>ok(mapper.toDetail(course)))
                .orElseGet(() -> notFound(COURSE_NOT_FOUND, COURSE_NOT_FOUND_MESSAGE, request));
    }

    @GetMapping("/{courseId}/modules/{moduleId}")
    public ResponseEntity<Object> findModule(
            @PathVariable String courseId,
            @PathVariable String moduleId,
            HttpServletRequest request
    ) {
        if (catalogService.findCourseById(courseId).isEmpty()) {
            return notFound(COURSE_NOT_FOUND, COURSE_NOT_FOUND_MESSAGE, request);
        }
        return catalogService.findModuleById(courseId, moduleId)
                .map(module -> ResponseEntity.<Object>ok(mapper.toDetail(module)))
                .orElseGet(() -> notFound("MODULE_NOT_FOUND", "Le module demandé est introuvable.", request));
    }

    @GetMapping("/{courseId}/lessons/{lessonId}")
    public ResponseEntity<Object> findLesson(
            @PathVariable String courseId,
            @PathVariable String lessonId,
            @RequestParam(defaultValue = "fr") String lang,
            HttpServletRequest request
    ) {
        if (catalogService.findCourseById(courseId).isEmpty()) {
            return notFound(COURSE_NOT_FOUND, COURSE_NOT_FOUND_MESSAGE, request);
        }
        return catalogService.findLessonById(courseId, lessonId)
                .map(lesson -> ResponseEntity.<Object>ok(mapper.toDetail(lesson, lang)))
                .orElseGet(() -> notFound("LESSON_NOT_FOUND", "La leçon demandée est introuvable.", request));
    }

    @PostMapping("/{courseId}/exercises/{exerciseId}/answers")
    public ResponseEntity<Object> submitExerciseAnswer(
            @PathVariable String courseId,
            @PathVariable String exerciseId,
            @RequestBody SubmitExerciseAnswerRequest answer,
            HttpServletRequest request
    ) {
        int round = answer.round() == null ? 0 : answer.round();
        ExerciseAnswerService.ValidationResult result = answerService.validate(
                courseId,
                exerciseId,
                round,
                answer.answer()
        );
        return switch (result.status()) {
            case VALID -> ResponseEntity.ok(new ExerciseAnswerResponse(result.correct()));
            case COURSE_NOT_FOUND -> notFound(COURSE_NOT_FOUND, COURSE_NOT_FOUND_MESSAGE, request);
            case EXERCISE_NOT_FOUND -> notFound(
                    "EXERCISE_NOT_FOUND",
                    "L'exercice demandé est introuvable.",
                    request
            );
            case INVALID_REQUEST -> ResponseEntity.badRequest().body(new ContentApiErrorResponse(
                    "INVALID_EXERCISE_ANSWER",
                    "La réponse ou la manche demandée est invalide.",
                    request.getRequestURI()
            ));
        };
    }

    private ResponseEntity<Object> notFound(
            String code,
            String message,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(404)
                .body(new ContentApiErrorResponse(code, message, request.getRequestURI()));
    }
}
