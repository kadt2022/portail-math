import type { CourseItem, CourseModule, LessonStepKind } from "./course-model";
import { getModuleItems } from "./course-model";

// Fabrique commune du catalogue d'un cours piloté par le moteur de leçon
// générique : 10 modules, 4 leçons + 1 évaluation par module, un seul
// module publié au départ. Toute la structure d'une leçon/évaluation (les
// étapes et leur ordre) est la même pour tous les cours ; seules les
// données propres au cours (identifiants, titres, illustrations) varient —
// voir `primary-four/course-catalogue.ts` pour un exemple d'utilisation.

export const LESSON_STEP_KINDS = [
  "situation",
  "discover",
  "manipulate",
  "example",
  "practice",
  "reflect",
  "play",
  "remember",
  "check",
] as const satisfies readonly LessonStepKind[];

export const EVALUATION_STEP_KINDS = [
  "practice",
  "practice",
  "practice",
  "practice",
  "assess",
] as const satisfies readonly LessonStepKind[];

export function step(id: string, kind: LessonStepKind, index: number) {
  return {
    id: `${id}-S${String(index + 1).padStart(2, "0")}`,
    kind,
    labelKey: `steps.${kind}`,
    required: true,
  } as const;
}

export function lesson(moduleId: string, lessonNumber: number, titleKey: string): CourseItem {
  const id = `${moduleId}-L${String(lessonNumber).padStart(2, "0")}`;
  return {
    id,
    moduleId,
    kind: "lesson",
    titleKey,
    publication: "available",
    steps: LESSON_STEP_KINDS.map((kind, index) => step(id, kind, index)),
  };
}

export function evaluation(moduleId: string): CourseItem {
  const id = `${moduleId}-EVAL`;
  return {
    id,
    moduleId,
    kind: "evaluation",
    titleKey: "evaluation.title",
    publication: "available",
    steps: EVALUATION_STEP_KINDS.map((kind, index) => step(id, kind, index)),
  };
}

export function comingLesson(moduleId: string, lessonNumber: number, titleKey = "lessons.plannedTitle"): CourseItem {
  return {
    id: `${moduleId}-L${String(lessonNumber).padStart(2, "0")}`,
    moduleId,
    kind: "lesson",
    titleKey,
    publication: "coming-soon",
    steps: [],
  };
}

export function comingEvaluation(moduleId: string): CourseItem {
  return {
    id: `${moduleId}-EVAL`,
    moduleId,
    kind: "evaluation",
    titleKey: "evaluation.title",
    publication: "coming-soon",
    steps: [],
  };
}

// `coursePrefix` est le préfixe d'identifiant du cours (ex. "MATH-4P-U") :
// chaque cours a le sien, le reste de la fabrique est strictement commun.
export function plannedModule(
  coursePrefix: string,
  number: number,
  titleKey: string,
  illustration: string,
): CourseModule {
  const moduleId = `${coursePrefix}${String(number).padStart(2, "0")}`;
  return {
    id: moduleId,
    number,
    titleKey,
    illustration,
    publication: "coming-soon",
    plannedLessonCount: 4,
    lessons: [1, 2, 3, 4].map((lessonNumber) => comingLesson(moduleId, lessonNumber)),
    evaluation: comingEvaluation(moduleId),
  };
}

export function findModule(modules: readonly CourseModule[], moduleId: string | undefined) {
  return modules.find((module) => module.id === moduleId);
}

export function findItem(module: CourseModule, itemId: string | undefined) {
  return getModuleItems(module).find((item) => item.id === itemId) as CourseItem | undefined;
}
