import { useCallback, useMemo, useState } from "react";

import type { CourseItemLike } from "./course-model";
import {
  completeLearningStep,
  startLearningItem,
  type CourseProgress,
} from "./course-progress";
import { createLocalCourseProgressStorage } from "./progress-storage";

const identityProgress = (progress: CourseProgress) => progress;

export function useCourseProgress(courseId: string, prepareProgress = identityProgress) {
  const storage = useMemo(
    () => createLocalCourseProgressStorage(window.localStorage, courseId),
    [courseId],
  );
  const [progress, setProgress] = useState<CourseProgress>(() => prepareProgress(storage.load()));

  const startItem = useCallback(
    (item: CourseItemLike) => {
      setProgress((current) => {
        const next = startLearningItem(prepareProgress(current), item);
        if (next !== current) {
          storage.save(next);
        }
        return next;
      });
    },
    [storage, prepareProgress],
  );

  const completeStep = useCallback(
    (item: CourseItemLike, stepId: string, validated: boolean) => {
      setProgress((current) => {
        const next = completeLearningStep(prepareProgress(current), item, stepId, validated);
        if (next !== current) {
          storage.save(next);
        }
        return next;
      });
    },
    [storage, prepareProgress],
  );

  return { progress, startItem, completeStep };
}
