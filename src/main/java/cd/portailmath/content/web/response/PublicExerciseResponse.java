package cd.portailmath.content.web.response;

import java.util.Map;

public record PublicExerciseResponse(
        String id,
        String type,
        Map<String, Object> data
) {
}
