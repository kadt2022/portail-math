package cd.portailmath.resources.web;

import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import cd.portailmath.resources.web.response.GameQuestionBankSummaryResponse;
import cd.portailmath.resources.web.response.LibraryBookResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

@Component
public class ResourceApiMapper {

    static final String BASE_PATH = "/api/v1/resources";

    private final ObjectMapper objectMapper;

    public ResourceApiMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public LibraryBookResponse toResponse(LibraryBook book) {
        return new LibraryBookResponse(
                book.id(),
                book.titleKey(),
                book.descriptionKey(),
                book.levelKey(),
                book.subjectKey(),
                book.formatKey(),
                book.pages(),
                BASE_PATH + "/books/" + encode(book.id()) + "/file"
        );
    }

    public GameQuestionBankSummaryResponse toSummary(GameQuestionBank bank) {
        String bankPath = BASE_PATH + "/game-question-banks/" + encode(bank.id());
        return new GameQuestionBankSummaryResponse(
                bank.id(),
                bank.gameId(),
                bankPath,
                bankPath + "/script"
        );
    }

    /**
     * Les jeux historiques chargent leurs dépendances par balises `script`
     * successives et démarrent sans attendre. Leur servir la banque sous cette
     * forme évite de rendre leur démarrage asynchrone pour la seule raison que
     * les données ont changé de place.
     */
    public String toScript(GameQuestionBank bank) {
        return "(function (root) {\n"
                + "    root.MbuyambaQuestionBanks = root.MbuyambaQuestionBanks || {};\n"
                + "    root.MbuyambaQuestionBanks[" + escape(objectMapper.writeValueAsString(bank.id())) + "] = "
                + escape(objectMapper.writeValueAsString(bank.data())) + ";\n"
                + "})(typeof globalThis !== \"undefined\" ? globalThis : window);\n";
    }

    /**
     * Un `<` dans une donnée refermerait la balise qui porte ce script. Dans du
     * JSON il ne peut apparaître que dans une chaîne, où son échappement
     * unicode est équivalent.
     */
    private String escape(String json) {
        return json.replace("<", "\\u003C");
    }

    private String encode(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }
}
