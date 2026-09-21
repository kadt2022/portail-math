package cd.portailmath.content.infrastructure;

import cd.portailmath.content.application.CourseCatalogService;
import cd.portailmath.content.domain.Course;
import cd.portailmath.content.domain.CourseModule;
import cd.portailmath.content.domain.Exercise;
import cd.portailmath.content.domain.Lesson;
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
public class JsonCourseCatalogService implements CourseCatalogService {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final CourseCatalogProperties properties;
    private final CourseCatalogValidator validator;

    private List<Course> courses = List.of();
    private Map<String, Course> coursesById = Map.of();

    public JsonCourseCatalogService(
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            CourseCatalogProperties properties,
            CourseCatalogValidator validator
    ) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.properties = properties;
        this.validator = validator;
    }

    @PostConstruct
    void loadCatalog() {
        List<String> courseFiles = read("index.json", new TypeReference<List<String>>() {
        });
        List<Course> loadedCourses = new ArrayList<>();
        for (String courseFile : courseFiles) {
            if (courseFile == null || courseFile.isBlank() || courseFile.contains("..") || courseFile.contains("/")) {
                throw new IllegalStateException("Le catalogue de cours contient un nom de fichier invalide.");
            }
            loadedCourses.add(read(courseFile, new TypeReference<Course>() {
            }));
        }
        validator.validate(loadedCourses);

        Map<String, Course> loadedById = new LinkedHashMap<>();
        loadedCourses.forEach(course -> loadedById.put(course.id(), course));
        courses = List.copyOf(loadedCourses);
        coursesById = Map.copyOf(loadedById);
    }

    @Override
    public List<Course> findAllCourses() {
        return courses;
    }

    @Override
    public Optional<Course> findCourseById(String courseId) {
        return Optional.ofNullable(coursesById.get(courseId));
    }

    @Override
    public Optional<CourseModule> findModuleById(String courseId, String moduleId) {
        return findCourseById(courseId).stream()
                .flatMap(course -> course.modules().stream())
                .filter(module -> module.id().equals(moduleId))
                .findFirst();
    }

    @Override
    public Optional<Lesson> findLessonById(String courseId, String lessonId) {
        return findCourseById(courseId).stream()
                .flatMap(course -> course.modules().stream())
                .flatMap(module -> module.lessons().stream())
                .filter(lesson -> lesson.id().equals(lessonId))
                .findFirst();
    }

    @Override
    public Optional<Exercise> findExerciseById(String courseId, String exerciseId) {
        return findCourseById(courseId).stream()
                .flatMap(course -> course.modules().stream())
                .flatMap(module -> module.lessons().stream())
                .flatMap(lesson -> lesson.activities().stream())
                .flatMap(activity -> activity.exercises().stream())
                .filter(exercise -> exercise.id().equals(exerciseId))
                .findFirst();
    }

    private <T> T read(String fileName, TypeReference<T> typeReference) {
        String location = properties.contentLocation() + fileName;
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("Le contenu de cours est introuvable : " + location);
        }
        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readValue(inputStream, typeReference);
        } catch (Exception exception) {
            throw new IllegalStateException("Impossible de charger le contenu de cours : " + location, exception);
        }
    }
}
