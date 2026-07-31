package cd.portailmath.exetat.domain;

import java.util.List;

public record Solution(
        String summary,
        List<String> steps,
        String formula,
        String advice
) {
    public Solution {
        steps = steps == null ? List.of() : List.copyOf(steps);
    }
}

