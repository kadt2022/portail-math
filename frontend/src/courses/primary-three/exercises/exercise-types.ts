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
  // Illustration facultative affichée sous la question (tableau, horloge...).
  visual?: ExerciseVisual;
  // Unité écrite à côté de la réponse (FC, cm, kg...). Clé i18n.
  unitKey?: string;
}

// Illustrations réutilisables : aucune ne contient de texte en dur, tout ce
// qui se lit passe par des clés i18n (voir ExerciseVisual.tsx).
export type ExerciseVisual =
  | { kind: "table"; headerKeys: readonly [string, string]; rows: readonly (readonly [string, number])[] }
  | { kind: "pictogram"; legendKey: string; unitValue: number; rows: readonly (readonly [string, number])[] }
  | { kind: "fraction-bars"; bars: readonly { parts: number; shaded: number }[] }
  | { kind: "clock"; hours: number; minutes: number }
  | { kind: "rectangle"; width: number; height: number; unitKey: string }
  | { kind: "ruler"; from: number; to: number }
  | { kind: "shape"; shape: ShapeName };

export type ShapeName =
  | "square"
  | "rectangle"
  | "triangle"
  | "right-triangle"
  | "cube"
  | "cylinder"
  | "sphere"
  | "parallel-lines"
  | "crossing-lines"
  | "segment"
  | "line";

// Question à réponse textuelle (opération à choisir, unité, figure...).
// Les libellés des choix sont des clés i18n ; l'ordre est celui de la leçon.
export interface TextChoiceExercise {
  kind: "text-choice";
  id: string;
  promptKey: string;
  promptValues?: Record<string, number | string>;
  choiceKeys: readonly string[];
  answerIndex: number;
  visual?: ExerciseVisual;
}

// Groupes égaux : l'enfant règle le nombre de groupes et le contenu d'un groupe.
export interface EqualGroupsExercise {
  kind: "equal-groups";
  id: string;
  groups: number;
  perGroup: number;
}

// Partage : l'enfant distribue `total` jetons dans `bowls` bols, puis note le reste.
export interface ShareTokensExercise {
  kind: "share-tokens";
  id: string;
  total: number;
  bowls: number;
  manipulative?: "mango-baskets";
}

// Monnaie factice : composer `target` FC avec des cartes, éventuellement avec
// un nombre maximal de cartes.
export interface MoneyBuildExercise {
  kind: "money-build";
  id: string;
  target: number;
  cards: readonly number[];
  maxCards?: number;
}

// Bande de `parts` parts égales dont l'enfant colorie `shaded` parts.
export interface FractionShadeExercise {
  kind: "fraction-shade";
  id: string;
  parts: number;
  shaded: number;
}

export interface ClockSetExercise {
  kind: "clock-set";
  id: string;
  hours: number;
  minutes: number;
}

// Quadrillage : l'enfant guide un pion de `start` à `target` avec des flèches.
export interface GridRouteExercise {
  kind: "grid-route";
  id: string;
  columns: number;
  rows: number;
  start: readonly [number, number];
  target: readonly [number, number];
}

// Remettre dans l'ordre des étapes écrites (clés i18n données dans l'ordre juste).
export interface StepOrderExercise {
  kind: "step-order";
  id: string;
  stepKeys: readonly string[];
}

// Opération posée en colonnes : l'enfant écrit le résultat chiffre par chiffre.
export interface ColumnCalcExercise {
  kind: "column-calc";
  id: string;
  operation: "+" | "-" | "x";
  left: number;
  right: number;
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
  | NumberInRangeExercise
  | TextChoiceExercise
  | EqualGroupsExercise
  | ShareTokensExercise
  | MoneyBuildExercise
  | FractionShadeExercise
  | ClockSetExercise
  | GridRouteExercise
  | StepOrderExercise
  | ColumnCalcExercise;

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
