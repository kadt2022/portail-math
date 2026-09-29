package cd.portailmath.content.web.response;

public record ModuleSummaryResponse(
        String id,
        String title,
        String description,
        int lessonCount
) {
}
