import { getModuleItems, isPublished, type CourseItem, type CourseModule } from "../course-engine/course-model";
import { getLearningState, type CourseProgress } from "../course-engine/course-progress";
import { buildJourney, moduleContinueIn, nextStopIn, type JourneyStop, type ModuleContinue } from "../components/journey/journey";
import { PRIMARY_TWO_FINAL_ASSESSMENT_ID, PRIMARY_TWO_MODULES } from "./course-catalogue";

// Chemin de l'enfant en 2e primaire : les 4 leçons et l'évaluation de chaque
// module, puis le grand bilan. Logique commune : ../components/journey.

export type PrimaryTwoStop = JourneyStop<CourseModule, CourseItem>;

export const PRIMARY_TWO_JOURNEY: readonly PrimaryTwoStop[] = buildJourney(PRIMARY_TWO_MODULES, (module) =>
  getModuleItems(module).filter(isPublished) as CourseItem[],
);

export function nextStop(itemId: string) {
  return nextStopIn(PRIMARY_TWO_JOURNEY, itemId);
}

export function isFinalAssessment(item: { id: string }) {
  return item.id === PRIMARY_TWO_FINAL_ASSESSMENT_ID;
}

export function moduleContinue(progress: CourseProgress, module: CourseModule): ModuleContinue<PrimaryTwoStop> {
  return moduleContinueIn(PRIMARY_TWO_JOURNEY, module.id, (item) => getLearningState(progress, item));
}
