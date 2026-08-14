import type {
  CourseDefinition,
  CourseItem,
  CourseModule,
  LessonStepKind,
} from "../course-engine/course-model";
import { courseLessonPath, courseModulePath, getModuleItems } from "../course-engine/course-model";

export const PRIMARY_TWO_COURSE_ID = "MATH-2P";
export const PRIMARY_TWO_BASE_PATH = "/apprentissages/primaire/2/mathematiques";

function step(id: string, kind: LessonStepKind, index: number) {
  return {
    id: `${id}-S${String(index + 1).padStart(2, "0")}`,
    kind,
    labelKey: `steps.${kind}`,
    required: true,
  } as const;
}

const MODULE_ONE_ID = "MATH-2P-U01";
const LESSON_ONE_ID = "MATH-2P-U01-L01";

const lessonOne: CourseItem = {
  id: LESSON_ONE_ID,
  moduleId: MODULE_ONE_ID,
  kind: "lesson",
  titleKey: "lessons.l1.title",
  publication: "available",
  steps: (["discover", "manipulate", "understand", "practice", "play", "remember"] as const).map(
    (kind, index) => step(LESSON_ONE_ID, kind, index),
  ),
};

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

function plannedModule(
  number: number,
  titleKey: string,
  illustration: string,
): CourseModule {
  const moduleId = `MATH-2P-U${String(number).padStart(2, "0")}`;
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

export const PRIMARY_TWO_MODULES: readonly CourseModule[] = [
  {
    id: MODULE_ONE_ID,
    number: 1,
    titleKey: "modules.m1.title",
    illustration: "1 · 20",
    publication: "available",
    plannedLessonCount: 4,
    lessons: [
      lessonOne,
      comingLesson(MODULE_ONE_ID, 2, "lessons.l2.title"),
      comingLesson(MODULE_ONE_ID, 3, "lessons.l3.title"),
      comingLesson(MODULE_ONE_ID, 4, "lessons.l4.title"),
    ],
    evaluation: comingEvaluation(MODULE_ONE_ID),
  },
  plannedModule(2, "modules.m2.title", "10 · 100"),
  plannedModule(3, "modules.m3.title", "+"),
  plannedModule(4, "modules.m4.title", "−"),
  plannedModule(5, "modules.m5.title", "3 × 4"),
  plannedModule(6, "modules.m6.title", "12 ÷ 3"),
  plannedModule(7, "modules.m7.title", "FC"),
  plannedModule(8, "modules.m8.title", "cm · m"),
  plannedModule(9, "modules.m9.title", "○ □ △"),
  plannedModule(10, "modules.m10.title", "◷"),
] as const;

export const PRIMARY_TWO_COURSE: CourseDefinition = {
  id: PRIMARY_TWO_COURSE_ID,
  basePath: PRIMARY_TWO_BASE_PATH,
  plannedLessonCount: 40,
  modules: PRIMARY_TWO_MODULES,
};

export function getPrimaryTwoModule(moduleId: string | undefined) {
  return PRIMARY_TWO_MODULES.find((module) => module.id === moduleId);
}

export function getPrimaryTwoItem(module: CourseModule, itemId: string | undefined) {
  return getModuleItems(module).find((item) => item.id === itemId) as CourseItem | undefined;
}

export function modulePath(moduleId: string) {
  return courseModulePath(PRIMARY_TWO_COURSE, moduleId);
}

export function lessonPath(moduleId: string, lessonId: string) {
  return courseLessonPath(PRIMARY_TWO_COURSE, moduleId, lessonId);
}
