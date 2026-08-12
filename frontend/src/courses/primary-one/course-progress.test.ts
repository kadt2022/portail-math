import { describe, expect, it } from "vitest";

import {
  getLearningItems,
  PRIMARY_ONE_MODULES,
} from "./course-catalogue";
import {
  completeLearningStep,
  createEmptyCourseProgress,
  getCoursePrimaryAction,
  getCourseProgress,
  getLearningState,
  getModuleProgress,
  startLearningItem,
} from "./course-progress";

function completeItem(progress: ReturnType<typeof createEmptyCourseProgress>, item: ReturnType<typeof getLearningItems>[number]) {
  return item.steps.reduce(
    (current, step, index) =>
      completeLearningStep(current, item, step.id, `2026-08-11T10:0${index}:00.000Z`),
    progress,
  );
}

describe("Progression du parcours de 1re primaire", () => {
  const moduleOne = PRIMARY_ONE_MODULES[0];
  const firstLesson = moduleOne.lessons[0];

  it("calcule la progression initiale et les états sans compter l'évaluation comme une leçon", () => {
    const progress = createEmptyCourseProgress();

    expect(getCourseProgress(progress)).toEqual({
      completedLessons: 0,
      totalLessons: 4,
      percentage: 0,
      completed: false,
    });
    expect(getModuleProgress(progress, moduleOne)).toMatchObject({
      state: "not-started",
      completedLessons: 0,
      totalLessons: 4,
    });
    expect(getCoursePrimaryAction(progress)).toMatchObject({ type: "start", itemId: firstLesson.id });
  });

  it("passe une leçon de À commencer à En cours puis Terminé", () => {
    let progress = startLearningItem(createEmptyCourseProgress(), firstLesson);
    expect(getLearningState(progress, firstLesson)).toBe("in-progress");
    expect(getModuleProgress(progress, moduleOne).state).toBe("in-progress");

    progress = completeItem(progress, firstLesson);

    expect(getLearningState(progress, firstLesson)).toBe("completed");
    expect(getModuleProgress(progress, moduleOne)).toMatchObject({
      state: "in-progress",
      completedLessons: 1,
      percentage: 25,
    });
    expect(getCoursePrimaryAction(progress)).toMatchObject({
      type: "next-lesson",
      itemId: moduleOne.lessons[1].id,
    });
  });

  it("termine automatiquement le module après ses leçons et son évaluation", () => {
    const progress = getLearningItems(moduleOne).reduce(completeItem, createEmptyCourseProgress());

    expect(getModuleProgress(progress, moduleOne)).toMatchObject({
      state: "completed",
      completedLessons: 4,
      percentage: 100,
    });
    expect(getCoursePrimaryAction(progress)).toEqual({
      type: "next-module",
      moduleId: PRIMARY_ONE_MODULES[1].id,
    });
  });

  it("reprend l'élément en cours dont l'activité est la plus récente", () => {
    const secondLesson = moduleOne.lessons[1];
    let progress = startLearningItem(
      createEmptyCourseProgress(),
      firstLesson,
      "2026-08-11T09:00:00.000Z",
    );
    progress = startLearningItem(progress, secondLesson, "2026-08-11T10:00:00.000Z");

    expect(getCoursePrimaryAction(progress)).toEqual({
      type: "resume",
      moduleId: moduleOne.id,
      itemId: secondLesson.id,
    });
  });
});
