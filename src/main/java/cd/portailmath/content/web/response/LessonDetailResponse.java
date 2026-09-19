package cd.portailmath.content.web.response;

import java.util.List;

public record LessonDetailResponse(
        String id,
        String title,
        String objective,
        List<PublicActivityResponse> activities
) {
}
