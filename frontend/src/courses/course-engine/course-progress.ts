import {
  getModuleItems,
  getPublishedModuleItems,
  isPublished,
  type CourseDefinitionLike,
  type CourseItemLike,
  type CourseModuleLike,
  type LearningState,
  type PublicationState,
} from "./course-model";

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
  publication: PublicationState;
  state: LearningState | null;
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
  | { type: "return-to-modules"; moduleId: string }
  | { type: "review"; moduleId: string; itemId?: string };

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10;
}

export function createEmptyCourseProgress(courseId: string): CourseProgress {
  return { version: 1, courseId, items: {} };
}

export function getLearningState(
  progress: CourseProgress,
  item: CourseItemLike,
): LearningState | null {
  if (!isPublished(item)) {
    return null;
  }
  const itemProgress = progress.items[item.id];
  if (!itemProgress) {
    return "not-started";
  }
  return itemProgress.completed ? "completed" : "in-progress";
}

export function getModuleProgress(
  progress: CourseProgress,
  module: CourseModuleLike,
): ModuleProgressSummary {
  const publication = module.publication ?? "available";
  const totalLessons = module.plannedLessonCount ?? module.lessons.length;
  const completedLessons = module.lessons.filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;

  if (publication === "coming-soon") {
    return { publication, state: null, completedLessons, totalLessons, percentage: 0 };
  }

  const publishedItems = getPublishedModuleItems(module);
  const started = publishedItems.some((item) => Boolean(progress.items[item.id]));
  const everyLessonPublished =
    module.lessons.length === totalLessons && module.lessons.every(isPublished);
  const evaluationPublished = !module.evaluation || isPublished(module.evaluation);
  const completed =
    publishedItems.length > 0 &&
    everyLessonPublished &&
    evaluationPublished &&
    getModuleItems(module).every((item) => getLearningState(progress, item) === "completed");

  return {
    publication,
    state: completed ? "completed" : started ? "in-progress" : "not-started",
    completedLessons,
    totalLessons,
    percentage: totalLessons === 0 ? 0 : roundPercentage((completedLessons / totalLessons) * 100),
  };
}

export function getCourseProgress(
  progress: CourseProgress,
  course: CourseDefinitionLike,
): CourseProgressSummary {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const completedLessons = lessons.filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;
  const completed =
    completedLessons === course.plannedLessonCount &&
    course.modules.every((module) => getModuleProgress(progress, module).state === "completed");

  return {
    completedLessons,
    totalLessons: course.plannedLessonCount,
    percentage:
      course.plannedLessonCount === 0
        ? 0
        : roundPercentage((completedLessons / course.plannedLessonCount) * 100),
    completed,
  };
}

export function startLearningItem(
  progress: CourseProgress,
  item: CourseItemLike,
  now = new Date().toISOString(),
): CourseProgress {
  if (progress.items[item.id] || !isPublished(item)) {
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
  item: CourseItemLike,
  stepId: string,
  validated: boolean,
  now = new Date().toISOString(),
): CourseProgress {
  if (!validated || !isPublished(item)) {
    return progress;
  }

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

export function getCoursePrimaryAction(
  progress: CourseProgress,
  course: CourseDefinitionLike,
): CoursePrimaryAction {
  const publishedItems = course.modules.flatMap(getPublishedModuleItems);
  const firstItem = publishedItems[0];
  const inProgress = publishedItems
    .filter((item) => getLearningState(progress, item) === "in-progress")
    .sort((left, right) =>
      progress.items[right.id].lastActivityAt.localeCompare(progress.items[left.id].lastActivityAt),
    )[0];

  if (inProgress) {
    return { type: "resume", moduleId: inProgress.moduleId, itemId: inProgress.id };
  }

  if (!publishedItems.some((item) => Boolean(progress.items[item.id])) && firstItem) {
    return { type: "start", moduleId: firstItem.moduleId, itemId: firstItem.id };
  }

  for (const module of course.modules) {
    const summary = getModuleProgress(progress, module);
    if (summary.state === "completed") {
      const nextModule = course.modules[module.number];
      if (nextModule) {
        return { type: "next-module", moduleId: nextModule.id };
      }
      continue;
    }
    if (summary.state === null) {
      continue;
    }
    const nextItem = getPublishedModuleItems(module).find(
      (item) => getLearningState(progress, item) === "not-started",
    );
    if (nextItem) {
      return { type: "next-lesson", moduleId: module.id, itemId: nextItem.id };
    }
  }

  if (firstItem) {
    return {
      type: "return-to-modules",
      moduleId: firstItem.moduleId,
    };
  }

  return { type: "review", moduleId: course.modules[0]?.id ?? "" };
}
