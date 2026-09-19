package cd.portailmath.content.application;

import cd.portailmath.content.domain.Course;
import cd.portailmath.content.domain.CourseModule;
import cd.portailmath.content.domain.Lesson;

import java.util.List;
import java.util.Optional;

public interface CourseCatalogService {

    List<Course> findAllCourses();

    Optional<Course> findCourseById(String courseId);

    Optional<CourseModule> findModuleById(String courseId, String moduleId);

    Optional<Lesson> findLessonById(String courseId, String lessonId);
}
