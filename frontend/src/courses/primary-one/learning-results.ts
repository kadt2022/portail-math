import type { Question, Response } from "./exercise-model";
import { isCorrect } from "./exercise-model";

export interface QuestionResult {
  attempts: number;
  correct: boolean;
  response: Response;
  firstTry?: boolean;
}
type Results = Record<string, QuestionResult>;

// Réponses temporaires de la session : rien n'est écrit dans le navigateur.
const sessionResults: Results = {};

export function resetSessionLearningResults() {
  for (const key of Object.keys(sessionResults)) delete sessionResults[key];
}

export function getResult(question: Question): QuestionResult | undefined {
  const result = sessionResults[question.id];
  return result ? { ...result, correct: result.correct && isCorrect(question, result.response) } : undefined;
}

export function recordResponse(question: Question, response: Response): QuestionResult {
  const previous = getResult(question);
  const correct = isCorrect(question, response);
  const result = {
    attempts: (previous?.attempts ?? 0) + 1,
    correct,
    response,
    firstTry: previous ? previous.firstTry ?? (previous.correct && previous.attempts === 1) : correct,
  };
  sessionResults[question.id] = result;
  return result;
}

export function restartQuestion(question: Question, response: Response) {
  const previous = getResult(question);
  if (previous) sessionResults[question.id] = { ...previous, correct: false, response };
}

export function getAssessmentSummary(questions: readonly Question[]) {
  const results = questions.map((q) => getResult(q));
  return {
    total: questions.length,
    correct: results.filter((r) => r?.correct).length,
    firstTry: results.filter((r) => r?.correct && (r.firstTry ?? r.attempts === 1)).length,
    reviewLessonIds: [...new Set(questions.filter((_, i) => !results[i]?.correct || !(results[i]!.firstTry ?? results[i]!.attempts === 1)).map((q) => q.reviewLessonId))],
  };
}
