import { UNIT_01_EVALUATION, UNIT_01_LESSON_CONTENT } from "./unit-01";
import type { EvaluationContent, LessonContent } from "./lesson-content";

// Table de contenu unique du parcours 3e primaire : chaque nouvelle unité
// ajoute son fichier `unit-0X.ts` et l'enregistre ici. La page de leçon ne
// connaît que ces deux tables, jamais une leçon en particulier.
export const PRIMARY_THREE_LESSON_CONTENT: Record<string, LessonContent> = {
  ...UNIT_01_LESSON_CONTENT,
};

export const PRIMARY_THREE_EVALUATION_CONTENT: Record<string, EvaluationContent> = {
  "MATH-3P-U01-EVAL": UNIT_01_EVALUATION,
};
