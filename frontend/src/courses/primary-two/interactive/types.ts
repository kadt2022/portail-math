// Modèle des activités interactives de 2e primaire pilotées par des données.
//
// Chaque activité décrit uniquement les règles mathématiques (quantités,
// réponses acceptées, ordre attendu). Les textes vivent dans l'espace de
// traduction `primaryTwoLessons` sous la clé `text` de l'activité, et les
// représentations visuelles sont décrites par des `Visual` rendus dans
// `visuals.tsx`. Crochet peut donc remplacer les illustrations sans toucher
// aux règles ni aux interactions.

export type ItemName =
  | "seed"
  | "stick"
  | "banana"
  | "orange"
  | "mango"
  | "tomato"
  | "chalk"
  | "cap"
  | "token"
  | "nut"
  | "bottle"
  | "beignet"
  | "plant"
  | "notebook"
  | "bag"
  | "bird"
  | "flower";

export type ShapeName = "triangle" | "square" | "rectangle" | "circle" | "pentagon" | "hexagon" | "oval";
export type SolidName = "cube" | "cuboid" | "sphere" | "cylinder";
export type ProductName = "pencil" | "eraser" | "notebook" | "ball" | "bread" | "soap" | "juice" | "book";

export type Visual =
  | { kind: "collection"; item: ItemName; count: number; container?: "basket" | "plate" | "bag" | "box" | "none" }
  | { kind: "groups"; item: ItemName; groups: readonly number[]; container?: "plate" | "bag" | "box" | "basket" | "none" }
  | { kind: "tens"; tens: number; units: number; item?: "stick" | "bag" }
  | { kind: "array"; rows: number; cols: number; item: ItemName }
  | { kind: "tenFrame"; filled: number; frames?: number }
  | { kind: "money"; values: readonly number[] }
  | { kind: "product"; product: ProductName; price: number }
  | { kind: "clock"; hour: number; minute: number }
  | { kind: "ruler"; start: number; end: number; max?: number; broken?: boolean }
  | { kind: "numberLine"; from: number; to: number; step?: number; marks?: readonly number[]; jumps?: readonly (readonly [number, number])[] }
  | { kind: "shape"; shape: ShapeName }
  | { kind: "solid"; solid: SolidName }
  | { kind: "balance"; heavier: "left" | "right" | "equal"; leftKey: string; rightKey: string }
  | { kind: "container"; liters: number; filled?: number }
  | { kind: "calendar"; firstWeekday: number; days: number; marks?: readonly number[] }
  | { kind: "expression"; value: string }
  | { kind: "fraction"; parts: number; shaded: number; equal: boolean }
  | { kind: "grid"; cols: number; rows: number; cells: readonly (readonly [number, number])[]; axis?: boolean }
  | { kind: "house" }
  | { kind: "products"; items: readonly { product: ProductName; price: number }[] }
  | { kind: "weight"; kg: number }
  | { kind: "composite"; shapes: readonly ShapeName[] };

/** Réponse numérique acceptée : valeur unique, liste de valeurs, ou intervalle (bornes incluses). */
export type Accept =
  | number
  | { oneOf: readonly number[] }
  | { min: number; max: number; not?: readonly number[] };

export interface NumericField {
  /** Clé relative au texte de l'activité pour l'énoncé de la question. */
  key: string;
  accept: Accept;
  /** Unité affichée après le champ (« FC », « cm », « L »…), texte littéral. */
  unit?: string;
  visual?: Visual;
  /**
   * Calcul de contrôle, vérifié par les tests : il doit donner la réponse
   * attendue (seulement pour les réponses à valeur unique).
   */
  check?: string;
}

interface BaseSpec {
  /** Clé de base dans l'espace `primaryTwoLessons` (ex. « u02l01.discover »). */
  text: string;
}

export interface NumericSpec extends BaseSpec {
  type: "numeric";
  visual?: Visual;
  fields: readonly NumericField[];
}

export interface MatchItem {
  id: string;
  visual?: Visual;
  /** Libellé visible (clé relative). Sans libellé, seul le visuel est montré. */
  labelKey?: string;
  bin: string;
}

export interface MatchBin {
  id: string;
  /** Nombre affiché tel quel, ou clé relative de texte. */
  label: number | string;
}

export interface MatchSpec extends BaseSpec {
  type: "match";
  items: readonly MatchItem[];
  bins: readonly MatchBin[];
}

export type BuildPreview =
  | { kind: "tens"; tens: string; units: string; item?: "stick" | "bag" }
  | { kind: "groups"; groups: string; size: string | number; item: ItemName; container?: "plate" | "bag" | "box" | "basket" }
  | { kind: "collection"; count: string; item: ItemName; base?: number }
  | { kind: "tenFrame"; count: string; base?: number }
  | { kind: "containers"; count: string; liters: number; target: number }
  | { kind: "array"; rows: string; cols: string; item: ItemName }
  /** Bonds sur une ligne numérique : départ, puis un bond par contrôle (sens -1 = reculer). */
  | { kind: "jumps"; start: number; from: number; to: number; jumps: readonly string[]; direction: 1 | -1 }
  /** Deux paniers : on déplace `move` objets du panier A vers le panier B. */
  | { kind: "transfer"; a: number; b: number; move: string; item: ItemName };

export interface BuildControl {
  id: string;
  labelKey: string;
  min: number;
  max: number;
  start?: number;
}

export interface BuildSpec extends BaseSpec {
  type: "build";
  visual?: Visual;
  controls: readonly BuildControl[];
  preview?: BuildPreview;
  /** Valeurs exactes attendues pour chaque contrôle. */
  goal: Readonly<Record<string, number>>;
}

export interface OrderSpec extends BaseSpec {
  type: "order";
  values: readonly number[];
  direction: "asc" | "desc";
  /** Gabarit d'affichage commun avec `{{value}}` (ex. « kg » → « 3 kg »). */
  format?: string;
  /**
   * Remettre des étapes dans l'ordre : chaque valeur est le rang d'une
   * étape, affichée avec le texte relatif `steps.<valeur>`.
   */
  sequence?: boolean;
  visual?: Visual;
}

export interface ChoiceSpec extends BaseSpec {
  type: "choice";
  visual?: Visual;
  options: readonly { id: string; visual?: Visual }[];
  correct: readonly string[];
  /** Plusieurs réponses à cocher (toutes les bonnes, aucune mauvaise). */
  multiple?: boolean;
}

export interface SymbolSpec extends BaseSpec {
  type: "symbol";
  pairs: readonly (readonly [number, number])[];
  /** Montre les dizaines et unités sous chaque nombre. */
  showTens?: boolean;
}

export interface DistributeSpec extends BaseSpec {
  type: "distribute";
  total: number;
  recipients: number;
  item: ItemName;
  container: "plate" | "bowl" | "basket" | "child";
  /** Question finale : combien chacun reçoit et combien il reste. */
  askEach?: boolean;
  askRest?: boolean;
}

export interface CollectSupply {
  id: string;
  value: number;
  visual: Visual;
  /** Nombre maximal d'exemplaires (1 pour un article unique). */
  limit?: number;
}

export interface CollectSpec extends BaseSpec {
  type: "collect";
  supply: readonly CollectSupply[];
  unit: string;
  goal: { equals: number } | { atMost: number; atLeast?: number; minItems?: number };
  /** Une solution valable, vérifiée par les tests. */
  solution: Readonly<Record<string, number>>;
  /** Exige deux solutions différentes successives (la seconde est vérifiée par les tests). */
  twoWays?: boolean;
  secondSolution?: Readonly<Record<string, number>>;
}

export interface ClockSpec extends BaseSpec {
  type: "clock";
  hour: number;
  minute: 0 | 30;
  startHour?: number;
}

export interface SymmetrySpec extends BaseSpec {
  type: "symmetry";
  /** Colonnes de chaque côté de l'axe. */
  half: number;
  rows: number;
  /** Cases colorées du côté gauche : [colonne depuis l'axe (1 = contre l'axe), ligne]. */
  left: readonly (readonly [number, number])[];
}

export interface SelfCheckSpec extends BaseSpec {
  type: "selfcheck";
  /** Rappel des réponses ou des compétences de l'évaluation (clés relatives). */
  recap: readonly string[];
}

export type SingleActivitySpec =
  | NumericSpec
  | MatchSpec
  | BuildSpec
  | OrderSpec
  | ChoiceSpec
  | SymbolSpec
  | DistributeSpec
  | CollectSpec
  | ClockSpec
  | SymmetrySpec
  | SelfCheckSpec;

export interface RoundsSpec extends BaseSpec {
  type: "rounds";
  rounds: readonly SingleActivitySpec[];
}

export type ActivitySpec = SingleActivitySpec | RoundsSpec;

export interface LessonContent {
  id: string;
  /** Clé de base des textes de leçon (objectif, situation, fin de leçon). */
  text: string;
  /** Activités dans l'ordre des étapes du catalogue. */
  activities: readonly ActivitySpec[];
}
