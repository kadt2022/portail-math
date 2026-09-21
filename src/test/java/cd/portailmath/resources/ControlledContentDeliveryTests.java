package cd.portailmath.resources;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Critère de fin de CONTENT-DELIVERY-04 : les ressources pédagogiques ne
 * dépendent plus d'un fichier livré directement avec le frontend.
 */
class ControlledContentDeliveryTests {

    private static final Path FRONTEND = Path.of("frontend");
    private static final Path BOOK_FILES = Path.of("src/main/resources/content/library/files");
    private static final List<String> BOOKS = List.of(
            "mbuyamba-1re-primaire-livre-complet.pdf",
            "mbuyamba-2e-primaire-livre-complet.pdf",
            "mbuyamba-3e-primaire-livre-complet.pdf"
    );

    @Test
    void booksAreServedByTheBackendAndNoLongerShippedWithTheFrontend() {
        assertThat(FRONTEND.resolve("public/books")).doesNotExist();
        BOOKS.forEach(book -> assertThat(BOOK_FILES.resolve(book)).exists());
    }

    @Test
    void noPedagogicalPdfRemainsInTheFrontendSources() throws IOException {
        assertThat(frontendFiles(".pdf")).isEmpty();
    }

    @Test
    void frontendSourcesDoNotHardcodeABookPath() throws IOException {
        for (Path source : frontendFiles(".ts", ".tsx")) {
            assertThat(Files.readString(source, StandardCharsets.UTF_8))
                    .as("%s ne doit pas figer un chemin de livre", source)
                    .doesNotContain("books/mbuyamba-");
        }
    }

    @Test
    void theFractionRiverQuestionBankLivesInTheBackendContent() {
        assertThat(Path.of("src/main/resources/content/games/fraction-river.json")).exists();
    }

    private List<Path> frontendFiles(String... suffixes) throws IOException {
        try (Stream<Path> files = Files.walk(FRONTEND)) {
            return files.filter(Files::isRegularFile)
                    .filter(path -> !path.toString().contains("node_modules"))
                    .filter(path -> !path.toString().contains("/dist/"))
                    .filter(path -> Stream.of(suffixes).anyMatch(suffix -> path.toString().endsWith(suffix)))
                    .toList();
        }
    }

    @Test
    void theFractionRiverModuleNoLongerCarriesItsOwnQuestions() throws IOException {
        String module = Files.readString(
                Path.of("src/main/resources/static/js/fraction-river-questions.js"),
                StandardCharsets.UTF_8
        );
        assertThat(module)
                .as("les scénarios doivent venir du contenu backend")
                .doesNotContain("visualKind: \"DISC\"")
                .doesNotContain("{id: \"S01\"");
    }

    @Test
    void theGameShellLoadsTheBankBeforeTheModuleThatReadsIt() throws IOException {
        String shell = Files.readString(
                Path.of("src/main/resources/static/games/fraction-river.html"),
                StandardCharsets.UTF_8
        );
        int bank = shell.indexOf("/api/v1/resources/game-question-banks/fraction-river/script");
        int module = shell.indexOf("/js/fraction-river-questions.js");
        assertThat(bank).isPositive();
        assertThat(bank).isLessThan(module);
    }
}
