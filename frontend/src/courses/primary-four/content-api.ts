import { useEffect, useState } from "react";

import type { Exercise } from "./exercises/exercise-types";
import type { EvaluationContent, ExerciseStepContent, LessonContent } from "./lesson-content";

interface CourseExerciseDto {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface CourseActivityDto {
  id: string;
  type: string;
  title: string;
  instructions: string;
  data: Record<string, unknown>;
  exercises: CourseExerciseDto[];
}

interface CourseLessonDto {
  id: string;
  title: string;
  objective: string;
  activities: CourseActivityDto[];
}

export interface PrimaryFourRemoteContent {
  lesson?: LessonContent;
  evaluation?: EvaluationContent;
}

interface RemoteContentState {
  content?: PrimaryFourRemoteContent;
  loading: boolean;
  error: boolean;
}

interface RemoteContentResult {
  lessonId: string;
  content?: PrimaryFourRemoteContent;
  error: boolean;
}

function requiredActivity(lesson: CourseLessonDto, type: string) {
  const activity = lesson.activities.find((candidate) => candidate.type === type);
  if (!activity) {
    throw new Error(`Activité ${type} absente de ${lesson.id}.`);
  }
  return activity;
}

function stringData(activity: CourseActivityDto, key: string) {
  const value = activity.data[key];
  if (typeof value !== "string") {
    throw new Error(`Donnée ${key} invalide dans ${activity.id}.`);
  }
  return value;
}

function toExercise(dto: CourseExerciseDto): Exercise {
  const data = { ...dto.data };
  if (dto.type === "numeric-question") {
    const terms = data.terms;
    if (!Array.isArray(terms) || !terms.every((term) => typeof term === "number")) {
      throw new Error(`Décomposition numérique absente de ${dto.id}.`);
    }
    data.answer = terms.reduce((sum, term) => sum + term, 0);
    delete data.terms;
  }
  return { id: dto.id, kind: dto.type, ...data } as unknown as Exercise;
}

function toExerciseStep(activity: CourseActivityDto): ExerciseStepContent {
  const exercise = activity.exercises[0];
  if (!exercise) {
    throw new Error(`Exercice absent de ${activity.id}.`);
  }
  return {
    titleKey: activity.title,
    instructionKey: activity.instructions,
    hintKey: stringData(activity, "hintKey"),
    strongHintKey: stringData(activity, "strongHintKey"),
    exercise: toExercise(exercise),
  };
}

function toLessonContent(lesson: CourseLessonDto): LessonContent {
  const situation = requiredActivity(lesson, "situation");
  const discover = requiredActivity(lesson, "discover");
  const example = requiredActivity(lesson, "example");
  const remember = requiredActivity(lesson, "remember");
  const figureValue = discover.data.figureValue;
  const promptKeys = example.data.promptKeys;

  if (!Array.isArray(promptKeys) || !promptKeys.every((key) => typeof key === "string")) {
    throw new Error(`Exemples guidés invalides dans ${example.id}.`);
  }

  return {
    objectiveKey: lesson.objective,
    situationKey: stringData(situation, "textKey"),
    discoverKey: stringData(discover, "textKey"),
    ...(typeof figureValue === "number" ? { discoverFigureValue: figureValue } : {}),
    manipulate: toExerciseStep(requiredActivity(lesson, "manipulate")),
    exampleMethodKey: stringData(example, "methodKey"),
    examplePromptKeys: promptKeys,
    practice: toExerciseStep(requiredActivity(lesson, "practice")),
    reflect: toExerciseStep(requiredActivity(lesson, "reflect")),
    play: toExerciseStep(requiredActivity(lesson, "play")),
    rememberKey: stringData(remember, "textKey"),
    check: toExerciseStep(requiredActivity(lesson, "check")),
  };
}

function toEvaluationContent(lesson: CourseLessonDto): EvaluationContent {
  return {
    introKey: lesson.objective,
    items: lesson.activities.filter((activity) => activity.type === "question").map(toExerciseStep),
  };
}

export async function loadPrimaryFourContent(lessonId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/courses/MATH-4P/lessons/${encodeURIComponent(lessonId)}`, { signal });
  if (!response.ok) {
    throw new Error(`Le contenu ${lessonId} est indisponible (${response.status}).`);
  }
  const lesson = (await response.json()) as CourseLessonDto;
  return lessonId.endsWith("-EVAL")
    ? { evaluation: toEvaluationContent(lesson) }
    : { lesson: toLessonContent(lesson) };
}

export function usePrimaryFourContent(lessonId: string | undefined): RemoteContentState {
  const [result, setResult] = useState<RemoteContentResult>();

  useEffect(() => {
    if (!lessonId) {
      return;
    }

    const controller = new AbortController();
    loadPrimaryFourContent(lessonId, controller.signal).then(
      (content) => setResult({ lessonId, content, error: false }),
      (error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResult({ lessonId, error: true });
        }
      },
    );
    return () => controller.abort();
  }, [lessonId]);

  if (!lessonId) {
    return { loading: false, error: true };
  }
  if (result?.lessonId !== lessonId) {
    return { loading: true, error: false };
  }
  return { content: result.content, loading: false, error: result.error };
}
