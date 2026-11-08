import type { CourseItem, CourseModule } from "../course-engine/course-model";
import { getModuleItems, isPublished } from "../course-engine/course-model";
import type { CourseProgress } from "../course-engine/course-progress";
import { getLearningState } from "../course-engine/course-progress";
import { PRIMARY_TWO_FINAL_ASSESSMENT_ID, PRIMARY_TWO_MODULES } from "./course-catalogue";

// Chemin unique de l'enfant dans le parcours de 2e primaire : les 4 leçons
// et l'évaluation de chaque module, dans l'ordre, puis le grand bilan.
// Le bouton « Continuer » suit toujours ce chemin : l'enfant n'a jamais à
// choisir où aller.

export interface JourneyStop {
  module: CourseModule;
  item: CourseItem;
}

export const PRIMARY_TWO_JOURNEY: readonly JourneyStop[] = PRIMARY_TWO_MODULES.flatMap((module) =>
  getModuleItems(module)
    .filter(isPublished)
    .map((item) => ({ module, item: item as CourseItem })),
);

export function journeyIndex(itemId: string) {
  return PRIMARY_TWO_JOURNEY.findIndex((stop) => stop.item.id === itemId);
}

/** Élément suivant sur le chemin, y compris dans le module suivant. */
export function nextStop(itemId: string): JourneyStop | undefined {
  const index = journeyIndex(itemId);
  return index >= 0 ? PRIMARY_TWO_JOURNEY[index + 1] : undefined;
}

export function isFinalAssessment(item: CourseItem) {
  return item.id === PRIMARY_TWO_FINAL_ASSESSMENT_ID;
}

/** Les éléments d'un module visibles sur son petit chemin (leçons, évaluation, bilan). */
export function moduleStops(module: CourseModule) {
  return PRIMARY_TWO_JOURNEY.filter((stop) => stop.module.id === module.id).map((stop) => stop.item);
}

export function moduleLessonsCompleted(progress: CourseProgress, module: CourseModule) {
  return module.lessons.every((lesson) => getLearningState(progress, lesson) === "completed");
}

export type ModuleContinue =
  | { type: "start" | "resume" | "continue"; stop: JourneyStop }
  | { type: "next-module"; stop: JourneyStop }
  | { type: "finished" };

/**
 * Où mène le bouton « Continuer » depuis la page d'un module : l'élément
 * en cours, sinon le premier non terminé du module, sinon le début du
 * module suivant (ou la fin du parcours).
 */
export function moduleContinue(progress: CourseProgress, module: CourseModule): ModuleContinue {
  const stops = PRIMARY_TWO_JOURNEY.filter((stop) => stop.module.id === module.id);
  const inProgress = stops.find((stop) => getLearningState(progress, stop.item) === "in-progress");
  if (inProgress) return { type: "resume", stop: inProgress };
  const pending = stops.find((stop) => getLearningState(progress, stop.item) !== "completed");
  if (pending) {
    const started = stops.some((stop) => getLearningState(progress, stop.item) === "completed");
    return { type: started ? "continue" : "start", stop: pending };
  }
  const next = nextStop(stops[stops.length - 1]?.item.id ?? "");
  return next ? { type: "next-module", stop: next } : { type: "finished" };
}
