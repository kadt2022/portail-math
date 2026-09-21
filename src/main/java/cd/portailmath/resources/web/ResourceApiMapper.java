package cd.portailmath.resources.web;

import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import cd.portailmath.resources.web.response.GameQuestionBankSummaryResponse;
import cd.portailmath.resources.web.response.LibraryBookResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

@Component
public class ResourceApiMapper {

    static final String BASE_PATH = "/api/v1/resources";

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
        return new GameQuestionBankSummaryResponse(
                bank.id(),
                bank.gameId(),
                BASE_PATH + "/game-question-banks/" + encode(bank.id())
        );
    }

    private String encode(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }
}
