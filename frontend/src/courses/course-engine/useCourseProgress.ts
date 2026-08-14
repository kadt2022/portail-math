import { useCallback, useMemo, useState } from "react";

import type { CourseItemLike } from "./course-model";
import {
  completeLearningStep,
  startLearningItem,
  type CourseProgress,
} from "./course-progress";
import { createLocalCourseProgressStorage } from "./progress-storage";

export function useCourseProgress(courseId: string) {
  const storage = useMemo(
    () => createLocalCourseProgressStorage(window.localStorage, courseId),
    [courseId],
  );
  const [progress, setProgress] = useState<CourseProgress>(() => storage.load());

  const startItem = useCallback(
    (item: CourseItemLike) => {
      setProgress((current) => {
        const next = startLearningItem(current, item);
        if (next !== current) {
          storage.save(next);
        }
        return next;
      });
    },
    [storage],
  );

  const completeStep = useCallback(
    (item: CourseItemLike, stepId: string, validated: boolean) => {
      setProgress((current) => {
        const next = completeLearningStep(current, item, stepId, validated);
        if (next !== current) {
          storage.save(next);
        }
        return next;
      });
    },
    [storage],
  );

  return { progress, startItem, completeStep };
}
