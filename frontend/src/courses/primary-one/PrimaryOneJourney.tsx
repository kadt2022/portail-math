import type { ReactNode } from "react";

import { buildJourney, type JourneyStop } from "../components/journey/journey";
import { JourneyCompletion, JourneyTrail, ModuleContinueAction, type JourneyConfig } from "../components/journey/JourneyNavigation";
import {
  getLearningItems,
  lessonPath,
  PRIMARY_ONE_BASE_PATH,
  PRIMARY_ONE_FINAL,
  PRIMARY_ONE_MODULES,
  type LearningItem,
  type PrimaryOneModule,
} from "./course-catalogue";
import { getLearningState, type CourseProgress } from "./course-progress";

// Chemin de l'enfant en 1re primaire : chaque module enchaîne ses leçons et
// son évaluation, puis le module suivant, jusqu'au bilan final. Utilise la
// navigation commune (chemin de ronds et gros bouton « Continuer »).

export const PRIMARY_ONE_JOURNEY: readonly JourneyStop<PrimaryOneModule, LearningItem>[] = buildJourney(PRIMARY_ONE_MODULES, getLearningItems);

function config(progress: CourseProgress): JourneyConfig {
  return {
    namespace: "primaryOne",
    stops: PRIMARY_ONE_JOURNEY,
    stateOf: (item) => getLearningState(progress, item as LearningItem),
    lessonPath,
    isFinal: (item) => item.id === PRIMARY_ONE_FINAL.id,
  };
}

export function PrimaryOneTrail({ module, currentItemId, progress }: { module: PrimaryOneModule; currentItemId: string; progress: CourseProgress }) {
  return <JourneyTrail config={config(progress)} moduleId={module.id} currentItemId={currentItemId} />;
}

export function PrimaryOneModuleContinue({ module, progress }: { module: PrimaryOneModule; progress: CourseProgress }) {
  return <ModuleContinueAction config={config(progress)} moduleId={module.id} basePath={PRIMARY_ONE_BASE_PATH} />;
}

export function PrimaryOneCompletion({
  module,
  item,
  progress,
  title,
  modulePath,
  children,
}: {
  module: PrimaryOneModule;
  item: LearningItem;
  progress: CourseProgress;
  title: string;
  modulePath: string;
  children?: ReactNode;
}) {
  const lessons = PRIMARY_ONE_MODULES.flatMap((candidate) => candidate.lessons);
  return (
    <JourneyCompletion
      config={config(progress)}
      module={module}
      item={item}
      title={title}
      completedLessons={lessons.filter((lesson) => getLearningState(progress, lesson) === "completed").length}
      totalLessons={lessons.length}
      basePath={PRIMARY_ONE_BASE_PATH}
      modulePath={modulePath}
    >
      {children}
    </JourneyCompletion>
  );
}
