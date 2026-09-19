package cd.portailmath.content.web.response;

import java.util.List;

public record PublicExerciseResponse(
        String id,
        String type,
        String prompt,
        List<String> choices
) {
}
