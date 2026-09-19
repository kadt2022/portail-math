package cd.portailmath.content.web.response;

public record CourseSummaryResponse(
        String id,
        String title,
        String level,
        String description,
        int moduleCount,
        int lessonCount
) {
}
