import {
  getAllLearningItems,
  getLearningItems,
  PRIMARY_ONE_COURSE_ID,
  PRIMARY_ONE_MODULES,
  type LearningItem,
  type PrimaryOneModule,
} from "./course-catalogue";

export type LearningState = "not-started" | "in-progress" | "completed";

export interface LearningItemProgress {
  moduleId: string;
  itemId: string;
  currentStepId: string;
  completedStepIds: string[];
  completed: boolean;
  lastActivityAt: string;
}

export interface CourseProgress {
  version: 1;
  courseId: string;
  items: Record<string, LearningItemProgress>;
}

export interface ModuleProgressSummary {
  state: LearningState;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

export interface CourseProgressSummary {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completed: boolean;
}

export type CoursePrimaryAction =
  | { type: "start"; moduleId: string; itemId: string }
  | { type: "resume"; moduleId: string; itemId: string }
  | { type: "next-lesson"; moduleId: string; itemId: string }
  | { type: "next-module"; moduleId: string }
  | { type: "review"; moduleId: string; itemId?: string };

export function createEmptyCourseProgress(): CourseProgress {
  return {
    version: 1,
    courseId: PRIMARY_ONE_COURSE_ID,
    items: {},
  };
}

export function getLearningState(
  progress: CourseProgress,
  item: LearningItem,
): LearningState {
  const itemProgress = progress.items[item.id];
  if (!itemProgress) {
    return "not-started";
  }
  return itemProgress.completed ? "completed" : "in-progress";
}

export function getModuleProgress(
  progress: CourseProgress,
  module: PrimaryOneModule,
): ModuleProgressSummary {
  const requiredItems = getLearningItems(module);
  const completedLessons = module.lessons.filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;
  const started = requiredItems.some((item) => Boolean(progress.items[item.id]));
  const completed =
    requiredItems.length > 0 &&
    requiredItems.every((item) => getLearningState(progress, item) === "completed");

  return {
    state: completed ? "completed" : started ? "in-progress" : "not-started",
    completedLessons,
    totalLessons: module.lessons.length,
    percentage:
      module.lessons.length === 0
        ? 0
        : Math.round((completedLessons / module.lessons.length) * 100),
  };
}

export function getCourseProgress(progress: CourseProgress): CourseProgressSummary {
  const lessons = PRIMARY_ONE_MODULES.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;
  const completed = PRIMARY_ONE_MODULES.every(
    (module) => getModuleProgress(progress, module).state === "completed",
  );

  return {
    completedLessons,
    totalLessons: lessons.length,
    percentage:
      lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100),
    completed,
  };
}

export function startLearningItem(
  progress: CourseProgress,
  item: LearningItem,
  now = new Date().toISOString(),
): CourseProgress {
  if (progress.items[item.id] || item.steps.length === 0) {
    return progress;
  }

  return {
    ...progress,
    items: {
      ...progress.items,
      [item.id]: {
        moduleId: item.moduleId,
        itemId: item.id,
        currentStepId: item.steps[0].id,
        completedStepIds: [],
        completed: false,
        lastActivityAt: now,
      },
    },
  };
}

export function completeLearningStep(
  progress: CourseProgress,
  item: LearningItem,
  stepId: string,
  now = new Date().toISOString(),
): CourseProgress {
  const started = startLearningItem(progress, item, now);
  const current = started.items[item.id];
  if (!current || !item.steps.some((step) => step.id === stepId)) {
    return started;
  }

  const completedStepIds = Array.from(new Set([...current.completedStepIds, stepId]));
  const nextRequiredStep = item.steps.find(
    (step) => step.required && !completedStepIds.includes(step.id),
  );
  const completed = item.steps
    .filter((step) => step.required)
    .every((step) => completedStepIds.includes(step.id));

  return {
    ...started,
    items: {
      ...started.items,
      [item.id]: {
        ...current,
        currentStepId: nextRequiredStep?.id ?? stepId,
        completedStepIds,
        completed,
        lastActivityAt: now,
      },
    },
  };
}

export function getCoursePrimaryAction(progress: CourseProgress): CoursePrimaryAction {
  const allItems = getAllLearningItems();
  const firstItem = allItems[0];
  const inProgress = allItems
    .filter((item) => getLearningState(progress, item) === "in-progress")
    .sort((left, right) =>
      progress.items[right.id].lastActivityAt.localeCompare(progress.items[left.id].lastActivityAt),
    )[0];

  if (inProgress) {
    return { type: "resume", moduleId: inProgress.moduleId, itemId: inProgress.id };
  }

  const startedItems = allItems.filter((item) => Boolean(progress.items[item.id]));
  if (startedItems.length === 0 && firstItem) {
    return { type: "start", moduleId: firstItem.moduleId, itemId: firstItem.id };
  }

  for (const module of PRIMARY_ONE_MODULES) {
    const moduleSummary = getModuleProgress(progress, module);
    if (moduleSummary.state === "completed") {
      const nextModule = PRIMARY_ONE_MODULES[module.number];
      if (nextModule && getModuleProgress(progress, nextModule).state === "not-started") {
        return { type: "next-module", moduleId: nextModule.id };
      }
      continue;
    }

    const nextItem = getLearningItems(module).find(
      (item) => getLearningState(progress, item) === "not-started",
    );
    if (nextItem) {
      return { type: "next-lesson", moduleId: module.id, itemId: nextItem.id };
    }
  }

  return {
    type: "review",
    moduleId: PRIMARY_ONE_MODULES[0].id,
    itemId: firstItem?.id,
  };
}
