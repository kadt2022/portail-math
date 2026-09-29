package cd.portailmath.content.web.response;

public record LessonSummaryResponse(
        String id,
        String title,
        String objective,
        int activityCount
) {
}
