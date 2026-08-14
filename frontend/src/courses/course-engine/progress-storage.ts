import { createEmptyCourseProgress, type CourseProgress } from "./course-progress";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CourseProgressStorage {
  load(): CourseProgress;
  save(progress: CourseProgress): void;
  clear(): void;
}

export function courseProgressKey(courseId: string) {
  return `mbuyamba-math:course-progress:${courseId}`;
}

function isCourseProgress(value: unknown, courseId: string): value is CourseProgress {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CourseProgress>;
  return (
    candidate.version === 1 &&
    candidate.courseId === courseId &&
    typeof candidate.items === "object" &&
    candidate.items !== null
  );
}

export function createLocalCourseProgressStorage(
  storage: StorageLike,
  courseId: string,
): CourseProgressStorage {
  const key = courseProgressKey(courseId);
  return {
    load() {
      const raw = storage.getItem(key);
      if (!raw) {
        return createEmptyCourseProgress(courseId);
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        return isCourseProgress(parsed, courseId)
          ? parsed
          : createEmptyCourseProgress(courseId);
      } catch {
        return createEmptyCourseProgress(courseId);
      }
    },
    save(progress) {
      if (progress.courseId === courseId) {
        storage.setItem(key, JSON.stringify(progress));
      }
    },
    clear() {
      storage.removeItem(key);
    },
  };
}
