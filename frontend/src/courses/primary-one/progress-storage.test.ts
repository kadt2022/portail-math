import { beforeEach, describe, expect, it } from "vitest";

import { PRIMARY_ONE_MODULES } from "./course-catalogue";
import {
  completeLearningStep,
  createEmptyCourseProgress,
} from "./course-progress";
import {
  createLocalCourseProgressStorage,
  PRIMARY_ONE_PROGRESS_KEY,
} from "./progress-storage";

describe("Stockage local de la progression", () => {
  beforeEach(() => localStorage.clear());

  it("restaure la dernière étape non terminée après un rechargement", () => {
    const lesson = PRIMARY_ONE_MODULES[0].lessons[0];
    const afterFirstStep = completeLearningStep(
      createEmptyCourseProgress(),
      lesson,
      lesson.steps[0].id,
      "2026-08-11T10:00:00.000Z",
    );
    const firstStorageInstance = createLocalCourseProgressStorage(localStorage);
    firstStorageInstance.save(afterFirstStep);

    const storageAfterReload = createLocalCourseProgressStorage(localStorage);
    const restored = storageAfterReload.load();

    expect(restored.items[lesson.id].currentStepId).toBe(lesson.steps[1].id);
    expect(restored.items[lesson.id].completedStepIds).toEqual([lesson.steps[0].id]);
  });

  it("ignore une sauvegarde illisible et repart avec une progression vide", () => {
    localStorage.setItem(PRIMARY_ONE_PROGRESS_KEY, "{invalide");

    expect(createLocalCourseProgressStorage(localStorage).load().items).toEqual({});
  });
});
