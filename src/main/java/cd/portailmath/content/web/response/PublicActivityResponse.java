package cd.portailmath.content.web.response;

import java.util.List;

public record PublicActivityResponse(
        String id,
        String type,
        String title,
        String instructions,
        List<PublicExerciseResponse> exercises
) {
}
