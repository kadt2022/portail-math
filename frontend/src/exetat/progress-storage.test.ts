import { beforeEach, describe, expect, it } from "vitest";

import type { QuizResult } from "./api";
import {
  loadProgress,
  OLD_PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  recordQuizResult,
} from "./progress-storage";

const result: QuizResult = {
  quizId: "quiz-1",
  mode: "STANDARD",
  sourceQuizId: null,
  subjectId: "cercle",
  subjectName: "Le cercle",
  status: "COMPLETED",
  score: 4,
  totalQuestions: 5,
  percentage: 80,
  correctAnswers: 4,
  incorrectAnswers: 1,
  failedQuestionIds: ["cercle-001"],
  correctedQuestionIds: [],
  appreciation: "Très bien",
  startedAt: "2026-08-08T10:00:00Z",
  completedAt: "2026-08-08T10:05:00Z",
};

describe("Progression locale React", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("relit sans la réinitialiser la clé historique actuelle", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, subjects: { cercle: { marker: "préservé" } }, recordedQuizIds: [] }),
    );

    const loaded = loadProgress(window.localStorage);

    expect(loaded.subjects.cercle).toEqual({ marker: "préservé" });
  });

  it("conserve la migration de l'ancienne clé Timbiri", () => {
    const oldValue = JSON.stringify({ version: 1, subjects: {}, recordedQuizIds: [] });
    window.localStorage.setItem(OLD_PROGRESS_STORAGE_KEY, oldValue);

    loadProgress(window.localStorage);

    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe(oldValue);
    expect(window.localStorage.getItem(OLD_PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("n'enregistre jamais deux fois le même quiz", () => {
    recordQuizResult(result, window.localStorage);
    recordQuizResult(result, window.localStorage);

    const loaded = loadProgress(window.localStorage);
    expect(loaded.subjects.cercle.attemptCount).toBe(1);
    expect(loaded.recordedQuizIds).toEqual(["quiz-1"]);
  });
});
