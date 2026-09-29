package cd.portailmath.content.web.response;

import java.util.List;

public record CourseDetailResponse(
        String id,
        String title,
        String level,
        String description,
        List<ModuleSummaryResponse> modules
) {
}
