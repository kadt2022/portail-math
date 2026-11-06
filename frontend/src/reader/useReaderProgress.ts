import { useMemo } from "react";

import { getSessionCourseProgress } from "../courses/course-engine/useCourseProgress";
import type { ReaderCourse, ReaderProgressSummary } from "./reader-model";

// Le lecteur ne consulte que l'état temporaire de la session courante.
export function useReaderProgress(course: ReaderCourse, refreshKey: string): ReaderProgressSummary | undefined {
  return useMemo(() => {
    void refreshKey;
    return course.summarizeProgress(getSessionCourseProgress(course.id));
  }, [course, refreshKey]);
}
