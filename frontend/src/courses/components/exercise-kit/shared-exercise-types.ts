// Formes d'exercice communes à tout cours utilisant le moteur de leçon
// générique : identiques quel que soit le nombre de chiffres manipulés
// (comparer, ranger, compléter une suite, question numérique, encadrer,
// associer mots ↔ chiffres). Un cours ne redéfinit ces types que si sa
// mécanique diffère réellement (voir par ex. `PlaceValueBuildExercise`,
// propre à chaque cours car le nombre de rangs varie).

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

// Props communes à tous les widgets d'exercice (voir ActivityShell). Chaque
// cours ajoute `namespace` (son espace i18n) et `formatNumber` (son
// formatage des nombres) lorsqu'il compose un widget partagé — voir
// `primary-four/exercises/InteractiveExercise.tsx` pour un exemple.
export interface SharedExerciseWidgetProps<TExercise> {
  exercise: TExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
  namespace: string;
  formatNumber: (value: number) => string;
}
