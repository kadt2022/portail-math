package cd.portailmath.exetat.web.response;

import java.util.List;

public record SubjectDetailResponse(
        String id,
        String name,
        String category,
        String description,
        String icon,
        int questionCount,
        int estimatedMinutes,
        List<String> topics,
        List<String> difficulties,
        String status
) {
    public SubjectDetailResponse {
        topics = List.copyOf(topics);
        difficulties = List.copyOf(difficulties);
    }
}

