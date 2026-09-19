package cd.portailmath.content.web;

import cd.portailmath.content.domain.Activity;
import cd.portailmath.content.domain.Course;
import cd.portailmath.content.domain.CourseModule;
import cd.portailmath.content.domain.Exercise;
import cd.portailmath.content.domain.Lesson;
import cd.portailmath.content.web.response.CourseDetailResponse;
import cd.portailmath.content.web.response.CourseSummaryResponse;
import cd.portailmath.content.web.response.LessonDetailResponse;
import cd.portailmath.content.web.response.LessonSummaryResponse;
import cd.portailmath.content.web.response.ModuleDetailResponse;
import cd.portailmath.content.web.response.ModuleSummaryResponse;
import cd.portailmath.content.web.response.PublicActivityResponse;
import cd.portailmath.content.web.response.PublicExerciseResponse;
import org.springframework.stereotype.Component;

@Component
public class CourseApiMapper {

    public CourseSummaryResponse toSummary(Course course) {
        int lessonCount = course.modules().stream().mapToInt(module -> module.lessons().size()).sum();
        return new CourseSummaryResponse(
                course.id(),
                course.title(),
                course.level(),
                course.description(),
                course.modules().size(),
                lessonCount
        );
    }

    public CourseDetailResponse toDetail(Course course) {
        return new CourseDetailResponse(
                course.id(),
                course.title(),
                course.level(),
                course.description(),
                course.modules().stream().map(this::toSummary).toList()
        );
    }

    public ModuleSummaryResponse toSummary(CourseModule module) {
        return new ModuleSummaryResponse(
                module.id(),
                module.title(),
                module.description(),
                module.lessons().size()
        );
    }

    public ModuleDetailResponse toDetail(CourseModule module) {
        return new ModuleDetailResponse(
                module.id(),
                module.title(),
                module.description(),
                module.lessons().stream().map(this::toSummary).toList()
        );
    }

    public LessonSummaryResponse toSummary(Lesson lesson) {
        return new LessonSummaryResponse(
                lesson.id(),
                lesson.title(),
                lesson.objective(),
                lesson.activities().size()
        );
    }

    public LessonDetailResponse toDetail(Lesson lesson) {
        return new LessonDetailResponse(
                lesson.id(),
                lesson.title(),
                lesson.objective(),
                lesson.activities().stream().map(this::toPublicActivity).toList()
        );
    }

    private PublicActivityResponse toPublicActivity(Activity activity) {
        return new PublicActivityResponse(
                activity.id(),
                activity.type(),
                activity.title(),
                activity.instructions(),
                activity.exercises().stream().map(this::toPublicExercise).toList()
        );
    }

    private PublicExerciseResponse toPublicExercise(Exercise exercise) {
        return new PublicExerciseResponse(
                exercise.id(),
                exercise.type(),
                exercise.prompt(),
                exercise.choices()
        );
    }
}
