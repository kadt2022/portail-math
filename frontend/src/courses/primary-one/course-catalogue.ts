export const PRIMARY_ONE_COURSE_ID = "MATH-1P";
export const PRIMARY_ONE_BASE_PATH = "/apprentissages/primaire/1/mathematiques";

export type LearningItemKind = "lesson" | "evaluation";
export type LessonStepKind =
  | "discover"
  | "manipulate"
  | "understand"
  | "practice"
  | "play"
  | "remember";

export interface LessonStep {
  id: string;
  kind: LessonStepKind;
  labelKey: string;
  required: boolean;
}

export interface LearningItem {
  id: string;
  moduleId: string;
  kind: LearningItemKind;
  titleKey: string;
  steps: readonly LessonStep[];
}

export interface PrimaryOneModule {
  id: string;
  number: number;
  titleKey: string;
  illustration: string;
  lessons: readonly LearningItem[];
  evaluation?: LearningItem;
}

function referenceLesson(
  id: string,
  moduleId: string,
  titleKey: string,
  kinds: readonly LessonStepKind[] = ["discover", "manipulate", "remember"],
): LearningItem {
  return {
    id,
    moduleId,
    kind: "lesson",
    titleKey,
    steps: kinds.map((kind, index) => ({
      id: `${id}-S${String(index + 1).padStart(2, "0")}`,
      kind,
      labelKey: `steps.${kind}`,
      required: true,
    })),
  };
}

const MODULE_ONE_ID = "MATH-1P-U01";

const moduleOneLessons = [
  referenceLesson("MATH-1P-U01-L01", MODULE_ONE_ID, "lessons.l1.title"),
  referenceLesson("MATH-1P-U01-L02", MODULE_ONE_ID, "lessons.l2.title"),
  referenceLesson("MATH-1P-U01-L03", MODULE_ONE_ID, "lessons.l3.title"),
  referenceLesson("MATH-1P-U01-L04", MODULE_ONE_ID, "lessons.l4.title"),
] as const;

const moduleOneEvaluation: LearningItem = {
  id: "MATH-1P-U01-EVAL",
  moduleId: MODULE_ONE_ID,
  kind: "evaluation",
  titleKey: "evaluation.title",
  steps: [
    {
      id: "MATH-1P-U01-EVAL-S01",
      kind: "practice",
      labelKey: "steps.practice",
      required: true,
    },
  ],
};

export const PRIMARY_ONE_MODULES: readonly PrimaryOneModule[] = [
  {
    id: MODULE_ONE_ID,
    number: 1,
    titleKey: "modules.m1.title",
    illustration: "● ▲",
    lessons: moduleOneLessons,
    evaluation: moduleOneEvaluation,
  },
  { id: "MATH-1P-U02", number: 2, titleKey: "modules.m2.title", illustration: "● ● ●", lessons: [] },
  { id: "MATH-1P-U03", number: 3, titleKey: "modules.m3.title", illustration: "1 · 10", lessons: [] },
  { id: "MATH-1P-U04", number: 4, titleKey: "modules.m4.title", illustration: "<  =  >", lessons: [] },
  { id: "MATH-1P-U05", number: 5, titleKey: "modules.m5.title", illustration: "+", lessons: [] },
  { id: "MATH-1P-U06", number: 6, titleKey: "modules.m6.title", illustration: "−", lessons: [] },
  { id: "MATH-1P-U07", number: 7, titleKey: "modules.m7.title", illustration: "11 · 20", lessons: [] },
  { id: "MATH-1P-U08", number: 8, titleKey: "modules.m8.title", illustration: "▰", lessons: [] },
  { id: "MATH-1P-U09", number: 9, titleKey: "modules.m9.title", illustration: "○ □ △", lessons: [] },
  { id: "MATH-1P-U10", number: 10, titleKey: "modules.m10.title", illustration: "◷ ★", lessons: [] },
];

export function getPrimaryOneModule(moduleId: string | undefined) {
  return PRIMARY_ONE_MODULES.find((module) => module.id === moduleId);
}

export function getLearningItems(module: PrimaryOneModule): readonly LearningItem[] {
  return module.evaluation ? [...module.lessons, module.evaluation] : module.lessons;
}

export function getLearningItem(module: PrimaryOneModule, itemId: string | undefined) {
  return getLearningItems(module).find((item) => item.id === itemId);
}

export function getAllLearningItems() {
  return PRIMARY_ONE_MODULES.flatMap(getLearningItems);
}

export function modulePath(moduleId: string) {
  return `${PRIMARY_ONE_BASE_PATH}/modules/${moduleId}`;
}

export function lessonPath(moduleId: string, lessonId: string) {
  return `${modulePath(moduleId)}/lecons/${lessonId}`;
}
