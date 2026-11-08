import type {
  CourseDefinition,
  CourseItem,
  CourseModule,
  LessonStepKind,
} from "../course-engine/course-model";
import { courseLessonPath, courseModulePath, getModuleItems } from "../course-engine/course-model";
import { getInteractiveContent } from "./content";

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
const LESSON_TWO_ID = "MATH-2P-U01-L02";
const LESSON_THREE_ID = "MATH-2P-U01-L03";
const LESSON_FOUR_ID = "MATH-2P-U01-L04";

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

const lessonTwo: CourseItem = {
  id: LESSON_TWO_ID,
  moduleId: MODULE_ONE_ID,
  kind: "lesson",
  titleKey: "lessons.l2.title",
  publication: "available",
  steps: (["discover", "manipulate", "understand", "practice", "play", "remember"] as const).map(
    (kind, index) => step(LESSON_TWO_ID, kind, index),
  ),
};

const lessonThree: CourseItem = {
  id: LESSON_THREE_ID,
  moduleId: MODULE_ONE_ID,
  kind: "lesson",
  titleKey: "lessons.l3.title",
  publication: "available",
  steps: (["discover", "manipulate", "understand", "practice", "play", "remember"] as const).map(
    (kind, index) => step(LESSON_THREE_ID, kind, index),
  ),
};

const lessonFour: CourseItem = {
  id: LESSON_FOUR_ID,
  moduleId: MODULE_ONE_ID,
  kind: "lesson",
  titleKey: "lessons.l4.title",
  publication: "available",
  steps: (["discover", "manipulate", "understand", "practice", "play", "remember"] as const).map(
    (kind, index) => step(LESSON_FOUR_ID, kind, index),
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

const LESSON_STEP_KINDS = ["discover", "manipulate", "understand", "practice", "play", "remember"] as const;

// Leçons L05 à L40 : publiées dès que leurs six activités existent dans le
// registre `content/`. Sinon elles restent « à venir », sans progression.
function interactiveLesson(moduleId: string, lessonNumber: number): CourseItem {
  const id = `${moduleId}-L${String(lessonNumber).padStart(2, "0")}`;
  const content = getInteractiveContent(id);
  if (!content) return comingLesson(moduleId, lessonNumber);
  return {
    id,
    moduleId,
    kind: "lesson",
    titleKey: `lessons.${content.text}.title`,
    publication: "available",
    steps: LESSON_STEP_KINDS.map((kind, index) => step(id, kind, index)),
  };
}

// Évaluations : une étape par question, puis l'autoévaluation.
function interactiveEvaluation(id: string, moduleId: string, titleKey: string): CourseItem | undefined {
  const content = getInteractiveContent(id);
  if (!content) return undefined;
  return {
    id,
    moduleId,
    kind: "evaluation",
    titleKey,
    publication: "available",
    steps: content.activities.map((activity, index) =>
      step(id, activity.type === "selfcheck" ? "check" : "assess", index),
    ),
  };
}

function interactiveModule(number: number, titleKey: string, illustration: string): CourseModule {
  const moduleId = `MATH-2P-U${String(number).padStart(2, "0")}`;
  const lessons = [1, 2, 3, 4].map((lessonNumber) => interactiveLesson(moduleId, lessonNumber));
  const evaluation =
    interactiveEvaluation(`${moduleId}-EVAL`, moduleId, "evaluation.title") ?? comingEvaluation(moduleId);
  const published = lessons.some((lesson) => lesson.publication === "available");
  return {
    ...plannedModule(number, titleKey, illustration),
    publication: published ? "available" : "coming-soon",
    lessons,
    evaluation,
  };
}

export const PRIMARY_TWO_FINAL_ASSESSMENT_ID = "MATH-2P-BILAN";

function withFinalAssessment(module: CourseModule): CourseModule {
  const finalEvaluation = interactiveEvaluation(PRIMARY_TWO_FINAL_ASSESSMENT_ID, module.id, "evaluation.finalTitle");
  return finalEvaluation ? { ...module, finalEvaluation } : module;
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
      lessonTwo,
      lessonThree,
      lessonFour,
    ],
    evaluation:
      interactiveEvaluation(`${MODULE_ONE_ID}-EVAL`, MODULE_ONE_ID, "evaluation.title") ?? comingEvaluation(MODULE_ONE_ID),
  },
  interactiveModule(2, "modules.m2.title", "10 · 100"),
  interactiveModule(3, "modules.m3.title", "+"),
  interactiveModule(4, "modules.m4.title", "−"),
  interactiveModule(5, "modules.m5.title", "3 × 4"),
  interactiveModule(6, "modules.m6.title", "12 ÷ 3"),
  interactiveModule(7, "modules.m7.title", "FC"),
  interactiveModule(8, "modules.m8.title", "cm · m"),
  interactiveModule(9, "modules.m9.title", "○ □ △"),
  withFinalAssessment(interactiveModule(10, "modules.m10.title", "◷")),
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
