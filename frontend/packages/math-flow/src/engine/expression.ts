import type { Operation } from "./operations";
import { createRng, randomInt, type Rng } from "./rng";
import type { NumberTile } from "./types";

/**
 * Construction des opérations dans le second tableau. Les nombres arrivent un par un, dans l'ordre de sortie du tuyau, et
 * s'apparient dans leur ordre d'arrivée : le 1er avec le 2e, le 3e avec le 4e, etc. Le signe puis le « = » apparaissent
 * automatiquement, un par pas de temps. Le RÉSULTAT, lui, n'est jamais posé par le moteur : il apparaît dans le réservoir parmi
 * des leurres, et c'est l'enfant qui le choisit et le place (voir placeResult). Le résultat attendu est calculé par l'opération,
 * jamais lu sur le plateau.
 */
export type ExpressionStage = "first" | "second" | "operator" | "equals" | "result";
// « equals » : « a × b = ? » est affiché, le résultat attend que l'enfant le pose. « result » : posé et verrouillé.

export interface Expression {
  readonly id: number;
  readonly a: NumberTile;
  readonly b: NumberTile | null;
  readonly stage: ExpressionStage;
  /** Opérandes dans l'ordre d'affichage (une fois les deux arrivés). */
  readonly operands: readonly [number, number] | null;
  /** Résultat attendu : connu dès l'étape « = », jamais écrit à la place de l'enfant. */
  readonly expected: number | null;
  /** Résultat posé (et verrouillé) par l'enfant. */
  readonly result: number | null;
}

/** Une tuile de résultat proposée à l'enfant : un bon résultat ou un leurre, sans distinction visible. */
export interface ResultTile {
  readonly id: number;
  readonly value: number;
}

export interface BuilderState {
  readonly operation: Operation;
  /** Graine de la partie : les leurres et la place des tuiles dans le réservoir se rejouent à l'identique. */
  readonly seed: number;
  /** Toutes les opérations, terminées ou non, dans l'ordre : les terminées restent visibles. */
  readonly expressions: readonly Expression[];
  /** Tuiles de résultat à placer (bons résultats et leurres), dans l'ordre d'affichage. */
  readonly reservoir: readonly ResultTile[];
  readonly nextTileId: number;
}

export type ExpressionEvent =
  | { readonly type: "expression-operand"; readonly expression: number; readonly slot: "first" | "second"; readonly id: number; readonly value: number }
  | { readonly type: "expression-operator"; readonly expression: number; readonly symbol: string }
  | { readonly type: "expression-equals"; readonly expression: number }
  /** Les tuiles de résultat de cette opération (le bon résultat et un leurre) rejoignent le réservoir. */
  | { readonly type: "reservoir-add"; readonly expression: number; readonly tiles: readonly ResultTile[] }
  | { readonly type: "result-placed"; readonly expression: number; readonly tile: number; readonly value: number };

export function createBuilder(operation: Operation, seed: number = 1): BuilderState {
  return { operation, seed, expressions: [], reservoir: [], nextTileId: 1 };
}

/** Un nombre sort du tuyau : il devient le premier ou le deuxième opérande. */
export function receiveNumber(state: BuilderState, tile: NumberTile): { state: BuilderState; events: ExpressionEvent[] } {
  const last = state.expressions[state.expressions.length - 1];
  if (last && last.b === null) {
    const operands = state.operation.arrange(last.a.value, tile.value);
    const updated: Expression = { ...last, b: tile, stage: "second", operands };
    return {
      state: { ...state, expressions: [...state.expressions.slice(0, -1), updated] },
      events: [{ type: "expression-operand", expression: last.id, slot: "second", id: tile.id, value: tile.value }],
    };
  }
  const created: Expression = { id: state.expressions.length, a: tile, b: null, stage: "first", operands: null, expected: null, result: null };
  return {
    state: { ...state, expressions: [...state.expressions, created] },
    events: [{ type: "expression-operand", expression: created.id, slot: "first", id: tile.id, value: tile.value }],
  };
}

/**
 * Un leurre : un résultat faux mais plausible, de ceux que fait un enfant qui se trompe (un de trop ou de moins, une opération
 * voisine, un opérande décalé). Jamais le bon résultat, jamais négatif, jamais déjà présent dans le réservoir.
 */
export function decoyFor(operation: Operation, operands: readonly [number, number], expected: number, taken: readonly number[], rng: Rng): number {
  const [a, b] = operands;
  const near = (x: number, y: number): number | null => {
    try {
      return operation.accepts(x, y, false) ? operation.compute(x, y) : null;
    } catch {
      return null;
    }
  };
  const candidates = [expected + 1, expected - 1, expected + 2, expected - 2, expected + a, expected - a, expected + b, expected - b, a + b, Math.abs(a - b), near(a, b + 1), near(a, b - 1), near(a + 1, b), near(a - 1, b)];
  const valid = [...new Set(candidates)].filter((value): value is number => value !== null && Number.isInteger(value) && value >= 0 && value !== expected && !taken.includes(value));
  if (valid.length > 0) return valid[randomInt(rng, 0, valid.length - 1)] as number;
  let fallback = expected + 3;
  while (taken.includes(fallback)) fallback += 1;
  return fallback;
}

/** Une opération arrive à « = » : son résultat attendu est calculé, et ses tuiles (le bon résultat et un leurre) entrent dans le réservoir. */
function reachEquals(state: BuilderState, expression: Expression): { expression: Expression; reservoir: ResultTile[]; nextTileId: number; tiles: ResultTile[] } {
  const operands = expression.operands as readonly [number, number];
  const expected = state.operation.compute(operands[0], operands[1]);
  const rng = createRng(state.seed * 7919 + expression.id + 1);
  const decoy = decoyFor(state.operation, operands, expected, [...state.reservoir.map((tile) => tile.value), expected], rng);
  const tiles: ResultTile[] = [
    { id: state.nextTileId, value: expected },
    { id: state.nextTileId + 1, value: decoy },
  ];
  // Les nouvelles tuiles s'insèrent à une place tirée au hasard, sans déplacer celles qui sont déjà affichées.
  const reservoir = [...state.reservoir];
  for (const tile of tiles) reservoir.splice(randomInt(rng, 0, reservoir.length), 0, tile);
  return { expression: { ...expression, stage: "equals", expected }, reservoir, nextTileId: state.nextTileId + 2, tiles };
}

/** Un pas de temps : chaque opération dont les deux opérandes sont là passe à l'étape suivante (signe, puis « = » et ses tuiles de résultat). */
export function stepBuilder(state: BuilderState): { state: BuilderState; events: ExpressionEvent[] } {
  const events: ExpressionEvent[] = [];
  let next: BuilderState = state;
  const expressions = state.expressions.map((expression): Expression => {
    if (!expression.operands) return expression;
    if (expression.stage === "second") {
      events.push({ type: "expression-operator", expression: expression.id, symbol: state.operation.symbol });
      return { ...expression, stage: "operator" };
    }
    if (expression.stage === "operator") {
      const reached = reachEquals(next, expression);
      next = { ...next, reservoir: reached.reservoir, nextTileId: reached.nextTileId };
      events.push({ type: "expression-equals", expression: expression.id });
      events.push({ type: "reservoir-add", expression: expression.id, tiles: reached.tiles });
      return reached.expression;
    }
    return expression;
  });
  return { state: events.length === 0 ? state : { ...next, expressions }, events };
}

export type PlaceResultOutcome =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      /** « wrong » : ce n'est pas le résultat de cette opération (la tuile revient, sans pénalité). */
      readonly reason: "unknown-tile" | "unknown-expression" | "not-ready" | "wrong";
    };

/**
 * L'enfant place une tuile du réservoir sur une opération. Elle se verrouille si sa valeur est le résultat attendu (deux
 * opérations de même résultat acceptent chacune n'importe quelle tuile de cette valeur) ; sinon rien ne change.
 */
export function placeResultOnExpression(state: BuilderState, tileId: number, expressionId: number): { state: BuilderState; outcome: PlaceResultOutcome; events: ExpressionEvent[] } {
  const refuse = (reason: Extract<PlaceResultOutcome, { accepted: false }>["reason"]) => ({ state, outcome: { accepted: false, reason } as PlaceResultOutcome, events: [] as ExpressionEvent[] });
  const tile = state.reservoir.find((candidate) => candidate.id === tileId);
  if (!tile) return refuse("unknown-tile");
  const expression = state.expressions.find((candidate) => candidate.id === expressionId);
  if (!expression) return refuse("unknown-expression");
  if (expression.stage !== "equals") return refuse("not-ready");
  if (expression.expected !== tile.value) return refuse("wrong");
  return {
    state: {
      ...state,
      expressions: state.expressions.map((candidate) => (candidate.id === expressionId ? { ...candidate, stage: "result" as const, result: tile.value } : candidate)),
      reservoir: state.reservoir.filter((candidate) => candidate.id !== tileId),
    },
    outcome: { accepted: true },
    events: [{ type: "result-placed", expression: expressionId, tile: tileId, value: tile.value }],
  };
}

export const isComplete = (expression: Expression): boolean => expression.stage === "result";

/** Toutes les opérations attendues sont construites ET leur résultat a été posé par l'enfant. */
export function allExpressionsComplete(state: BuilderState, numberCount: number): boolean {
  return numberCount % 2 === 0 && state.expressions.length === numberCount / 2 && state.expressions.every(isComplete);
}
