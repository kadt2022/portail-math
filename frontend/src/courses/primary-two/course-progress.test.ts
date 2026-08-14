import { describe, expect, it } from "vitest";

import type { CourseDefinition, CourseItem } from "../course-engine/course-model";
import {
  completeLearningStep,
  createEmptyCourseProgress,
  getCoursePrimaryAction,
  getCourseProgress,
  getLearningState,
  getModuleProgress,
  startLearningItem,
} from "../course-engine/course-progress";
import { PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";

function completeItem(progress: ReturnType<typeof createEmptyCourseProgress>, item: CourseItem) {
  return item.steps.reduce(
    (current, step, index) =>
      completeLearningStep(current, item, step.id, true, `2026-08-14T10:0${index}:00.000Z`),
    progress,
  );
}

function publishModuleOneLessons(): CourseDefinition {
  return {
    ...PRIMARY_TWO_COURSE,
    modules: PRIMARY_TWO_COURSE.modules.map((module, moduleIndex) =>
      moduleIndex === 0
        ? {
            ...module,
            lessons: module.lessons.map((lesson, lessonIndex) => ({
              ...lesson,
              publication: "available" as const,
              steps:
                lesson.steps.length > 0
                  ? lesson.steps
                  : [
                      {
                        id: `${lesson.id}-S01`,
                        kind: "practice" as const,
                        labelKey: "steps.practice",
                        required: true,
                      },
                    ],
              titleKey: lessonIndex === 0 ? lesson.titleKey : `lessons.l${lessonIndex + 1}.title`,
            })),
          }
        : module,
    ),
  };
}

describe("Catalogue et progression de 2e primaire", () => {
  const moduleOne = PRIMARY_TWO_MODULES[0];
  const firstLesson = moduleOne.lessons[0];

  it("déclare 10 modules, 40 leçons prévues et 10 évaluations", () => {
    expect(PRIMARY_TWO_COURSE.id).toBe("MATH-2P");
    expect(PRIMARY_TWO_MODULES).toHaveLength(10);
    expect(PRIMARY_TWO_MODULES.flatMap((module) => module.lessons)).toHaveLength(40);
    expect(PRIMARY_TWO_MODULES.every((module) => module.lessons.length === 4)).toBe(true);
    expect(PRIMARY_TWO_MODULES.every((module) => Boolean(module.evaluation))).toBe(true);
  });

  it("sépare publication et progression et démarre à 0 / 40", () => {
    const progress = createEmptyCourseProgress(PRIMARY_TWO_COURSE.id);

    expect(getCourseProgress(progress, PRIMARY_TWO_COURSE)).toEqual({
      completedLessons: 0,
      totalLessons: 40,
      percentage: 0,
      completed: false,
    });
    expect(getLearningState(progress, firstLesson)).toBe("not-started");
    expect(getLearningState(progress, moduleOne.lessons[1])).toBeNull();
    expect(getModuleProgress(progress, PRIMARY_TWO_MODULES[1])).toMatchObject({
      publication: "coming-soon",
      state: null,
      totalLessons: 4,
    });
  });

  it("calcule 1 / 40 = 2,5 % et 1 / 4 = 25 % sans terminer le module", () => {
    const completed = completeItem(createEmptyCourseProgress(PRIMARY_TWO_COURSE.id), firstLesson);

    expect(getCourseProgress(completed, PRIMARY_TWO_COURSE)).toMatchObject({
      completedLessons: 1,
      totalLessons: 40,
      percentage: 2.5,
    });
    expect(getModuleProgress(completed, moduleOne)).toMatchObject({
      state: "in-progress",
      completedLessons: 1,
      totalLessons: 4,
      percentage: 25,
    });
    expect(getCoursePrimaryAction(completed, PRIMARY_TWO_COURSE)).toEqual({
      type: "return-to-modules",
      moduleId: moduleOne.id,
    });
  });

  it("calcule aussi 4 / 40 lorsque les quatre leçons seront publiées et réussies", () => {
    const publishedCourse = publishModuleOneLessons();
    const completed = publishedCourse.modules[0].lessons.reduce(
      (progress, lesson) => completeItem(progress, lesson),
      createEmptyCourseProgress(publishedCourse.id),
    );

    expect(getCourseProgress(completed, publishedCourse)).toMatchObject({
      completedLessons: 4,
      totalLessons: 40,
      percentage: 10,
    });
    expect(getModuleProgress(completed, publishedCourse.modules[0])).toMatchObject({
      completedLessons: 4,
      totalLessons: 4,
      percentage: 100,
      state: "in-progress",
    });
  });

  it("refuse de démarrer ou valider un contenu à venir, vide ou incorrect", () => {
    const empty = createEmptyCourseProgress(PRIMARY_TWO_COURSE.id);
    const coming = moduleOne.lessons[1];

    expect(startLearningItem(empty, coming)).toBe(empty);
    expect(completeLearningStep(empty, coming, "inexistant", true)).toBe(empty);
    expect(completeLearningStep(empty, firstLesson, firstLesson.steps[0].id, false)).toBe(empty);
  });

  it("reprend la première étape obligatoire non terminée", () => {
    const afterManipulation = completeLearningStep(
      completeLearningStep(
        createEmptyCourseProgress(PRIMARY_TWO_COURSE.id),
        firstLesson,
        firstLesson.steps[0].id,
        true,
      ),
      firstLesson,
      firstLesson.steps[1].id,
      true,
    );

    expect(afterManipulation.items[firstLesson.id].currentStepId).toBe(firstLesson.steps[2].id);
    expect(getCoursePrimaryAction(afterManipulation, PRIMARY_TWO_COURSE)).toMatchObject({
      type: "resume",
      itemId: firstLesson.id,
    });
  });
});
