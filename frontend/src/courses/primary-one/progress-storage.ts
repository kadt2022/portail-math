import {
  courseProgressKey,
  createLocalCourseProgressStorage as createGenericLocalCourseProgressStorage,
  type CourseProgressStorage,
  type StorageLike,
} from "../course-engine/progress-storage";
import { PRIMARY_ONE_COURSE_ID } from "./course-catalogue";

export type { CourseProgressStorage };

export const PRIMARY_ONE_PROGRESS_KEY = courseProgressKey(PRIMARY_ONE_COURSE_ID);

export function createLocalCourseProgressStorage(storage: StorageLike): CourseProgressStorage {
  return createGenericLocalCourseProgressStorage(storage, PRIMARY_ONE_COURSE_ID);
}
