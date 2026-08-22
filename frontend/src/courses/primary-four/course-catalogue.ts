import type {
  CourseDefinition,
  CourseItem,
  CourseModule,
  LessonStepKind,
} from "../course-engine/course-model";
import { courseLessonPath, courseModulePath, getModuleItems } from "../course-engine/course-model";

export const PRIMARY_FOUR_COURSE_ID = "MATH-4P";
export const PRIMARY_FOUR_BASE_PATH = "/apprentissages/primaire/4/mathematiques";

// Identifiant réservé pour le grand bilan final (§4/§30 du récit) : hors
// modules, il n'a pas encore de carte ni de contenu dans cette itération
// (seule l'unité 1 est jouable), mais l'identifiant est fixé dès maintenant
// pour ne jamais créer une seconde nomenclature plus tard.
export const PRIMARY_FOUR_FINAL_ASSESSMENT_ID = "MATH-4P-BILAN";

function step(id: string, kind: LessonStepKind, index: number) {
  return {
    id: `${id}-S${String(index + 1).padStart(2, "0")}`,
    kind,
    labelKey: `steps.${kind}`,
    required: true,
  } as const;
}

const LESSON_STEP_KINDS = [
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

const EVALUATION_STEP_KINDS = [
  "practice",
  "practice",
  "practice",
  "practice",
  "assess",
] as const satisfies readonly LessonStepKind[];

function lesson(moduleId: string, lessonNumber: number, titleKey: string): CourseItem {
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

function evaluation(moduleId: string): CourseItem {
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

function comingLesson(moduleId: string, lessonNumber: number, titleKey = "lessons.plannedTitle"): CourseItem {
  return {
    id: `${moduleId}-L${String(lessonNumber).padStart(2, "0")}`,
    moduleId,
    kind: "lesson",
    titleKey,
    publication: "coming-soon",
    steps: [],
  };
}

function comingEvaluation(moduleId: string): CourseItem {
  return {
    id: `${moduleId}-EVAL`,
    moduleId,
    kind: "evaluation",
    titleKey: "evaluation.title",
    publication: "coming-soon",
    steps: [],
  };
}

function plannedModule(number: number, titleKey: string, illustration: string): CourseModule {
  const moduleId = `MATH-4P-U${String(number).padStart(2, "0")}`;
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

const MODULE_ONE_ID = "MATH-4P-U01";

export const PRIMARY_FOUR_MODULES: readonly CourseModule[] = [
  {
    id: MODULE_ONE_ID,
    number: 1,
    titleKey: "modules.m1.title",
    illustration: "0 · 100 000",
    publication: "available",
    plannedLessonCount: 4,
    lessons: [
      lesson(MODULE_ONE_ID, 1, "lessons.l1.title"),
      lesson(MODULE_ONE_ID, 2, "lessons.l2.title"),
      lesson(MODULE_ONE_ID, 3, "lessons.l3.title"),
      lesson(MODULE_ONE_ID, 4, "lessons.l4.title"),
    ],
    evaluation: evaluation(MODULE_ONE_ID),
  },
  plannedModule(2, "modules.m2.title", "+ −"),
  plannedModule(3, "modules.m3.title", "×"),
  plannedModule(4, "modules.m4.title", "÷"),
  plannedModule(5, "modules.m5.title", "½ 0,1"),
  plannedModule(6, "modules.m6.title", "cm · kg · L"),
  plannedModule(7, "modules.m7.title", "▭"),
  plannedModule(8, "modules.m8.title", "△ ○"),
  plannedModule(9, "modules.m9.title", "◷ FC"),
  plannedModule(10, "modules.m10.title", "▤"),
] as const;

export const PRIMARY_FOUR_COURSE: CourseDefinition = {
  id: PRIMARY_FOUR_COURSE_ID,
  basePath: PRIMARY_FOUR_BASE_PATH,
  plannedLessonCount: 40,
  modules: PRIMARY_FOUR_MODULES,
};

export function getPrimaryFourModule(moduleId: string | undefined) {
  return PRIMARY_FOUR_MODULES.find((module) => module.id === moduleId);
}

export function getPrimaryFourItem(module: CourseModule, itemId: string | undefined) {
  return getModuleItems(module).find((item) => item.id === itemId) as CourseItem | undefined;
}

export function modulePath(moduleId: string) {
  return courseModulePath(PRIMARY_FOUR_COURSE, moduleId);
}

export function lessonPath(moduleId: string, lessonId: string) {
  return courseLessonPath(PRIMARY_FOUR_COURSE, moduleId, lessonId);
}
