// Modèle de données des exercices interactifs de la 3e primaire. Chaque
// leçon référence des objets de ce type (voir ../content/lesson-content.ts) :
// aucun composant de leçon ne code en dur un nombre ou une consigne, il se
// contente d'interpréter l'un de ces types via <InteractiveExercise>.

export interface PlaceValueBuildExercise {
  kind: "place-value-build";
  id: string;
  targets: readonly number[];
  maxHundreds: number;
  maxTens: number;
  maxUnits: number;
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

export interface RoundToTenExercise {
  kind: "round-to-ten";
  id: string;
  items: readonly { value: number; distractor: number }[];
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
  | RoundToTenExercise
  | NumericQuestionExercise
  | NumberInRangeExercise;
