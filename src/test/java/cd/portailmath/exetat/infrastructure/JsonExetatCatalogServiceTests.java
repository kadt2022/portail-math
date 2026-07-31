package cd.portailmath.exetat.infrastructure;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.Difficulty;
import cd.portailmath.exetat.domain.ExetatSubject;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class JsonExetatCatalogServiceTests {

    @Autowired
    private ExetatCatalogService catalogService;

    @Test
    void loadsFourSubjectsAndTwentyQuestions() {
        assertThat(catalogService.findAllSubjects()).hasSize(4);
        assertThat(catalogService.findAllSubjects())
                .extracting(ExetatSubject::id)
                .containsExactly("cercle", "droite", "derivees", "integrales");

        int totalQuestions = catalogService.findAllSubjects().stream()
                .mapToInt(subject -> catalogService.findQuestionsBySubject(subject.id()).size())
                .sum();
        assertThat(totalQuestions).isEqualTo(20);
    }

    @Test
    void loadsFiveQuestionsWithExpectedDifficultyDistributionForEverySubject() {
        for (ExetatSubject subject : catalogService.findAllSubjects()) {
            assertThat(catalogService.findQuestionsBySubject(subject.id())).hasSize(5);
            assertThat(catalogService.findQuestionsBySubject(subject.id())
                    .stream().filter(question -> question.difficulty() == Difficulty.EASY)).hasSize(2);
            assertThat(catalogService.findQuestionsBySubject(subject.id())
                    .stream().filter(question -> question.difficulty() == Difficulty.INTERMEDIATE)).hasSize(2);
            assertThat(catalogService.findQuestionsBySubject(subject.id())
                    .stream().filter(question -> question.difficulty() == Difficulty.HARD)).hasSize(1);
        }
    }

    @Test
    void exposesImmutableCollections() {
        assertThatThrownBy(() -> catalogService.findAllSubjects().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> catalogService.findQuestionsBySubject("cercle").clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
