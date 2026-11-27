import type { Operation } from "./operations";
import type { NumberTile } from "./types";

/**
 * Construction des opérations dans le second tableau. Les nombres arrivent un par un, dans l'ordre de sortie du tuyau, et
 * s'apparient dans leur ordre d'arrivée : le 1er avec le 2e, le 3e avec le 4e, etc. Le signe, le « = » puis le résultat
 * apparaissent automatiquement, un par pas de temps. Le résultat est calculé par l'opération, jamais lu sur le plateau.
 */
export type ExpressionStage = "first" | "second" | "operator" | "equals" | "result";

export interface Expression {
  readonly id: number;
  readonly a: NumberTile;
  readonly b: NumberTile | null;
  readonly stage: ExpressionStage;
  /** Opérandes dans l'ordre d'affichage (une fois les deux arrivés). */
  readonly operands: readonly [number, number] | null;
  readonly result: number | null;
}

export interface BuilderState {
  readonly operation: Operation;
  /** Toutes les opérations, terminées ou non, dans l'ordre : les terminées restent visibles. */
  readonly expressions: readonly Expression[];
}

export type ExpressionEvent =
  | { readonly type: "expression-operand"; readonly expression: number; readonly slot: "first" | "second"; readonly id: number; readonly value: number }
  | { readonly type: "expression-operator"; readonly expression: number; readonly symbol: string }
  | { readonly type: "expression-equals"; readonly expression: number }
  | { readonly type: "expression-result"; readonly expression: number; readonly value: number };

export function createBuilder(operation: Operation): BuilderState {
  return { operation, expressions: [] };
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
  const created: Expression = { id: state.expressions.length, a: tile, b: null, stage: "first", operands: null, result: null };
  return {
    state: { ...state, expressions: [...state.expressions, created] },
    events: [{ type: "expression-operand", expression: created.id, slot: "first", id: tile.id, value: tile.value }],
  };
}

/** Un pas de temps : chaque opération dont les deux opérandes sont là passe à l'étape suivante (signe, « = », résultat). */
export function stepBuilder(state: BuilderState): { state: BuilderState; events: ExpressionEvent[] } {
  const events: ExpressionEvent[] = [];
  const expressions = state.expressions.map((expression): Expression => {
    if (!expression.operands) return expression;
    if (expression.stage === "second") {
      events.push({ type: "expression-operator", expression: expression.id, symbol: state.operation.symbol });
      return { ...expression, stage: "operator" };
    }
    if (expression.stage === "operator") {
      events.push({ type: "expression-equals", expression: expression.id });
      return { ...expression, stage: "equals" };
    }
    if (expression.stage === "equals") {
      const value = state.operation.compute(expression.operands[0], expression.operands[1]);
      events.push({ type: "expression-result", expression: expression.id, value });
      return { ...expression, stage: "result", result: value };
    }
    return expression;
  });
  return { state: events.length === 0 ? state : { ...state, expressions }, events };
}

export const isComplete = (expression: Expression): boolean => expression.stage === "result";

/** Toutes les opérations attendues sont construites et affichées avec leur résultat. */
export function allExpressionsComplete(state: BuilderState, numberCount: number): boolean {
  return numberCount % 2 === 0 && state.expressions.length === numberCount / 2 && state.expressions.every(isComplete);
}
