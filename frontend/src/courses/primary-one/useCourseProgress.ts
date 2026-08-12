import { useCallback, useMemo, useState } from "react";

import type { LearningItem } from "./course-catalogue";
import {
  completeLearningStep,
  startLearningItem,
  type CourseProgress,
} from "./course-progress";
import { createLocalCourseProgressStorage } from "./progress-storage";

export function useCourseProgress() {
  const storage = useMemo(() => createLocalCourseProgressStorage(window.localStorage), []);
  const [progress, setProgress] = useState<CourseProgress>(() => storage.load());

  const startItem = useCallback(
    (item: LearningItem) => {
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
    (item: LearningItem, stepId: string) => {
      setProgress((current) => {
        const next = completeLearningStep(current, item, stepId);
        storage.save(next);
        return next;
      });
    },
    [storage],
  );

  return { progress, startItem, completeStep };
}
