package cd.portailmath.content.web.response;

import java.util.List;
import java.util.Map;

public record PublicActivityResponse(
        String id,
        String type,
        String title,
        String instructions,
        Map<String, Object> data,
        List<PublicExerciseResponse> exercises
) {
}
