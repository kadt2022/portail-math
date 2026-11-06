import { useCallback, useState } from "react";

import type { CourseItemLike } from "./course-model";
import {
  completeLearningStep,
  createEmptyCourseProgress,
  startLearningItem,
  type CourseProgress,
} from "./course-progress";
const sessionProgress = new Map<string, CourseProgress>();

export function getSessionCourseProgress(courseId: string) {
  return sessionProgress.get(courseId) ?? createEmptyCourseProgress(courseId);
}

export function setSessionCourseProgress(progress: CourseProgress) {
  sessionProgress.set(progress.courseId, progress);
}

export function resetSessionCourseProgress() {
  sessionProgress.clear();
}

export function useCourseProgress(courseId: string) {
  const [progress, setProgress] = useState<CourseProgress>(
    () => getSessionCourseProgress(courseId),
  );

  const startItem = useCallback(
    (item: CourseItemLike) => {
      setProgress((current) => {
        const next = startLearningItem(current, item);
        if (next !== current) sessionProgress.set(courseId, next);
        return next;
      });
    },
    [courseId],
  );

  const completeStep = useCallback(
    (item: CourseItemLike, stepId: string, validated: boolean) => {
      setProgress((current) => {
        const next = completeLearningStep(current, item, stepId, validated);
        if (next !== current) sessionProgress.set(courseId, next);
        return next;
      });
    },
    [courseId],
  );

  return { progress, startItem, completeStep };
}
