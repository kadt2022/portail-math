package cd.portailmath.progress;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verrou sur les clés de stockage local.
 *
 * <p>Ces clés portent la progression déjà enregistrée sur les appareils des
 * élèves. Les renommer, même par mégarde au cours de la migration vers React,
 * effacerait le travail accompli par chaque enfant sans le moindre message
 * d'erreur. Ce test échoue avant que cela n'arrive.</p>
 *
 * <p>Le portage de ces magasins vers des modules ES viendra dans un récit
 * dédié : il devra être mécanique, et ce test restera vert.</p>
 */
class LocalStorageKeysContractTests {

    private static final Path JS_ROOT = Path.of("src", "main", "resources", "static", "js");

    private static final List<String> SCELLEES = List.of(
            "portailMath.games.fractionRiver.v1",
            "portailMath.games.multiplicationTrain.v1",
            "portailMath.exetat.progress.v1"
    );

    @Test
    void theThreeProgressKeysAreStillDeclared() throws IOException {
        String sources = readAllJavaScript();
        for (String cle : SCELLEES) {
            assertTrue(
                    sources.contains('"' + cle + '"'),
                    () -> "Clé de progression absente : " + cle
                            + ". La renommer ferait perdre sa progression à chaque élève."
            );
        }
    }

    @Test
    void nothingWipesTheWholeLocalStorage() throws IOException {
        String sources = readAllJavaScript();
        assertFalse(
                sources.contains("localStorage.clear("),
                "Aucun script ne doit vider le stockage local : les autres jeux y "
                        + "conservent la progression des élèves."
        );
    }

    private String readAllJavaScript() throws IOException {
        try (Stream<Path> fichiers = Files.walk(JS_ROOT)) {
            StringBuilder contenu = new StringBuilder();
            for (Path fichier : fichiers.filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".js"))
                    // Les bibliothèques tierces ne sont pas notre code : la règle
                    // porte sur les scripts du portail.
                    .filter(path -> !path.toString().replace('\\', '/').contains("/vendor/"))
                    .toList()) {
                contenu.append(Files.readString(fichier)).append('\n');
            }
            return contenu.toString();
        }
    }
}
