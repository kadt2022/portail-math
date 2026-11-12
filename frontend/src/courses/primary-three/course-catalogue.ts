import type {
  CourseDefinition,
  CourseItem,
  CourseModule,
  LessonStepKind,
} from "../course-engine/course-model";
import { courseLessonPath, courseModulePath, getModuleItems } from "../course-engine/course-model";

export const PRIMARY_THREE_COURSE_ID = "MATH-3P";
export const PRIMARY_THREE_BASE_PATH = "/apprentissages/primaire/3/mathematiques";

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

function evaluation(moduleId: string, titleKey = "evaluation.title"): CourseItem {
  const id = `${moduleId}-EVAL`;
  return {
    id,
    moduleId,
    kind: "evaluation",
    titleKey,
    publication: "available",
    steps: EVALUATION_STEP_KINDS.map((kind, index) => step(id, kind, index)),
  };
}

// Unités 2 à 10 : quatre leçons et une évaluation, toutes publiées. Les titres
// viennent de `lessons.uXXlYY.title` et `evaluation.uXX.title` (i18n).
function unitModule(number: number, illustration: string): CourseModule {
  const unit = String(number).padStart(2, "0");
  const moduleId = `MATH-3P-U${unit}`;
  return {
    id: moduleId,
    number,
    titleKey: `modules.m${number}.title`,
    illustration,
    publication: "available",
    plannedLessonCount: 4,
    lessons: [1, 2, 3, 4].map((lessonNumber) =>
      lesson(moduleId, lessonNumber, `lessons.u${unit}l${String(lessonNumber).padStart(2, "0")}.title`),
    ),
    evaluation: evaluation(moduleId, `evaluation.u${unit}.title`),
  };
}

const MODULE_ONE_ID = "MATH-3P-U01";

export const PRIMARY_THREE_MODULES: readonly CourseModule[] = [
  {
    id: MODULE_ONE_ID,
    number: 1,
    titleKey: "modules.m1.title",
    illustration: "0 · 1000",
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
  unitModule(2, "+"),
  unitModule(3, "−"),
  unitModule(4, "× ÷"),
  unitModule(5, "½"),
  unitModule(6, "FC"),
  unitModule(7, "cm · kg · L"),
  unitModule(8, "△ □ ○"),
  unitModule(9, "◷"),
  unitModule(10, "▤"),
] as const;

export const PRIMARY_THREE_COURSE: CourseDefinition = {
  id: PRIMARY_THREE_COURSE_ID,
  basePath: PRIMARY_THREE_BASE_PATH,
  plannedLessonCount: 40,
  modules: PRIMARY_THREE_MODULES,
};

export function getPrimaryThreeModule(moduleId: string | undefined) {
  return PRIMARY_THREE_MODULES.find((module) => module.id === moduleId);
}

export function getPrimaryThreeItem(module: CourseModule, itemId: string | undefined) {
  return getModuleItems(module).find((item) => item.id === itemId) as CourseItem | undefined;
}

export function modulePath(moduleId: string) {
  return courseModulePath(PRIMARY_THREE_COURSE, moduleId);
}

export function lessonPath(moduleId: string, lessonId: string) {
  return courseLessonPath(PRIMARY_THREE_COURSE, moduleId, lessonId);
}
