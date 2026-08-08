package cd.portailmath.web;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReactCutoverArchitectureTests {

    @Test
    void thymeleafCannotReturnThroughBuildConfigurationOrTemplates() throws IOException {
        String build = Files.readString(Path.of("build.gradle"), Charset.forName("windows-1252"));
        String application = Files.readString(
                Path.of("src/main/resources/application.yml"),
                StandardCharsets.UTF_8
        );
        Path templates = Path.of("src/main/resources/templates");

        assertFalse(build.contains("spring-boot-starter-thymeleaf"));
        assertFalse(application.contains("thymeleaf:"));
        assertTrue(Files.notExists(templates) || directoryContainsNoFiles(templates));
    }

    @Test
    void standaloneGameShellsArePackagedWithoutTemplateAttributes() throws IOException {
        assertStaticHtml("static/games/multiplication-train.html");
        assertStaticHtml("static/games/fraction-river.html");
        assertStaticHtml("static/games/fraction-river-prototype.html");
    }

    private boolean directoryContainsNoFiles(Path directory) throws IOException {
        try (var files = Files.walk(directory)) {
            return files.noneMatch(Files::isRegularFile);
        }
    }

    private void assertStaticHtml(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        assertTrue(resource.exists(), path + " doit être présent dans le classpath");
        String html = resource.getContentAsString(StandardCharsets.UTF_8);
        assertFalse(html.contains("xmlns:th"));
        assertFalse(html.contains("th:"));
        assertTrue(html.contains("/app/jeux"));
    }
}
