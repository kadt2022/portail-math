package cd.portailmath.exetat.infrastructure;

import cd.portailmath.exetat.domain.AnswerChoice;
import cd.portailmath.exetat.domain.Difficulty;
import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.domain.Solution;
import cd.portailmath.exetat.domain.SubjectStatus;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExetatCatalogValidatorTests {

    private final ExetatCatalogValidator validator = new ExetatCatalogValidator();

    @Test
    void acceptsValidSubject() {
        assertThatCode(() -> validator.validateSubject(validSubject()))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsSubjectWithoutId() {
        ExetatSubject subject = new ExetatSubject(
                " ",
                "Le cercle",
                "Géométrie analytique",
                "Description",
                "circle",
                10,
                10,
                List.of("Rayon"),
                List.of(Difficulty.EASY),
                SubjectStatus.AVAILABLE
        );

        assertThatThrownBy(() -> validator.validateSubject(subject))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("identifiant");
    }

    @Test
    void rejectsSubjectWithoutTopics() {
        ExetatSubject subject = new ExetatSubject(
                "cercle",
                "Le cercle",
                "Géométrie analytique",
                "Description",
                "circle",
                10,
                10,
                List.of(),
                List.of(Difficulty.EASY),
                SubjectStatus.AVAILABLE
        );

        assertThatThrownBy(() -> validator.validateSubject(subject))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("notion");
    }

    @Test
    void rejectsSubjectWithoutValidStatus() {
        ExetatSubject subject = new ExetatSubject(
                "cercle",
                "Le cercle",
                "Géométrie analytique",
                "Description",
                "circle",
                10,
                10,
                List.of("Rayon"),
                List.of(Difficulty.EASY),
                null
        );

        assertThatThrownBy(() -> validator.validateSubject(subject))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("statut");
    }

    @Test
    void acceptsValidQuestion() {
        assertThatCode(() -> validator.validateQuestion(validQuestion(), Set.of("cercle")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsQuestionWithFewerThanFourChoices() {
        Question question = questionWithChoices(validChoices().subList(0, 3));

        assertInvalidQuestion(question, "quatre choix");
    }

    @Test
    void rejectsQuestionWithMoreThanFourChoices() {
        List<AnswerChoice> choices = new ArrayList<>(validChoices());
        choices.add(new AnswerChoice("E", "Autre"));

        assertInvalidQuestion(questionWithChoices(choices), "quatre choix");
    }

    @Test
    void rejectsQuestionWithDuplicateChoiceIds() {
        Question question = questionWithChoices(List.of(
                new AnswerChoice("A", "Choix 1"),
                new AnswerChoice("A", "Choix 2"),
                new AnswerChoice("C", "Choix 3"),
                new AnswerChoice("D", "Choix 4")
        ));

        assertInvalidQuestion(question, "distincts");
    }

    @Test
    void rejectsQuestionWhenCorrectChoiceDoesNotExist() {
        Question valid = validQuestion();
        Question question = new Question(
                valid.id(),
                valid.subjectId(),
                valid.topic(),
                valid.difficulty(),
                valid.statement(),
                valid.choices(),
                "Z",
                valid.solution(),
                valid.points()
        );

        assertInvalidQuestion(question, "bonne réponse");
    }

    @Test
    void rejectsQuestionWithoutSolution() {
        Question valid = validQuestion();
        Question question = new Question(
                valid.id(),
                valid.subjectId(),
                valid.topic(),
                valid.difficulty(),
                valid.statement(),
                valid.choices(),
                valid.correctChoiceId(),
                null,
                valid.points()
        );

        assertInvalidQuestion(question, "solution");
    }

    @Test
    void rejectsQuestionWithoutDifficulty() {
        Question valid = validQuestion();
        Question question = new Question(
                valid.id(),
                valid.subjectId(),
                valid.topic(),
                null,
                valid.statement(),
                valid.choices(),
                valid.correctChoiceId(),
                valid.solution(),
                valid.points()
        );

        assertInvalidQuestion(question, "niveau");
    }

    @Test
    void rejectsQuestionWithInvalidPoints() {
        Question valid = validQuestion();
        Question question = new Question(
                valid.id(),
                valid.subjectId(),
                valid.topic(),
                valid.difficulty(),
                valid.statement(),
                valid.choices(),
                valid.correctChoiceId(),
                valid.solution(),
                0
        );

        assertInvalidQuestion(question, "points");
    }

    private void assertInvalidQuestion(Question question, String expectedMessage) {
        assertThatThrownBy(() -> validator.validateQuestion(question, Set.of("cercle")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining(expectedMessage);
    }

    private ExetatSubject validSubject() {
        return new ExetatSubject(
                "cercle",
                "Le cercle",
                "Géométrie analytique",
                "Description",
                "circle",
                10,
                10,
                List.of("Rayon"),
                List.of(Difficulty.EASY, Difficulty.INTERMEDIATE, Difficulty.HARD),
                SubjectStatus.AVAILABLE
        );
    }

    private Question validQuestion() {
        return new Question(
                "cercle-001",
                "cercle",
                "Rayon",
                Difficulty.EASY,
                "Quel est le rayon ?",
                validChoices(),
                "A",
                new Solution(
                        "Le rayon vaut 4.",
                        List.of("Lire la forme canonique."),
                        "r = 4",
                        "Vérifie le carré."
                ),
                1
        );
    }

    private List<AnswerChoice> validChoices() {
        return List.of(
                new AnswerChoice("A", "4"),
                new AnswerChoice("B", "8"),
                new AnswerChoice("C", "16"),
                new AnswerChoice("D", "32")
        );
    }

    private Question questionWithChoices(List<AnswerChoice> choices) {
        Question valid = validQuestion();
        return new Question(
                valid.id(),
                valid.subjectId(),
                valid.topic(),
                valid.difficulty(),
                valid.statement(),
                choices,
                valid.correctChoiceId(),
                valid.solution(),
                valid.points()
        );
    }
}

