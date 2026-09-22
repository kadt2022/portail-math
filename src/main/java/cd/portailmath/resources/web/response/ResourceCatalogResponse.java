package cd.portailmath.resources.web.response;

import java.util.List;

/** Ce que le frontend interroge pour savoir quelles ressources sont disponibles. */
public record ResourceCatalogResponse(
        List<LibraryBookResponse> books,
        List<GameQuestionBankSummaryResponse> gameQuestionBanks
) {
}
