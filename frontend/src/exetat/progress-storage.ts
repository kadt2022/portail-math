import type { QuizResult } from "./api";

export const PROGRESS_STORAGE_KEY = "portailMath.exetat.progress.v1";
export const OLD_PROGRESS_STORAGE_KEY = "timbiriMaths.exetat.progress.v1";

const VERSION = 1;
const MAX_RECORDED_QUIZZES = 100;

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  attemptCount: number;
  lastScore: number;
  bestScore: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalCorrectedQuestions: number;
  lastFailedQuestionIds: string[];
  lastQuizId: string | null;
  reviewSourceQuizId: string | null;
  lastAttemptAt: string | null;
  lastActivityAt: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "MASTERED" | "TO_REVIEW";
}

export interface ProgressData {
  version: 1;
  subjects: Record<string, SubjectProgress>;
  recordedQuizIds: string[];
}

export interface ProgressSummary {
  startedSubjects: number;
  bestAveragePercentage: number;
  bestResult: number;
  totalCorrectAnswers: number;
  questionsToReview: number;
}

function emptyProgress(): ProgressData {
  return { version: VERSION, subjects: {}, recordedQuizIds: [] };
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadProgress(storage: Storage | null = getBrowserStorage()): ProgressData {
  if (!storage) {
    return emptyProgress();
  }
  try {
    const currentValue = storage.getItem(PROGRESS_STORAGE_KEY);
    const oldValue = storage.getItem(OLD_PROGRESS_STORAGE_KEY);
    if (!currentValue && oldValue) {
      storage.setItem(PROGRESS_STORAGE_KEY, oldValue);
      storage.removeItem(OLD_PROGRESS_STORAGE_KEY);
    }

    const raw = currentValue ?? oldValue;
    if (!raw) {
      return emptyProgress();
    }
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    if (parsed.version !== VERSION || !parsed.subjects || Array.isArray(parsed.subjects)) {
      return emptyProgress();
    }
    return {
      version: VERSION,
      subjects: parsed.subjects,
      recordedQuizIds: Array.isArray(parsed.recordedQuizIds) ? parsed.recordedQuizIds : [],
    };
  } catch {
    return emptyProgress();
  }
}

function calculateStatus(subject: SubjectProgress): SubjectProgress["status"] {
  if (subject.attemptCount === 0) {
    return "NOT_STARTED";
  }
  if (subject.bestScore >= 5) {
    return "MASTERED";
  }
  if (subject.bestScore >= 4 && subject.lastFailedQuestionIds.length === 0) {
    return "MASTERED";
  }
  if (subject.bestScore >= 4) {
    return "IN_PROGRESS";
  }
  return "TO_REVIEW";
}

function newSubject(result: QuizResult): SubjectProgress {
  return {
    subjectId: result.subjectId,
    subjectName: result.subjectName,
    attemptCount: 0,
    lastScore: 0,
    bestScore: 0,
    totalCorrectAnswers: 0,
    totalIncorrectAnswers: 0,
    totalCorrectedQuestions: 0,
    lastFailedQuestionIds: [],
    lastQuizId: null,
    reviewSourceQuizId: null,
    lastAttemptAt: null,
    lastActivityAt: null,
    status: "NOT_STARTED",
  };
}

export function recordQuizResult(
  result: QuizResult,
  storage: Storage | null = getBrowserStorage(),
): SubjectProgress | null {
  if (!storage) {
    return null;
  }
  const progress = loadProgress(storage);
  if (progress.recordedQuizIds.includes(result.quizId)) {
    return progress.subjects[result.subjectId] ?? null;
  }

  const current: SubjectProgress = {
    ...newSubject(result),
    ...progress.subjects[result.subjectId],
  };
  const failedQuestionIds = [...new Set(result.failedQuestionIds ?? [])];
  let updated: SubjectProgress;

  if (result.mode === "REVIEW") {
    updated = {
      ...current,
      subjectName: result.subjectName,
      totalCorrectedQuestions:
        current.totalCorrectedQuestions + (result.correctedQuestionIds?.length ?? 0),
      lastFailedQuestionIds: failedQuestionIds,
      reviewSourceQuizId: failedQuestionIds.length ? result.quizId : null,
      lastActivityAt: result.completedAt,
    };
  } else {
    updated = {
      ...current,
      subjectName: result.subjectName,
      attemptCount: current.attemptCount + 1,
      lastScore: result.score,
      bestScore: Math.max(current.bestScore, result.score),
      totalCorrectAnswers: current.totalCorrectAnswers + result.correctAnswers,
      totalIncorrectAnswers: current.totalIncorrectAnswers + result.incorrectAnswers,
      lastFailedQuestionIds: failedQuestionIds,
      lastQuizId: result.quizId,
      reviewSourceQuizId: failedQuestionIds.length ? result.quizId : null,
      lastAttemptAt: result.completedAt,
      lastActivityAt: result.completedAt,
    };
  }
  updated.status = calculateStatus(updated);
  progress.subjects[result.subjectId] = updated;
  progress.recordedQuizIds = [
    ...progress.recordedQuizIds.filter((quizId) => quizId !== result.quizId),
    result.quizId,
  ].slice(-MAX_RECORDED_QUIZZES);
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  return updated;
}

export function summarizeProgress(progress: ProgressData): ProgressSummary {
  const entries = Object.values(progress.subjects).filter((subject) => subject.attemptCount > 0);
  const totalBestPoints = entries.reduce((total, subject) => total + subject.bestScore, 0);
  return {
    startedSubjects: entries.length,
    bestAveragePercentage: entries.length
      ? Math.round((totalBestPoints / (entries.length * 5)) * 100)
      : 0,
    bestResult: entries.length ? Math.max(...entries.map((subject) => subject.bestScore)) : 0,
    totalCorrectAnswers: entries.reduce(
      (total, subject) => total + subject.totalCorrectAnswers,
      0,
    ),
    questionsToReview: entries.reduce(
      (total, subject) => total + subject.lastFailedQuestionIds.length,
      0,
    ),
  };
}
