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
  return getGenericCourseProgress(progress, PRIMARY_ONE_DEFINITION);
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
  return getGenericCoursePrimaryAction(progress, PRIMARY_ONE_DEFINITION);
}
