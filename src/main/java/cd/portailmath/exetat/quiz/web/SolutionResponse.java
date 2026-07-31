package cd.portailmath.exetat.quiz.web;

import java.util.List;

public record SolutionResponse(
        String summary,
        List<String> steps,
        String formula,
        String advice
) {
}
