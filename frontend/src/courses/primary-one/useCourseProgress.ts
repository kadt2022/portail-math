import { useCourseProgress as useGenericCourseProgress } from "../course-engine/useCourseProgress";
import { PRIMARY_ONE_COURSE_ID, type LearningItem } from "./course-catalogue";

export function useCourseProgress() {
  const courseProgress = useGenericCourseProgress(PRIMARY_ONE_COURSE_ID);
  return {
    ...courseProgress,
    completeStep(item: LearningItem, stepId: string) {
      courseProgress.completeStep(item, stepId, true);
    },
  };
}
