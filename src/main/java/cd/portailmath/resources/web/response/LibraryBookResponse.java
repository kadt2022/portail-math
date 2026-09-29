package cd.portailmath.resources.web.response;

public record LibraryBookResponse(
        String id,
        String titleKey,
        String descriptionKey,
        String levelKey,
        String subjectKey,
        String formatKey,
        int pages,
        String fileUrl
) {
}
