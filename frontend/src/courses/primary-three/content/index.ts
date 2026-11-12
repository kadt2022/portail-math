import { UNIT_01_EVALUATION, UNIT_01_LESSON_CONTENT } from "./unit-01";
import { UNIT_02_EVALUATION, UNIT_02_LESSON_CONTENT } from "./unit-02";
import { UNIT_03_EVALUATION, UNIT_03_LESSON_CONTENT } from "./unit-03";
import { UNIT_04_EVALUATION, UNIT_04_LESSON_CONTENT } from "./unit-04";
import { UNIT_05_EVALUATION, UNIT_05_LESSON_CONTENT } from "./unit-05";
import { UNIT_06_EVALUATION, UNIT_06_LESSON_CONTENT } from "./unit-06";
import { UNIT_07_EVALUATION, UNIT_07_LESSON_CONTENT } from "./unit-07";
import { UNIT_08_EVALUATION, UNIT_08_LESSON_CONTENT } from "./unit-08";
import { UNIT_09_EVALUATION, UNIT_09_LESSON_CONTENT } from "./unit-09";
import { UNIT_10_EVALUATION, UNIT_10_LESSON_CONTENT } from "./unit-10";
import type { EvaluationContent, LessonContent } from "./lesson-content";

// Table de contenu unique du parcours 3e primaire : chaque nouvelle unité
// ajoute son fichier `unit-0X.ts` et l'enregistre ici. La page de leçon ne
// connaît que ces deux tables, jamais une leçon en particulier.
export const PRIMARY_THREE_LESSON_CONTENT: Record<string, LessonContent> = {
  ...UNIT_01_LESSON_CONTENT,
  ...UNIT_02_LESSON_CONTENT,
  ...UNIT_03_LESSON_CONTENT,
  ...UNIT_04_LESSON_CONTENT,
  ...UNIT_05_LESSON_CONTENT,
  ...UNIT_06_LESSON_CONTENT,
  ...UNIT_07_LESSON_CONTENT,
  ...UNIT_08_LESSON_CONTENT,
  ...UNIT_09_LESSON_CONTENT,
  ...UNIT_10_LESSON_CONTENT,
};

export const PRIMARY_THREE_EVALUATION_CONTENT: Record<string, EvaluationContent> = {
  "MATH-3P-U01-EVAL": UNIT_01_EVALUATION,
  "MATH-3P-U02-EVAL": UNIT_02_EVALUATION,
  "MATH-3P-U03-EVAL": UNIT_03_EVALUATION,
  "MATH-3P-U04-EVAL": UNIT_04_EVALUATION,
  "MATH-3P-U05-EVAL": UNIT_05_EVALUATION,
  "MATH-3P-U06-EVAL": UNIT_06_EVALUATION,
  "MATH-3P-U07-EVAL": UNIT_07_EVALUATION,
  "MATH-3P-U08-EVAL": UNIT_08_EVALUATION,
  "MATH-3P-U09-EVAL": UNIT_09_EVALUATION,
  "MATH-3P-U10-EVAL": UNIT_10_EVALUATION,
};
