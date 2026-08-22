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
  // Valeur affichée par la figure tactile chiffre -> valeur du « Je
  // découvre » (voir blocks/PlaceValueRevealBoard). Optionnel : seule la
  // leçon 1 (valeur de position) en a besoin.
  discoverFigureValue?: number;
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
