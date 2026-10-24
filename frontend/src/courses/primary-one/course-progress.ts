import {
  completeLearningStep as completeGenericLearningStep,
  createEmptyCourseProgress as createGenericEmptyCourseProgress,
  getCoursePrimaryAction as getGenericCoursePrimaryAction,
  getCourseProgress as getGenericCourseProgress,
  getLearningState as getGenericLearningState,
  getModuleProgress as getGenericModuleProgress,
  startLearningItem as startGenericLearningItem,
  type CoursePrimaryAction,
  type CourseProgress,
  type CourseProgressSummary,
  type LearningItemProgress,
  type ModuleProgressSummary,
} from "../course-engine/course-progress";
import type { LearningState } from "../course-engine/course-model";
import {
  PRIMARY_ONE_COURSE_ID,
  PRIMARY_ONE_MODULES,
  PRIMARY_ONE_FINAL,
  getAllLearningItems,
  type LearningItem,
  type PrimaryOneModule,
} from "./course-catalogue";

export type {
  CoursePrimaryAction,
  CourseProgress,
  CourseProgressSummary,
  LearningItemProgress,
  LearningState,
  ModuleProgressSummary,
};

const PRIMARY_ONE_DEFINITION = {
  id: PRIMARY_ONE_COURSE_ID,
  plannedLessonCount: PRIMARY_ONE_MODULES.flatMap((module) => module.lessons).length,
  modules: PRIMARY_ONE_MODULES,
};

export function createEmptyCourseProgress(): CourseProgress {
  return createGenericEmptyCourseProgress(PRIMARY_ONE_COURSE_ID);
}

export function getLearningState(progress: CourseProgress, item: LearningItem): LearningState {
  return getGenericLearningState(progress, item) ?? "not-started";
}

export function getModuleProgress(
  progress: CourseProgress,
  module: PrimaryOneModule,
): ModuleProgressSummary & { state: LearningState } {
  const summary = getGenericModuleProgress(progress, module);
  return { ...summary, state: summary.state ?? "not-started" };
}

export function getCourseProgress(progress: CourseProgress): CourseProgressSummary {
  const summary = getGenericCourseProgress(progress, PRIMARY_ONE_DEFINITION);
  const items = getAllLearningItems();
  const completedItems = items.filter((i) => getLearningState(progress,i) === "completed").length;
  return { ...summary, percentage: Math.round(completedItems / items.length * 1000) / 10,
    completed: summary.completed && getLearningState(progress,PRIMARY_ONE_FINAL) === "completed" };
}

export function startLearningItem(
  progress: CourseProgress,
  item: LearningItem,
  now = new Date().toISOString(),
): CourseProgress {
  return startGenericLearningItem(progress, item, now);
}

export function completeLearningStep(
  progress: CourseProgress,
  item: LearningItem,
  stepId: string,
  now = new Date().toISOString(),
): CourseProgress {
  return completeGenericLearningStep(progress, item, stepId, true, now);
}

export function getCoursePrimaryAction(progress: CourseProgress): CoursePrimaryAction {
  const all = getAllLearningItems();
  const active = all.filter((i) => getLearningState(progress,i) === "in-progress").sort((a,b) => progress.items[b.id].lastActivityAt.localeCompare(progress.items[a.id].lastActivityAt))[0];
  if (active) return { type: "resume", moduleId: active.moduleId, itemId: active.id };
  const next = all.find((i) => getLearningState(progress,i) !== "completed");
  if (!next) return { type: "review", moduleId: all[0].moduleId, itemId: all[0].id };
  const generic = getGenericCoursePrimaryAction(progress, PRIMARY_ONE_DEFINITION);
  if (generic.type === "start") return generic;
  if (generic.type === "next-module" && generic.moduleId === next.moduleId) return generic;
  return { type: "next-lesson", moduleId: next.moduleId, itemId: next.id };
}
