export interface AnswerChoice {
  id: string;
  label: string;
}

export interface SubjectSummary {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  questionCount: number;
  topicCount: number;
  estimatedMinutes: number;
  difficulties: string[];
  status: string;
}

export interface SubjectDetail extends Omit<SubjectSummary, "topicCount"> {
  topics: string[];
}

export interface QuizQuestion {
  id: string;
  topic: string;
  difficulty: string;
  statement: string;
  choices: AnswerChoice[];
  points: number;
}

export interface Solution {
  summary: string;
  steps: string[];
  formula?: string;
  advice: string;
}

export interface AnswerResult {
  quizId: string;
  questionId: string;
  status: string;
  correct: boolean;
  selectedChoiceId: string;
  correctChoiceId: string;
  correctChoiceLabel: string;
  solution: Solution;
  score: number;
  correctAnswers: number;
  answeredQuestions: number;
  totalQuestions: number;
  hasNextQuestion: boolean;
}

export interface CurrentQuestion {
  quizId: string;
  sourceQuizId: string | null;
  mode: "STANDARD" | "REVIEW";
  questionNumber: number;
  totalQuestions: number;
  question: QuizQuestion;
  score: number;
  answered: boolean;
  answerResult: AnswerResult | null;
}

export interface QuizStarted {
  quizId: string;
  sourceQuizId: string | null;
  subjectId: string;
  subjectName: string;
  mode: "STANDARD" | "REVIEW";
  totalQuestions: number;
  currentQuestionNumber: number;
  status: string;
}

export interface QuizResult {
  quizId: string;
  mode: "STANDARD" | "REVIEW";
  sourceQuizId: string | null;
  subjectId: string;
  subjectName: string;
  status: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  failedQuestionIds: string[];
  correctedQuestionIds: string[];
  appreciation: string;
  startedAt: string;
  completedAt: string;
}

interface ApiErrorPayload {
  message?: string;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new Error(errorPayload?.message ?? "La requête n'a pas pu être traitée.");
  }
  return payload as T;
}
