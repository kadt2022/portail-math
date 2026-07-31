package cd.portailmath.exetat.infrastructure;

import cd.portailmath.exetat.application.ExetatCatalogService;
import cd.portailmath.exetat.domain.ExetatSubject;
import cd.portailmath.exetat.domain.Question;
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
public class JsonExetatCatalogService implements ExetatCatalogService {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final ExetatCatalogProperties properties;
    private final ExetatCatalogValidator validator;

    private List<ExetatSubject> subjects = List.of();
    private Map<String, ExetatSubject> subjectsById = Map.of();
    private Map<String, List<Question>> questionsBySubject = Map.of();

    public JsonExetatCatalogService(
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            ExetatCatalogProperties properties,
            ExetatCatalogValidator validator
    ) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.validator = validator;
    }

    @PostConstruct
    void loadCatalog() {
        List<ExetatSubject> loadedSubjects = readList(
                "subjects.json",
                new TypeReference<List<ExetatSubject>>() {
                }
        );
        loadedSubjects.forEach(validator::validateSubject);

        Map<String, List<Question>> loadedQuestions = new LinkedHashMap<>();
        for (ExetatSubject subject : loadedSubjects) {
            List<Question> questions = readList(
                    subject.id() + ".json",
                    new TypeReference<List<Question>>() {
                    }
            );
            loadedQuestions.put(subject.id(), List.copyOf(questions));
        }

        validator.validateCatalog(
                loadedSubjects,
                loadedQuestions,
                properties.expectedQuestionsPerSubject()
        );

        List<ExetatSubject> normalizedSubjects = new ArrayList<>();
        Map<String, ExetatSubject> normalizedById = new LinkedHashMap<>();
        for (ExetatSubject subject : loadedSubjects) {
            ExetatSubject normalized = subject.withQuestionCount(loadedQuestions.get(subject.id()).size());
            normalizedSubjects.add(normalized);
            normalizedById.put(normalized.id(), normalized);
        }

        Map<String, List<Question>> immutableQuestions = new LinkedHashMap<>();
        loadedQuestions.forEach((subjectId, questions) ->
                immutableQuestions.put(subjectId, List.copyOf(questions)));

        subjects = List.copyOf(normalizedSubjects);
        subjectsById = Map.copyOf(normalizedById);
        questionsBySubject = Map.copyOf(immutableQuestions);
    }

    @Override
    public List<ExetatSubject> findAllSubjects() {
        return subjects;
    }

    @Override
    public Optional<ExetatSubject> findSubjectById(String subjectId) {
        return Optional.ofNullable(subjectsById.get(subjectId));
    }

    @Override
    public List<Question> findQuestionsBySubject(String subjectId) {
        return questionsBySubject.getOrDefault(subjectId, List.of());
    }

    @Override
    public Optional<Question> findQuestionById(String subjectId, String questionId) {
        return findQuestionsBySubject(subjectId).stream()
                .filter(question -> question.id().equals(questionId))
                .findFirst();
    }

    private <T> T readList(String fileName, TypeReference<T> typeReference) {
        String location = properties.contentLocation() + fileName;
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("Le contenu EXETAT est introuvable : " + location);
        }
        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readValue(inputStream, typeReference);
        } catch (Exception exception) {
            throw new IllegalStateException("Impossible de charger le contenu EXETAT : " + location, exception);
        }
    }
}

