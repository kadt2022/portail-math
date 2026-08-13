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

const EXETAT_API_PREFIX = "/api/v1/exetat/";

function errorMessage(payload: unknown): string {
  const errorPayload = payload as ApiErrorPayload | null;
  return errorPayload?.message ?? "La requête n'a pas pu être traitée.";
}

export function resolveExetatApiUrl(
  path: string,
  configuredBaseUrl = import.meta.env.VITE_EXETAT_API_BASE_URL,
): string {
  if (!path.startsWith(EXETAT_API_PREFIX)) {
    throw new Error("Seules les API EXETAT sont autorisées depuis l'application Android.");
  }
  if (!configuredBaseUrl) {
    throw new Error("Le serveur EXETAT n'est pas configuré pour l'application Android.");
  }

  const baseUrl = new URL(configuredBaseUrl);
  if (baseUrl.protocol !== "https:") {
    throw new Error("Le serveur EXETAT Android doit utiliser HTTPS.");
  }
  if (
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error("Le serveur EXETAT doit être configuré par son origine HTTPS uniquement.");
  }

  return new URL(path, baseUrl).toString();
}

function requestHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const normalized = new Headers(headers);
  if (!normalized.has("Content-Type")) {
    normalized.set("Content-Type", "application/json");
  }
  return Object.fromEntries(normalized.entries());
}

function requestData(body: BodyInit | null | undefined): unknown {
  if (body == null) {
    return undefined;
  }
  if (typeof body !== "string") {
    throw new Error("L'application Android envoie uniquement des données EXETAT JSON.");
  }
  return JSON.parse(body) as unknown;
}

async function nativeApiRequest<T>(path: string, options: RequestInit): Promise<T> {
  const response = await CapacitorHttp.request({
    url: resolveExetatApiUrl(path),
    method: options.method ?? "GET",
    headers: requestHeaders(options.headers),
    data: requestData(options.body),
    responseType: "json",
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(errorMessage(response.data));
  }
  return response.data as T;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    return nativeApiRequest<T>(path, options);
  }

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
    throw new Error(errorMessage(payload));
  }
  return payload as T;
}
import { Capacitor, CapacitorHttp } from "@capacitor/core";
