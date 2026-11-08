import type { CourseItem, CourseModule } from "../course-engine/course-model";
import { getLearningState, type CourseProgress } from "../course-engine/course-progress";
import { JourneyCompletion, JourneyTrail as SharedTrail, ModuleContinueAction, type JourneyConfig } from "../components/journey/JourneyNavigation";
import { lessonPath, PRIMARY_TWO_BASE_PATH, PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";
import { isFinalAssessment, PRIMARY_TWO_JOURNEY } from "./journey";

// Branche la navigation commune (chemin de ronds, gros bouton « Continuer »)
// sur le catalogue et la progression de la 2e primaire.

function config(progress: CourseProgress): JourneyConfig {
  return {
    namespace: "primaryTwo",
    stops: PRIMARY_TWO_JOURNEY,
    stateOf: (item) => getLearningState(progress, item as CourseItem),
    lessonPath,
    isFinal: isFinalAssessment,
  };
}

export function JourneyTrail({ module, currentItemId, progress }: { module: CourseModule; currentItemId: string; progress: CourseProgress }) {
  return <SharedTrail config={config(progress)} moduleId={module.id} currentItemId={currentItemId} />;
}

export function PrimaryTwoModuleContinue({ module, progress }: { module: CourseModule; progress: CourseProgress }) {
  return <ModuleContinueAction config={config(progress)} moduleId={module.id} basePath={PRIMARY_TWO_BASE_PATH} />;
}

export function PrimaryTwoCompletion({
  module,
  item,
  progress,
  title,
  basePath,
  modulePath,
}: {
  module: CourseModule;
  item: CourseItem;
  progress: CourseProgress;
  title: string;
  basePath: string;
  modulePath: string;
}) {
  const completedLessons = PRIMARY_TWO_MODULES.flatMap((candidate) => candidate.lessons).filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;
  return (
    <JourneyCompletion
      config={config(progress)}
      module={module}
      item={item}
      title={title}
      completedLessons={completedLessons}
      totalLessons={PRIMARY_TWO_COURSE.plannedLessonCount}
      basePath={basePath}
      modulePath={modulePath}
    />
  );
}
