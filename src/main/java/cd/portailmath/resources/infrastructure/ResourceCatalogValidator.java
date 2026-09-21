package cd.portailmath.resources.infrastructure;

import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class ResourceCatalogValidator {

    private static final String DUPLICATED_SUFFIX = " est dupliqué.";
    private static final String REQUIRED_SUFFIX = " est obligatoire.";

    public void validateBooks(List<LibraryBook> books) {
        require(books != null && !books.isEmpty(), "Le catalogue de la bibliothèque ne peut pas être vide.");
        Set<String> bookIds = new HashSet<>();
        for (LibraryBook book : books) {
            require(book != null, "Un livre ne peut pas être absent.");
            require(hasText(book.id()), "L’identifiant du livre" + REQUIRED_SUFFIX);
            require(bookIds.add(book.id()), "L’identifiant de livre " + book.id() + DUPLICATED_SUFFIX);
            require(hasText(book.titleKey()), "Le titre du livre " + book.id() + REQUIRED_SUFFIX);
            require(hasText(book.descriptionKey()), "La description du livre " + book.id() + REQUIRED_SUFFIX);
            require(hasText(book.levelKey()), "Le niveau du livre " + book.id() + REQUIRED_SUFFIX);
            require(hasText(book.subjectKey()), "La matière du livre " + book.id() + REQUIRED_SUFFIX);
            require(hasText(book.formatKey()), "Le format du livre " + book.id() + REQUIRED_SUFFIX);
            require(book.pages() > 0, "Le nombre de pages du livre " + book.id() + " doit être positif.");
            validateFileName(book);
        }
    }

    public void validateQuestionBanks(List<GameQuestionBank> banks) {
        require(banks != null, "Le catalogue des banques de questions ne peut pas être absent.");
        Set<String> bankIds = new HashSet<>();
        for (GameQuestionBank bank : banks) {
            require(bank != null, "Une banque de questions ne peut pas être absente.");
            require(hasText(bank.id()), "L’identifiant de la banque de questions" + REQUIRED_SUFFIX);
            require(bankIds.add(bank.id()),
                    "L’identifiant de banque de questions " + bank.id() + DUPLICATED_SUFFIX);
            require(hasText(bank.gameId()), "Le jeu de la banque " + bank.id() + REQUIRED_SUFFIX);
            require(bank.data() != null && !bank.data().isEmpty(),
                    "La banque de questions " + bank.id() + " doit fournir des données au jeu.");
        }
    }

    /**
     * Le nom de fichier vient du catalogue, pas de la requête : on le verrouille
     * quand même, pour qu'aucune entrée de catalogue ne puisse sortir du dossier
     * des ressources distribuées.
     */
    private void validateFileName(LibraryBook book) {
        String file = book.file();
        require(hasText(file), "Le fichier du livre " + book.id() + REQUIRED_SUFFIX);
        require(!file.contains("..") && !file.contains("/") && !file.contains("\\"),
                "Le fichier du livre " + book.id() + " doit rester dans le dossier des livres.");
        require(file.endsWith(".pdf"), "Le fichier du livre " + book.id() + " doit être un PDF.");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }
}
