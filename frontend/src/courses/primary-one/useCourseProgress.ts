import { useCourseProgress as useGenericCourseProgress } from "../course-engine/useCourseProgress";
import { PRIMARY_ONE_COURSE_ID } from "./course-catalogue";

export function useCourseProgress() {
  return useGenericCourseProgress(PRIMARY_ONE_COURSE_ID);
}
