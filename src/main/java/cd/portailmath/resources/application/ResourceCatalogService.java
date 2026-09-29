package cd.portailmath.resources.application;

import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import org.springframework.core.io.Resource;

import java.util.List;
import java.util.Optional;

/**
 * Catalogue des ressources pédagogiques distribuées par le backend : il permet
 * au frontend de connaître les ressources disponibles sans les embarquer.
 */
public interface ResourceCatalogService {

    List<LibraryBook> findAllBooks();

    Optional<LibraryBook> findBookById(String bookId);

    /** Fichier du livre, prêt à être distribué. Vide si le livre est inconnu. */
    Optional<Resource> findBookFile(String bookId);

    List<GameQuestionBank> findAllQuestionBanks();

    Optional<GameQuestionBank> findQuestionBankById(String bankId);
}
