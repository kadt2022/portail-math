// Moteur pur de la Grille magique : aucune dépendance à React, aucun accès au
// DOM. La validation d'une solution ne compare jamais la position des tuiles
// à une disposition secrète mémorisée (voir docs/art-direction/grille-magique) :
// elle réévalue les opérations avec les valeurs réellement posées, ce qui
// permet d'accepter toute disposition mathématiquement correcte.

export type Difficulty = "facile" | "moyen";
export type Operator = "+" | "-";
export type Cell = number | null;

export const GRID_SIZE = 9;
export const CENTER_INDEX = 4;

export const NEIGHBORS: Record<number, number[]> = {
  0: [1, 3],
  1: [0, 2, 4],
  2: [1, 5],
  3: [0, 4, 6],
  4: [1, 3, 5, 7],
  5: [2, 4, 8],
  6: [3, 7],
  7: [4, 6, 8],
  8: [5, 7],
};

/** Opérateur entre les cellules (0,1) puis (1,2) d'une ligne ou d'une colonne. */
export type OperatorPair = [Operator, Operator];

export interface DifficultyConfig {
  scrambleMoves: number;
  basePoints: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  facile: { scrambleMoves: 14, basePoints: 100 },
  moyen: { scrambleMoves: 28, basePoints: 200 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["facile", "moyen"];

export interface GridSpec {
  difficulty: Difficulty;
  /** Disposition canonique (celle qui a servi à la génération) : 9 valeurs, dont la case centrale porte la valeur de la carte magique. */
  canonicalTiles: number[];
  magicValue: number;
  rowOperators: OperatorPair[];
  colOperators: OperatorPair[];
  rowResults: number[];
  colResults: number[];
}

export interface GameState {
  tiles: Cell[];
  cardRevealed: boolean;
  moves: number;
  status: "playing" | "won";
}

export interface ValidationResult {
  valid: boolean;
  rowValid: boolean[];
  colValid: boolean[];
}

function rowIndices(row: number): [number, number, number] {
  return [row * 3, row * 3 + 1, row * 3 + 2];
}

function colIndices(col: number): [number, number, number] {
  return [col, col + 3, col + 6];
}

interface SequenceEvaluation {
  steps: number[];
  result: number;
}

function evaluateSequence(a: number, op1: Operator, b: number, op2: Operator, c: number): SequenceEvaluation {
  const step1 = op1 === "+" ? a + b : a - b;
  const result = op2 === "+" ? step1 + c : step1 - c;
  return { steps: [a, step1, result], result };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickOperators(difficulty: Difficulty, count: number, rng: () => number): OperatorPair[] {
  if (difficulty === "facile") {
    return Array.from({ length: count }, () => ["+", "+"] as OperatorPair);
  }
  return Array.from({ length: count }, () => [
    rng() < 0.5 ? "+" : "-",
    rng() < 0.5 ? "+" : "-",
  ] as OperatorPair);
}

function hasAdditionAndSubtraction(rowOperators: OperatorPair[], colOperators: OperatorPair[]): boolean {
  const all = [...rowOperators, ...colOperators].flat();
  return all.includes("+") && all.includes("-");
}

const RING_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MAX_GENERATION_ATTEMPTS = 500;

/**
 * Génère une grille valide pour la difficulté demandée : Facile n'utilise que
 * l'addition ; Moyen mélange addition et soustraction (au moins une de
 * chaque) sans jamais produire de résultat négatif, y compris pour l'étape
 * intermédiaire du calcul de la disposition canonique.
 */
export function generateGridSpec(difficulty: Difficulty, rng: () => number = Math.random): GridSpec {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const canonicalTiles = shuffle(RING_POOL, rng);
    const rowOperators = pickOperators(difficulty, 3, rng);
    const colOperators = pickOperators(difficulty, 3, rng);

    if (difficulty === "moyen" && !hasAdditionAndSubtraction(rowOperators, colOperators)) {
      continue;
    }

    const rowEvaluations = [0, 1, 2].map((row) => {
      const [a, b, c] = rowIndices(row);
      return evaluateSequence(
        canonicalTiles[a],
        rowOperators[row][0],
        canonicalTiles[b],
        rowOperators[row][1],
        canonicalTiles[c],
      );
    });
    const colEvaluations = [0, 1, 2].map((col) => {
      const [a, b, c] = colIndices(col);
      return evaluateSequence(
        canonicalTiles[a],
        colOperators[col][0],
        canonicalTiles[b],
        colOperators[col][1],
        canonicalTiles[c],
      );
    });

    const allNonNegative = [...rowEvaluations, ...colEvaluations].every((evaluation) =>
      evaluation.steps.every((step) => step >= 0),
    );
    if (!allNonNegative) {
      continue;
    }

    return {
      difficulty,
      canonicalTiles,
      magicValue: canonicalTiles[CENTER_INDEX],
      rowOperators,
      colOperators,
      rowResults: rowEvaluations.map((evaluation) => evaluation.result),
      colResults: colEvaluations.map((evaluation) => evaluation.result),
    };
  }
  throw new Error("Impossible de générer une grille valide pour cette difficulté.");
}

/** Mélange par déplacements légaux successifs depuis la disposition résolue : garantit la résolvabilité par construction. */
export function scrambleRing(canonicalTiles: number[], moves: number, rng: () => number = Math.random): Cell[] {
  const tiles: Cell[] = canonicalTiles.map((value, index) => (index === CENTER_INDEX ? null : value));
  let blank = CENTER_INDEX;
  let lastFrom = -1;
  for (let i = 0; i < moves; i++) {
    const options = NEIGHBORS[blank].filter((candidate) => candidate !== lastFrom);
    const pick = options[Math.floor(rng() * options.length)];
    tiles[blank] = tiles[pick];
    tiles[pick] = null;
    lastFrom = blank;
    blank = pick;
  }
  return tiles;
}

export function createInitialState(gridSpec: GridSpec, rng: () => number = Math.random): GameState {
  const { scrambleMoves } = DIFFICULTY_CONFIG[gridSpec.difficulty];
  return {
    tiles: scrambleRing(gridSpec.canonicalTiles, scrambleMoves, rng),
    cardRevealed: false,
    moves: 0,
    status: "playing",
  };
}

export function canMoveTile(state: GameState, index: number): boolean {
  if (state.status !== "playing") {
    return false;
  }
  const blank = state.tiles.indexOf(null);
  return blank !== -1 && NEIGHBORS[blank].includes(index);
}

export function applyMove(state: GameState, index: number): GameState {
  if (!canMoveTile(state, index)) {
    return state;
  }
  const blank = state.tiles.indexOf(null);
  const tiles = [...state.tiles];
  tiles[blank] = tiles[index];
  tiles[index] = null;
  return { ...state, tiles, moves: state.moves + 1 };
}

export function revealCard(state: GameState): GameState {
  if (state.cardRevealed) {
    return state;
  }
  return { ...state, cardRevealed: true };
}

/** La pose ne dépend que de la position de la case vide, jamais d'une comparaison à la disposition secrète. */
export function canPlaceCard(state: GameState): boolean {
  return state.status === "playing" && state.tiles[CENTER_INDEX] === null;
}

export function placeCardAndValidate(
  state: GameState,
  gridSpec: GridSpec,
): { state: GameState; result: ValidationResult } {
  if (!canPlaceCard(state)) {
    throw new Error("La carte ne peut être posée que lorsque la case vide est au centre.");
  }

  const filledTiles = [...state.tiles];
  filledTiles[CENTER_INDEX] = gridSpec.magicValue;

  const rowValid = [0, 1, 2].map((row) => {
    const [a, b, c] = rowIndices(row);
    const evaluation = evaluateSequence(
      filledTiles[a] as number,
      gridSpec.rowOperators[row][0],
      filledTiles[b] as number,
      gridSpec.rowOperators[row][1],
      filledTiles[c] as number,
    );
    return evaluation.result === gridSpec.rowResults[row];
  });
  const colValid = [0, 1, 2].map((col) => {
    const [a, b, c] = colIndices(col);
    const evaluation = evaluateSequence(
      filledTiles[a] as number,
      gridSpec.colOperators[col][0],
      filledTiles[b] as number,
      gridSpec.colOperators[col][1],
      filledTiles[c] as number,
    );
    return evaluation.result === gridSpec.colResults[col];
  });

  const valid = rowValid.every(Boolean) && colValid.every(Boolean);
  const result: ValidationResult = { valid, rowValid, colValid };

  if (!valid) {
    return { state: { ...state, cardRevealed: true }, result };
  }
  return { state: { ...state, tiles: filledTiles, cardRevealed: true, status: "won" }, result };
}

export function computeScore(difficulty: Difficulty, elapsedSeconds: number, moves: number): number {
  const { basePoints } = DIFFICULTY_CONFIG[difficulty];
  const timeBonus = Math.max(0, 90 - elapsedSeconds);
  const movesBonus = Math.max(0, 40 - moves) * 2;
  return basePoints + timeBonus + movesBonus;
}
