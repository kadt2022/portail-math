package cd.portailmath;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TechnicalNamingTests {

    @Autowired
    private Environment environment;

    @Test
    void usesFinalSpringAndGradleTechnicalName() throws Exception {
        assertThat(environment.getProperty("spring.application.name")).isEqualTo("portail-math");
        assertThat(Files.readString(Path.of("settings.gradle")))
                .contains("rootProject.name = 'portail-math'");
    }

    @Test
    void oldApplicationClassAndPackageAreAbsent() throws Exception {
        String oldPackage = "cd." + "timbiri" + ".maths";
        assertThat(Path.of("src/main/java/cd", "timbiri")).doesNotExist();
        assertThat(Path.of("src/main/java/cd/portailmath/TimbiriMathsApplication.java"))
                .doesNotExist();

        try (var files = Files.walk(Path.of("src/main/java"))) {
            assertThat(files.filter(path -> path.toString().endsWith(".java")))
                    .allSatisfy(path -> assertThat(Files.readString(path))
                            .doesNotContain(oldPackage));
        }
    }
}
