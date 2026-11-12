import type { Exercise } from "../exercises/exercise-types";

export interface ExerciseStepContent {
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  exercise: Exercise;
}

export interface LessonContent {
  objectiveKey: string;
  situationKey: string;
  discoverKey: string;
  manipulate: ExerciseStepContent;
  exampleMethodKey: string;
  examplePromptKeys: readonly string[];
  practice: ExerciseStepContent;
  reflect: ExerciseStepContent;
  play: ExerciseStepContent;
  rememberKey: string;
  check: ExerciseStepContent;
}

export interface EvaluationContent {
  introKey: string;
  items: readonly ExerciseStepContent[];
}

export function step(
  prefix: string,
  instructionKey: string,
  exercise: Exercise,
  titleKey = `content.common.title.${prefix.split(".").at(-1)}`,
): ExerciseStepContent {
  return {
    titleKey,
    instructionKey,
    hintKey: `${prefix}.hint`,
    strongHintKey: `${prefix}.strongHint`,
    exercise,
  };
}
