package cd.portailmath.content.web.response;

import java.util.List;
import java.util.Map;

public record LessonDetailResponse(
        String id,
        String title,
        String objective,
        Map<String, Object> content,
        List<PublicActivityResponse> activities
) {
}
