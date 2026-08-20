export type PublicationState = "available" | "coming-soon";
export type LearningState = "not-started" | "in-progress" | "completed";
export type LearningItemKind = "lesson" | "evaluation";
export type LessonStepKind =
  | "situation"
  | "discover"
  | "manipulate"
  | "understand"
  | "example"
  | "practice"
  | "reflect"
  | "play"
  | "remember"
  | "check"
  | "assess";

export interface CourseStep {
  id: string;
  kind: LessonStepKind;
  labelKey: string;
  required: boolean;
}

export interface CourseItem {
  id: string;
  moduleId: string;
  kind: LearningItemKind;
  titleKey: string;
  publication: PublicationState;
  steps: readonly CourseStep[];
}

export interface CourseModule {
  id: string;
  number: number;
  titleKey: string;
  illustration: string;
  publication: PublicationState;
  plannedLessonCount: number;
  lessons: readonly CourseItem[];
  evaluation: CourseItem;
}

export interface CourseDefinition {
  id: string;
  basePath: string;
  plannedLessonCount: number;
  modules: readonly CourseModule[];
}

export interface CourseItemLike {
  id: string;
  moduleId: string;
  kind: LearningItemKind;
  steps: readonly CourseStep[];
  publication?: PublicationState;
}

export interface CourseModuleLike {
  id: string;
  number: number;
  publication?: PublicationState;
  plannedLessonCount?: number;
  lessons: readonly CourseItemLike[];
  evaluation?: CourseItemLike;
}

export interface CourseDefinitionLike {
  id: string;
  plannedLessonCount: number;
  modules: readonly CourseModuleLike[];
}

export function isPublished(item: CourseItemLike) {
  return (item.publication ?? "available") === "available" && item.steps.length > 0;
}

export function getModuleItems(module: CourseModuleLike): readonly CourseItemLike[] {
  return module.evaluation ? [...module.lessons, module.evaluation] : module.lessons;
}

export function getPublishedModuleItems(module: CourseModuleLike) {
  return getModuleItems(module).filter(isPublished);
}

export function courseModulePath(course: Pick<CourseDefinition, "basePath">, moduleId: string) {
  return `${course.basePath}/modules/${moduleId}`;
}

export function courseLessonPath(
  course: Pick<CourseDefinition, "basePath">,
  moduleId: string,
  lessonId: string,
) {
  return `${courseModulePath(course, moduleId)}/lecons/${lessonId}`;
}
