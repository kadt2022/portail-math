package cd.portailmath.content.web.response;

import java.util.List;

public record ModuleDetailResponse(
        String id,
        String title,
        String description,
        List<LessonSummaryResponse> lessons
) {
}
