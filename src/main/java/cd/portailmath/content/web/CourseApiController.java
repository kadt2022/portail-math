package cd.portailmath.content.web;

import cd.portailmath.content.application.CourseCatalogService;
import cd.portailmath.content.web.response.ContentApiErrorResponse;
import cd.portailmath.content.web.response.CourseSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    public CourseApiController(CourseCatalogService catalogService, CourseApiMapper mapper) {
        this.catalogService = catalogService;
        this.mapper = mapper;
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

    private ResponseEntity<Object> notFound(
            String code,
            String message,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(404)
                .body(new ContentApiErrorResponse(code, message, request.getRequestURI()));
    }
}
