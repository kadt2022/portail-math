import { EVALUATIONS, LESSON_CONTENT } from "./lesson-content";

export const PRIMARY_ONE_COURSE_ID = "MATH-1P";
export const PRIMARY_ONE_BASE_PATH = "/apprentissages/primaire/1/mathematiques";
export type LearningItemKind = "lesson" | "evaluation";
export type LessonStepKind = "discover" | "manipulate" | "understand" | "practice" | "play" | "remember";
export interface LessonStep { id: string; kind: LessonStepKind; labelKey: string; required: boolean }
export interface LearningItem { id: string; moduleId: string; kind: LearningItemKind; titleKey: string; steps: readonly LessonStep[] }
export interface PrimaryOneModule { id: string; number: number; titleKey: string; illustration: string; lessons: readonly LearningItem[]; evaluation: LearningItem; finalEvaluation?: LearningItem }

const lessonKinds: readonly [LessonStepKind, number][] = [["discover",1],["understand",4],["manipulate",2],["practice",5],["play",6],["remember",3]];

function evaluation(id: string, moduleId: string, final = false): LearningItem {
  return { id, moduleId, kind: "evaluation", titleKey: final ? "evaluation.finalTitle" : "evaluation.title", steps: EVALUATIONS[id].map((_, i) => ({ id: `${id}-S${String(i + 1).padStart(2,"0")}`, kind: "practice", labelKey: "steps.practice", required: true })) };
}

export const PRIMARY_ONE_FINAL = evaluation("MATH-1P-FINAL", "MATH-1P-U10", true);
const illustrations = ["● ▲","● ● ●","1 · 10","< = >","+","−","11 · 20","▰","○ □ △","◷ ★"];
export const PRIMARY_ONE_MODULES: readonly PrimaryOneModule[] = illustrations.map((illustration, index) => {
  const number = index + 1;
  const id = `MATH-1P-U${String(number).padStart(2,"0")}`;
  return {
    id, number, titleKey: `modules.m${number}.title`, illustration,
    lessons: Object.keys(LESSON_CONTENT).filter((lid) => lid.startsWith(`${id}-`)).map((lid): LearningItem => ({
      id: lid, moduleId: id, kind: "lesson", titleKey: `content.${lid}.title`,
      steps: lessonKinds.map(([kind, number]) => ({ id: `${lid}-S${String(number).padStart(2,"0")}`, kind, labelKey: `steps.${kind}`, required: true })),
    })),
    evaluation: evaluation(`${id}-EVAL`,id),
    ...(number === 10 ? { finalEvaluation: PRIMARY_ONE_FINAL } : {}),
  };
});

export function getPrimaryOneModule(moduleId: string | undefined) { return PRIMARY_ONE_MODULES.find((m) => m.id === moduleId); }
export function getLearningItems(module: PrimaryOneModule): readonly LearningItem[] { return [...module.lessons, module.evaluation, ...(module.finalEvaluation ? [module.finalEvaluation] : [])]; }
export function getLearningItem(module: PrimaryOneModule, itemId: string | undefined) { return getLearningItems(module).find((i) => i.id === itemId); }
export function getAllLearningItems() { return PRIMARY_ONE_MODULES.flatMap(getLearningItems); }
export function modulePath(moduleId: string) { return `${PRIMARY_ONE_BASE_PATH}/modules/${moduleId}`; }
export function lessonPath(moduleId: string, lessonId: string) { return `${modulePath(moduleId)}/lecons/${lessonId}`; }

export function questionsForStep(item: LearningItem, step: LessonStep) {
  if (item.kind === "evaluation") {
    const index = item.steps.findIndex((s) => s.id === step.id);
    return EVALUATIONS[item.id].slice(index,index + 1);
  }
  const content = LESSON_CONTENT[item.id];
  return step.kind === "discover" || step.kind === "understand" ? [] : content[step.kind];
}
