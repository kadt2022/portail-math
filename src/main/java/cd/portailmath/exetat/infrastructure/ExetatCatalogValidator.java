package cd.portailmath.exetat.infrastructure;

import cd.portailmath.exetat.domain.AnswerChoice;
import cd.portailmath.exetat.domain.Difficulty;
import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
import cd.portailmath.exetat.domain.SubjectStatus;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class ExetatCatalogValidator {

    public void validateSubject(ExetatSubject subject) {
        require(subject != null, "Une matière ne peut pas être absente.");
        require(hasText(subject.id()), "L’identifiant de la matière est obligatoire.");
        require(hasText(subject.name()), "Le nom de la matière est obligatoire.");
        require(hasText(subject.description()), "La description de la matière est obligatoire.");
        require(subject.topics() != null && !subject.topics().isEmpty(),
                "La matière " + subject.id() + " doit contenir au moins une notion.");
        require(subject.topics().stream().allMatch(this::hasText),
                "Les notions de la matière " + subject.id() + " ne peuvent pas être vides.");
        require(subject.status() != null, "Le statut de la matière " + subject.id() + " est obligatoire.");
    }

    public void validateQuestion(Question question, Set<String> knownSubjectIds) {
        require(question != null, "Une question ne peut pas être absente.");
        require(hasText(question.id()), "L’identifiant de la question est obligatoire.");
        require(hasText(question.subjectId()), "La matière de la question " + question.id() + " est obligatoire.");
        require(knownSubjectIds.contains(question.subjectId()),
                "La question " + question.id() + " référence une matière inconnue.");
        require(hasText(question.topic()), "La notion de la question " + question.id() + " est obligatoire.");
        require(hasText(question.statement()), "L’énoncé de la question " + question.id() + " est obligatoire.");
        require(question.difficulty() != null, "Le niveau de la question " + question.id() + " est obligatoire.");
        require(question.choices() != null && question.choices().size() == 4,
                "La question " + question.id() + " doit contenir exactement quatre choix.");

        Set<String> choiceIds = new HashSet<>();
        for (AnswerChoice choice : question.choices()) {
            require(choice != null && hasText(choice.id()) && hasText(choice.label()),
                    "Chaque choix de la question " + question.id() + " doit être complet.");
            require(choiceIds.add(choice.id()),
                    "Les identifiants de choix de la question " + question.id() + " doivent être distincts.");
        }

        require(hasText(question.correctChoiceId()) && choiceIds.contains(question.correctChoiceId()),
                "La bonne réponse de la question " + question.id() + " doit correspondre à un choix.");
        require(question.solution() != null && hasText(question.solution().summary()),
                "La solution de la question " + question.id() + " est obligatoire.");
        require(question.solution().steps() != null && !question.solution().steps().isEmpty()
                        && question.solution().steps().stream().allMatch(this::hasText),
                "La solution de la question " + question.id() + " doit contenir au moins une étape.");
        require(question.points() > 0, "Les points de la question " + question.id() + " doivent être positifs.");
    }

    public void validateCatalog(
            List<ExetatSubject> subjects,
            Map<String, List<Question>> questionsBySubject,
            int expectedQuestionsPerSubject
    ) {
        require(subjects != null && !subjects.isEmpty(), "Le catalogue EXETAT ne peut pas être vide.");

        Set<String> subjectIds = new HashSet<>();
        for (ExetatSubject subject : subjects) {
            validateSubject(subject);
            require(subjectIds.add(subject.id()), "L’identifiant de matière " + subject.id() + " est dupliqué.");
        }

        Set<String> questionIds = new HashSet<>();
        for (Map.Entry<String, List<Question>> entry : questionsBySubject.entrySet()) {
            require(subjectIds.contains(entry.getKey()), "Un fichier de questions référence une matière inconnue.");
            for (Question question : entry.getValue()) {
                validateQuestion(question, subjectIds);
                require(questionIds.add(question.id()), "L’identifiant de question " + question.id() + " est dupliqué.");
                require(entry.getKey().equals(question.subjectId()),
                        "La question " + question.id() + " est rangée dans le mauvais fichier.");
            }
        }

        subjects.stream()
                .filter(subject -> subject.status() == SubjectStatus.AVAILABLE)
                .forEach(subject -> validateAvailableSubject(
                        subject,
                        questionsBySubject.getOrDefault(subject.id(), List.of()),
                        expectedQuestionsPerSubject
                ));
    }

    private void validateAvailableSubject(
            ExetatSubject subject,
            List<Question> questions,
            int expectedQuestionsPerSubject
    ) {
        require(questions.size() == expectedQuestionsPerSubject,
                "La matière " + subject.id() + " doit contenir exactement "
                        + expectedQuestionsPerSubject + " questions.");

        Map<Difficulty, Integer> counts = new EnumMap<>(Difficulty.class);
        for (Difficulty difficulty : Difficulty.values()) {
            counts.put(difficulty, 0);
        }
        for (Question question : questions) {
            counts.compute(question.difficulty(), (key, count) -> count + 1);
        }

        require(counts.get(Difficulty.EASY) == 2,
                "La matière " + subject.id() + " doit contenir 2 questions faciles.");
        require(counts.get(Difficulty.INTERMEDIATE) == 2,
                "La matière " + subject.id() + " doit contenir 2 questions intermédiaires.");
        require(counts.get(Difficulty.HARD) == 1,
                "La matière " + subject.id() + " doit contenir 1 question difficile.");
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
