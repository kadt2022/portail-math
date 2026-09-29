package cd.portailmath.resources.web.response;

public record GameQuestionBankSummaryResponse(
        String id,
        String gameId,
        String dataUrl,
        String scriptUrl
) {
}
