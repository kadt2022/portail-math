import type { Question } from "./exercise-model";
import content from "./lesson-content-data.json";

export interface LessonContent {
  sourcePage: number;
  manipulate: readonly Question[];
  practice: readonly Question[];
  play: readonly Question[];
  remember: readonly Question[];
}

interface PrimaryOneContentData {
  lessonContent: Record<string, LessonContent>;
  evaluations: Record<string, readonly Question[]>;
}

const data = content as unknown as PrimaryOneContentData;

export const LESSON_CONTENT = data.lessonContent;
export const EVALUATIONS = data.evaluations;
