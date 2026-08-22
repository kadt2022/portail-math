// Modèle de données des exercices interactifs de la 4e primaire. Chaque
// leçon référence des objets de ce type (voir ../content/lesson-content.ts) :
// aucun composant de leçon ne code en dur un nombre ou une consigne, il se
// contente d'interpréter l'un de ces types via <InteractiveExercise>.
//
// La 4e primaire va jusqu'à 100 000 (5 rangs : DM, UM, C, D, U) là où la 3e
// s'arrête à 999 (3 rangs) : `place-value-build` est donc redéfini ici avec
// 5 compteurs plutôt que 3, et `round-to-target` généralise l'arrondi de la
// 3e (toujours à la dizaine) à une unité de rang variable (dizaine, centaine,
// millier, dizaine de mille).

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

export type NumberWordsDirection = "digits-to-words" | "words-to-digits";

export interface NumberWordsMatchExercise {
  kind: "number-words-match";
  id: string;
  items: readonly {
    value: number;
    direction: NumberWordsDirection;
    distractors: readonly [number, number, number];
  }[];
}

export type Comparator = "<" | ">" | "=";

export interface CompareNumbersExercise {
  kind: "compare-numbers";
  id: string;
  items: readonly { left: number; right: number }[];
}

export interface SequenceFillExercise {
  kind: "sequence-fill";
  id: string;
  sequence: readonly number[];
  blankIndex: number;
}

export interface NumberOrderExercise {
  kind: "number-order";
  id: string;
  values: readonly number[];
  direction: "ascending" | "descending";
}

export interface NumericQuestionExercise {
  kind: "numeric-question";
  id: string;
  promptKey: string;
  promptValues?: Record<string, number | string>;
  answer: number;
  choices?: readonly number[];
}

export interface NumberInRangeExercise {
  kind: "number-in-range";
  id: string;
  min: number;
  max: number;
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
