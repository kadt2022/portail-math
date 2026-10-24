import type { Question, Response } from "./exercise-model";
import { isCorrect } from "./exercise-model";

export const RESULTS_KEY = "mbuyamba-math:primary-one:results:v1";
export interface QuestionResult {
  attempts: number;
  correct: boolean;
  response: Response;
  firstTry?: boolean;
}
type Results = Record<string, QuestionResult>;

function validResponse(value: unknown): value is Response {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Response;
  return (r.text === undefined || typeof r.text === "string")
    && (r.numbers === undefined || Array.isArray(r.numbers) && Array.from(r.numbers).every(Number.isInteger))
    && (r.values === undefined || Array.isArray(r.values) && Array.from(r.values).every((v) => typeof v === "string"));
}

export function loadResults(): Results {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, r]) => r && typeof r === "object" && Number.isInteger(r.attempts) && r.attempts >= 0 && typeof r.correct === "boolean" && validResponse(r.response) && (r.firstTry === undefined || typeof r.firstTry === "boolean")));
  } catch { return {}; }
}

export function getResult(question: Question, results = loadResults()): QuestionResult | undefined {
  const result = results[question.id];
  if (!result) return undefined;
  // Recheck the answer against the current content after a curriculum correction.
  return { ...result, correct: result.correct && isCorrect(question, result.response) };
}

export function recordResponse(question: Question, response: Response): QuestionResult {
  const previous = getResult(question);
  const correct = isCorrect(question,response);
  const firstTry = previous ? previous.firstTry ?? (previous.correct && previous.attempts === 1) : correct;
  const result = { attempts: (previous?.attempts ?? 0) + 1, correct, response, firstTry };
  localStorage.setItem(RESULTS_KEY, JSON.stringify({ ...loadResults(), [question.id]: result }));
  return result;
}

export function restartQuestion(question: Question, response: Response) {
  const previous = getResult(question);
  if (!previous) return;
  localStorage.setItem(RESULTS_KEY,JSON.stringify({...loadResults(),[question.id]:{...previous,firstTry:previous.firstTry ?? (previous.correct && previous.attempts===1),correct:false,response}}));
}

export function getAssessmentSummary(questions: readonly Question[]) {
  const saved = loadResults();
  const results = questions.map((q) => getResult(q,saved));
  return {
    total: questions.length,
    correct: results.filter((r) => r?.correct).length,
    firstTry: results.filter((r) => r?.correct && (r.firstTry ?? r.attempts === 1)).length,
    reviewLessonIds: [...new Set(questions.filter((_, i) => !results[i]?.correct || !(results[i]!.firstTry ?? results[i]!.attempts === 1)).map((q) => q.reviewLessonId))],
  };
}
