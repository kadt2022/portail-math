package cd.portailmath.resources.infrastructure;

import cd.portailmath.resources.application.ResourceCatalogService;
import cd.portailmath.resources.domain.GameQuestionBank;
import cd.portailmath.resources.domain.LibraryBook;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class JsonResourceCatalogService implements ResourceCatalogService {

    private static final String BOOK_FILES_FOLDER = "files/";

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final ResourceCatalogProperties properties;
    private final ResourceCatalogValidator validator;

    private List<LibraryBook> books = List.of();
    private Map<String, LibraryBook> booksById = Map.of();
    private List<GameQuestionBank> questionBanks = List.of();
    private Map<String, GameQuestionBank> questionBanksById = Map.of();

    public JsonResourceCatalogService(
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            ResourceCatalogProperties properties,
            ResourceCatalogValidator validator
    ) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.validator = validator;
    }

    @PostConstruct
    void loadCatalog() {
        List<LibraryBook> loadedBooks = read(
                properties.libraryLocation() + "books.json",
                new TypeReference<List<LibraryBook>>() {
                }
        );
        validator.validateBooks(loadedBooks);
        loadedBooks.forEach(this::requireBookFile);

        List<String> bankFiles = read(
                properties.gamesLocation() + "index.json",
                new TypeReference<List<String>>() {
                }
        );
        List<GameQuestionBank> loadedBanks = new ArrayList<>();
        for (String bankFile : bankFiles) {
            requireSafeFileName(bankFile);
            loadedBanks.add(read(
                    properties.gamesLocation() + bankFile,
                    new TypeReference<GameQuestionBank>() {
                    }
            ));
        }
        validator.validateQuestionBanks(loadedBanks);

        books = List.copyOf(loadedBooks);
        booksById = Map.copyOf(indexById(loadedBooks, LibraryBook::id));
        questionBanks = List.copyOf(loadedBanks);
        questionBanksById = Map.copyOf(indexById(loadedBanks, GameQuestionBank::id));
    }

    @Override
    public List<LibraryBook> findAllBooks() {
        return books;
    }

    @Override
    public Optional<LibraryBook> findBookById(String bookId) {
        return Optional.ofNullable(booksById.get(bookId));
    }

    @Override
    public Optional<Resource> findBookFile(String bookId) {
        return findBookById(bookId).map(this::bookFileResource).filter(Resource::isReadable);
    }

    @Override
    public List<GameQuestionBank> findAllQuestionBanks() {
        return questionBanks;
    }

    @Override
    public Optional<GameQuestionBank> findQuestionBankById(String bankId) {
        return Optional.ofNullable(questionBanksById.get(bankId));
    }

    /**
     * Un livre annoncé par le catalogue mais absent du dossier des fichiers est
     * une erreur de contenu : elle doit arrêter le démarrage, pas attendre qu'un
     * élève ouvre le livre.
     */
    private void requireBookFile(LibraryBook book) {
        if (!bookFileResource(book).exists()) {
            throw new IllegalStateException(
                    "Le fichier du livre " + book.id() + " est introuvable : " + book.file()
            );
        }
    }

    private Resource bookFileResource(LibraryBook book) {
        return resourceLoader.getResource(properties.libraryLocation() + BOOK_FILES_FOLDER + book.file());
    }

    private void requireSafeFileName(String fileName) {
        if (fileName == null || fileName.isBlank() || fileName.contains("..") || fileName.contains("/")) {
            throw new IllegalStateException(
                    "Le catalogue des banques de questions contient un nom de fichier invalide."
            );
        }
    }

    private <T> Map<String, T> indexById(List<T> items, java.util.function.Function<T, String> id) {
        Map<String, T> byId = new LinkedHashMap<>();
        items.forEach(item -> byId.put(id.apply(item), item));
        return byId;
    }

    private <T> T read(String location, TypeReference<T> typeReference) {
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("La ressource pédagogique est introuvable : " + location);
        }
        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readValue(inputStream, typeReference);
        } catch (Exception exception) {
            throw new IllegalStateException("Impossible de charger la ressource pédagogique : " + location, exception);
        }
    }
}
