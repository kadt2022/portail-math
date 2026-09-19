package cd.portailmath.content.web;

import cd.portailmath.content.application.CourseCatalogService;
import cd.portailmath.content.web.response.ContentApiErrorResponse;
import cd.portailmath.content.web.response.CourseSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseApiController {

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
    public ResponseEntity<?> findCourse(@PathVariable String courseId, HttpServletRequest request) {
        return catalogService.findCourseById(courseId)
                .<ResponseEntity<?>>map(course -> ResponseEntity.ok(mapper.toDetail(course)))
                .orElseGet(() -> notFound("COURSE_NOT_FOUND", "Le cours demandé est introuvable.", request));
    }

    @GetMapping("/{courseId}/modules/{moduleId}")
    public ResponseEntity<?> findModule(
            @PathVariable String courseId,
            @PathVariable String moduleId,
            HttpServletRequest request
    ) {
        if (catalogService.findCourseById(courseId).isEmpty()) {
            return notFound("COURSE_NOT_FOUND", "Le cours demandé est introuvable.", request);
        }
        return catalogService.findModuleById(courseId, moduleId)
                .<ResponseEntity<?>>map(module -> ResponseEntity.ok(mapper.toDetail(module)))
                .orElseGet(() -> notFound("MODULE_NOT_FOUND", "Le module demandé est introuvable.", request));
    }

    @GetMapping("/{courseId}/lessons/{lessonId}")
    public ResponseEntity<?> findLesson(
            @PathVariable String courseId,
            @PathVariable String lessonId,
            HttpServletRequest request
    ) {
        if (catalogService.findCourseById(courseId).isEmpty()) {
            return notFound("COURSE_NOT_FOUND", "Le cours demandé est introuvable.", request);
        }
        return catalogService.findLessonById(courseId, lessonId)
                .<ResponseEntity<?>>map(lesson -> ResponseEntity.ok(mapper.toDetail(lesson)))
                .orElseGet(() -> notFound("LESSON_NOT_FOUND", "La leçon demandée est introuvable.", request));
    }

    private ResponseEntity<ContentApiErrorResponse> notFound(
            String code,
            String message,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(404).body(new ContentApiErrorResponse(code, message, request.getRequestURI()));
    }
}
