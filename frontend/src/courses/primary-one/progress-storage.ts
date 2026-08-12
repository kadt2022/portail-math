import {
  createEmptyCourseProgress,
  type CourseProgress,
} from "./course-progress";

export const PRIMARY_ONE_PROGRESS_KEY = "mbuyamba-math:course-progress:MATH-1P";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CourseProgressStorage {
  load(): CourseProgress;
  save(progress: CourseProgress): void;
  clear(): void;
}

function isCourseProgress(value: unknown): value is CourseProgress {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CourseProgress>;
  return (
    candidate.version === 1 &&
    typeof candidate.courseId === "string" &&
    typeof candidate.items === "object" &&
    candidate.items !== null
  );
}

export function createLocalCourseProgressStorage(storage: StorageLike): CourseProgressStorage {
  return {
    load() {
      const raw = storage.getItem(PRIMARY_ONE_PROGRESS_KEY);
      if (!raw) {
        return createEmptyCourseProgress();
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        return isCourseProgress(parsed) ? parsed : createEmptyCourseProgress();
      } catch {
        return createEmptyCourseProgress();
      }
    },
    save(progress) {
      storage.setItem(PRIMARY_ONE_PROGRESS_KEY, JSON.stringify(progress));
    },
    clear() {
      storage.removeItem(PRIMARY_ONE_PROGRESS_KEY);
    },
  };
}
