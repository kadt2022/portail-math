package cd.portailmath.exetat.web.response;

import java.util.List;

public record SubjectSummaryResponse(
        String id,
        String name,
        String category,
        String description,
        String icon,
        int questionCount,
        int topicCount,
        int estimatedMinutes,
        List<String> difficulties,
        String status
) {
    public SubjectSummaryResponse {
        difficulties = List.copyOf(difficulties);
    }
}

