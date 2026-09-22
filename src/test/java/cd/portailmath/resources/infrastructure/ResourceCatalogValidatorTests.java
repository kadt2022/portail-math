package cd.portailmath.resources.infrastructure;

import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.JsonNodeFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResourceCatalogValidatorTests {

    private final ResourceCatalogValidator validator = new ResourceCatalogValidator();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private LibraryBook book(String id, String file) {
        return new LibraryBook(id, "t", "d", "l", "s", "f", 96, file);
    }

    private GameQuestionBank bank(String id, String data) {
        return new GameQuestionBank(id, "fraction-river", objectMapper.readTree(data));
    }

    @Test
    void acceptsAWellFormedCatalog() {
        assertThatCode(() -> validator.validateBooks(List.of(book("a", "a.pdf"), book("b", "b.pdf"))))
                .doesNotThrowAnyException();
        assertThatCode(() -> validator.validateQuestionBanks(List.of(bank("fraction-river", "{\"scenarios\":[]}"))))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsAnEmptyLibrary() {
        assertThatThrownBy(() -> validator.validateBooks(List.of()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ne peut pas être vide");
    }

    @Test
    void rejectsDuplicatedBookIdentifiers() {
        assertThatThrownBy(() -> validator.validateBooks(List.of(book("a", "a.pdf"), book("a", "b.pdf"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dupliqué");
    }

    @Test
    void rejectsABookFileThatWouldEscapeTheBooksFolder() {
        assertThatThrownBy(() -> validator.validateBooks(List.of(book("a", "../../application.pdf"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("doit rester dans le dossier des livres");
        assertThatThrownBy(() -> validator.validateBooks(List.of(book("a", "files/a.pdf"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("doit rester dans le dossier des livres");
    }

    @Test
    void rejectsABookThatIsNotAPdf() {
        assertThatThrownBy(() -> validator.validateBooks(List.of(book("a", "a.txt"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("doit être un PDF");
    }

    @Test
    void rejectsABookWithoutPages() {
        LibraryBook withoutPages = new LibraryBook("a", "t", "d", "l", "s", "f", 0, "a.pdf");
        assertThatThrownBy(() -> validator.validateBooks(List.of(withoutPages)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nombre de pages");
    }

    @Test
    void rejectsAQuestionBankWithoutData() {
        GameQuestionBank empty = new GameQuestionBank("fraction-river", "fraction-river", JsonNodeFactory.instance.objectNode());
        assertThatThrownBy(() -> validator.validateQuestionBanks(List.of(empty)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("doit fournir des données au jeu");
    }

    @Test
    void rejectsDuplicatedQuestionBankIdentifiers() {
        assertThatThrownBy(() -> validator.validateQuestionBanks(List.of(
                bank("fraction-river", "{\"scenarios\":[]}"),
                bank("fraction-river", "{\"scenarios\":[]}")
        )))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dupliqué");
    }
}
