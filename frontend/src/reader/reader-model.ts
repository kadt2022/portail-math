import type { CourseDefinition } from "../courses/course-engine/course-model";
import {
  courseLessonPath,
  courseModulePath,
  isPublished,
} from "../courses/course-engine/course-model";
import { getCourseProgress, type CourseProgress } from "../courses/course-engine/course-progress";

// Modèle neutre du lecteur : il ne connaît ni les leçons, ni les exercices, ni
// la langue. Chaque parcours le remplit à partir de son propre catalogue via un
// adaptateur ; le lecteur n'a ainsi jamais à savoir combien de modules existent.
export interface ReaderItem {
  id: string;
  kind: "lesson" | "evaluation";
  titleKey: string;
  titleValues?: Record<string, number>;
  path: string;
  published: boolean;
}

export interface ReaderModule {
  id: string;
  number: number;
  titleKey: string;
  path: string;
  published: boolean;
  items: readonly ReaderItem[];
}

export interface ReaderProgressSummary {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
}

export interface ReaderCourse {
  id: string;
  namespace: string;
  basePath: string;
  modules: readonly ReaderModule[];
  // Adapte une progression déjà stockée sur l'appareil à ce parcours. Le lecteur
  // ne fait que lire : il n'écrit jamais de progression.
  prepareProgress?: (progress: CourseProgress) => CourseProgress;
  summarizeProgress: (progress: CourseProgress) => ReaderProgressSummary;
}

export type ReaderStop =
  | { kind: "intro"; path: string }
  | { kind: "module"; path: string; module: ReaderModule };

export interface ReaderStats {
  modules: number;
  publishedModules: number;
  lessons: number;
  evaluations: number;
}

export function readerCourseFromDefinition(definition: CourseDefinition, namespace: string): ReaderCourse {
  return {
    id: definition.id,
    namespace,
    basePath: definition.basePath,
    modules: definition.modules.map((module) => ({
      id: module.id,
      number: module.number,
      titleKey: module.titleKey,
      path: courseModulePath(definition, module.id),
      published: (module.publication ?? "available") === "available",
      items: [...module.lessons, module.evaluation].map((item, index) => ({
        id: item.id,
        kind: item.kind,
        titleKey: item.titleKey,
        titleValues: { number: index + 1 },
        path: courseLessonPath(definition, module.id, item.id),
        published: isPublished(item),
      })),
    })),
    summarizeProgress: (progress) => getCourseProgress(progress, definition),
  };
}

function isInside(base: string, pathname: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function findReaderCourse(courses: readonly ReaderCourse[], pathname: string) {
  return courses.find((course) => isInside(course.basePath, pathname));
}

export function findReaderCourseById(courses: readonly ReaderCourse[], courseId: string) {
  return courses.find((course) => course.id === courseId);
}

// Étapes de lecture dans l'ordre du menu : « Bien démarrer », puis chaque module.
export function getReaderStops(course: ReaderCourse): readonly ReaderStop[] {
  return [
    { kind: "intro", path: course.basePath },
    ...course.modules.map((module): ReaderStop => ({ kind: "module", path: module.path, module })),
  ];
}

export function getActiveStopIndex(course: ReaderCourse, pathname: string) {
  return getReaderStops(course).findIndex((stop, index) =>
    index === 0 ? pathname === stop.path : isInside(stop.path, pathname),
  );
}

export function getReaderNeighbors(course: ReaderCourse, pathname: string) {
  const stops = getReaderStops(course);
  const index = getActiveStopIndex(course, pathname);
  if (index < 0) {
    return { previous: undefined, next: undefined };
  }
  return { previous: stops[index - 1], next: stops[index + 1] };
}

export function getReaderStats(course: ReaderCourse): ReaderStats {
  const items = course.modules.flatMap((module) => module.items.filter((item) => item.published));
  return {
    modules: course.modules.length,
    publishedModules: course.modules.filter((module) => module.published && module.items.some((item) => item.published))
      .length,
    lessons: items.filter((item) => item.kind === "lesson").length,
    evaluations: items.filter((item) => item.kind === "evaluation").length,
  };
}
