package cd.portailmath.exetat.web;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.web.response.ApiErrorResponse;
import cd.portailmath.exetat.web.response.PublicQuestionResponse;
import cd.portailmath.exetat.web.response.SubjectSummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/exetat/matieres")
public class ExetatApiController {

    private final ExetatCatalogService catalogService;
    private final ExetatApiMapper mapper;

    public ExetatApiController(ExetatCatalogService catalogService, ExetatApiMapper mapper) {
        this.catalogService = catalogService;
        this.mapper = mapper;
    }

    @GetMapping
    public List<SubjectSummaryResponse> findAllSubjects() {
        return catalogService.findAllSubjects().stream()
                .map(mapper::toSummary)
                .toList();
    }

    @GetMapping("/{subjectId}")
    public ResponseEntity<?> findSubject(
            @PathVariable String subjectId,
            HttpServletRequest request
    ) {
        return catalogService.findSubjectById(subjectId)
                .<ResponseEntity<?>>map(subject -> ResponseEntity.ok(mapper.toDetail(subject)))
                .orElseGet(() -> subjectNotFound(request));
    }

    @GetMapping("/{subjectId}/questions")
    public ResponseEntity<?> findQuestions(
            @PathVariable String subjectId,
            HttpServletRequest request
    ) {
        if (catalogService.findSubjectById(subjectId).isEmpty()) {
            return subjectNotFound(request);
        }
        List<PublicQuestionResponse> questions = catalogService.findQuestionsBySubject(subjectId).stream()
                .map(mapper::toPublicQuestion)
                .toList();
        return ResponseEntity.ok(questions);
    }

    private ResponseEntity<ApiErrorResponse> subjectNotFound(HttpServletRequest request) {
        return ResponseEntity.status(404).body(new ApiErrorResponse(
                "SUBJECT_NOT_FOUND",
                "La matière demandée est introuvable.",
                request.getRequestURI()
        ));
    }
}

