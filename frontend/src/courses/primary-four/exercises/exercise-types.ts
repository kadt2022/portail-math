import type {
  Comparator,
  CompareNumbersExercise,
  NumberInRangeExercise,
  NumberOrderExercise,
  NumberWordsDirection,
  NumberWordsMatchExercise,
  NumericQuestionExercise,
  SequenceFillExercise,
} from "../../components/exercise-kit/shared-exercise-types";

export type {
  Comparator,
  CompareNumbersExercise,
  NumberInRangeExercise,
  NumberOrderExercise,
  NumberWordsDirection,
  NumberWordsMatchExercise,
  NumericQuestionExercise,
  SequenceFillExercise,
};

// Modèle de données des exercices interactifs de la 4e primaire. Les formes
// communes (comparer, ranger, mots ↔ chiffres, suite, question numérique,
// encadrement) viennent du kit d'exercices partagé (voir
// `../../components/exercise-kit/`) : seules les formes propres à cette
// unité (valeur de position à 5 rangs, arrondi à rang variable) sont
// définies ici.

export interface PlaceValueBuildExercise {
  kind: "place-value-build";
  id: string;
  targets: readonly number[];
  maxDigit: number;
}

export interface RoundToTargetExercise {
  kind: "round-to-target";
  id: string;
  items: readonly { value: number; roundTo: number; distractor: number }[];
}

export type Exercise =
  | PlaceValueBuildExercise
  | NumberWordsMatchExercise
  | CompareNumbersExercise
  | SequenceFillExercise
  | NumberOrderExercise
  | RoundToTargetExercise
  | NumericQuestionExercise
  | NumberInRangeExercise;

// Props communes à tous les widgets d'exercice (voir ActivityShell) : chacun
// n'ajoute que la forme précise de son propre `exercise`.
export interface ExerciseWidgetProps<TExercise extends Exercise> {
  exercise: TExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}
