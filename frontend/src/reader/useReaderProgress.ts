import { useMemo } from "react";

import { createLocalCourseProgressStorage } from "../courses/course-engine/progress-storage";
import type { ReaderCourse, ReaderProgressSummary } from "./reader-model";

// Lecture seule de la progression déjà stockée sur l'appareil par les pages de
// leçon. Le lecteur n'écrit rien : aucune donnée n'est ajoutée. La valeur est relue
// à chaque changement de page (`refreshKey`), pas en continu pendant une leçon.
export function useReaderProgress(course: ReaderCourse, refreshKey: string): ReaderProgressSummary | undefined {
  return useMemo(() => {
    void refreshKey;
    try {
      const stored = createLocalCourseProgressStorage(window.localStorage, course.id).load();
      return course.summarizeProgress(course.prepareProgress ? course.prepareProgress(stored) : stored);
    } catch {
      return undefined;
    }
  }, [course, refreshKey]);
}
