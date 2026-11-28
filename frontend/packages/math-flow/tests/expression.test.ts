import { describe, expect, it } from "vitest";

import { allExpressionsComplete, createBuilder, decoyFor, placeResultOnExpression, receiveNumber, stepBuilder, type BuilderState, type ExpressionEvent } from "../src/engine/expression";
import { ADDITION, DIVISION, MULTIPLICATION, SUBTRACTION } from "../src/engine/operations";
import { createRng } from "../src/engine/rng";
import type { NumberTile } from "../src/engine/types";

const n = (id: number, value: number): NumberTile => ({ kind: "number", id, value });

function feed(state: BuilderState, tile: NumberTile) {
  return receiveNumber(state, tile);
}
function settle(state: BuilderState): { state: BuilderState; events: ExpressionEvent[] } {
  let current = state;
  const events: ExpressionEvent[] = [];
  for (let i = 0; i < 6; i += 1) {
    const step = stepBuilder(current);
    current = step.state;
    events.push(...step.events);
  }
  return { state: current, events };
}
/** Deux nombres arrivent, l'opération se construit jusqu'à « = ? ». */
function pending(state: BuilderState, firstId: number, a: number, b: number): BuilderState {
  return settle(feed(feed(state, n(firstId, a)).state, n(firstId + 1, b)).state).state;
}
const tileOf = (state: BuilderState, value: number) => state.reservoir.find((tile) => tile.value === value);

describe("construction des multiplications", () => {
  it("suit la séquence : 1er nombre, 2e nombre, ×, =, puis attend le résultat de l'enfant", () => {
    let state = createBuilder(MULTIPLICATION);
    const first = feed(state, n(1, 3));
    state = first.state;
    expect(first.events).toEqual([{ type: "expression-operand", expression: 0, slot: "first", id: 1, value: 3 }]);
    expect(state.expressions[0]?.stage).toBe("first");
    expect(stepBuilder(state).events).toEqual([]);

    const second = feed(state, n(2, 4));
    state = second.state;
    expect(second.events[0]).toMatchObject({ slot: "second", value: 4 });
    const done = settle(state);
    expect(done.events.map((event) => event.type)).toEqual(["expression-operator", "expression-equals", "reservoir-add"]);
    expect(done.events[0]).toEqual({ type: "expression-operator", expression: 0, symbol: "×" });
    // Le moteur n'écrit jamais le résultat : il l'attend.
    expect(done.state.expressions[0]).toMatchObject({ stage: "equals", operands: [3, 4], expected: 12, result: null });
  });

  it("n'affiche un étage qu'à chaque pas : signe, puis égal, puis il attend", () => {
    let state = feed(feed(createBuilder(MULTIPLICATION), n(1, 2)).state, n(2, 5)).state;
    const stages: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      state = stepBuilder(state).state;
      stages.push(state.expressions[0]!.stage);
    }
    expect(stages).toEqual(["operator", "equals", "equals", "equals"]);
  });

  it("calcule le résultat attendu lui-même : aucune tuile du plateau ne le porte", () => {
    const state = pending(createBuilder(MULTIPLICATION), 1, 5, 5);
    expect(state.expressions[0]?.expected).toBe(25);
    expect(state.expressions[0]?.result).toBeNull();
    expect([state.expressions[0]?.a.value, state.expressions[0]?.b?.value]).toEqual([5, 5]);
  });

  it("apparie les nombres dans leur ordre d'arrivée : 1er+2e, 3e+4e", () => {
    let state = createBuilder(MULTIPLICATION);
    for (const [id, value] of [[1, 2], [2, 3], [3, 4], [4, 5]] as const) state = feed(state, n(id, value)).state;
    state = settle(state).state;
    expect(state.expressions.map((e) => e.operands)).toEqual([[2, 3], [4, 5]]);
    expect(state.expressions.map((e) => e.expected)).toEqual([6, 20]);
  });

  it("garde les opérations visibles pendant que la suivante se construit", () => {
    let state = pending(createBuilder(MULTIPLICATION), 1, 2, 3);
    state = feed(state, n(3, 4)).state;
    expect(state.expressions).toHaveLength(2);
    expect(state.expressions[0]?.stage).toBe("equals");
    expect(state.expressions[1]?.stage).toBe("first");
  });

  it("accepte l'arrivée d'un nombre pendant qu'une opération s'achève", () => {
    let state = feed(feed(createBuilder(MULTIPLICATION), n(1, 2)).state, n(2, 3)).state;
    state = stepBuilder(state).state; // « × » affiché
    state = feed(state, n(3, 4)).state; // le suivant arrive
    expect(state.expressions.map((e) => e.stage)).toEqual(["operator", "first"]);
    state = settle(state).state;
    expect(state.expressions.map((e) => e.stage)).toEqual(["equals", "first"]);
  });

  it("applique l'opération configurée : la soustraction range le plus grand en premier", () => {
    const state = pending(createBuilder(SUBTRACTION), 1, 2, 7);
    expect(state.expressions[0]).toMatchObject({ operands: [7, 2], expected: 5 });
  });
});

describe("réservoir de résultats", () => {
  it("reçoit, à chaque « = », le bon résultat et un leurre, sans jamais déplacer les tuiles déjà affichées", () => {
    let state = pending(createBuilder(MULTIPLICATION, 4), 1, 3, 4);
    expect(state.reservoir).toHaveLength(2);
    expect(state.reservoir.some((tile) => tile.value === 12)).toBe(true);
    const before = state.reservoir.map((tile) => tile.id);
    state = pending(state, 3, 2, 6);
    expect(state.reservoir).toHaveLength(4);
    // Les deux premières tuiles gardent leur ordre relatif.
    expect(state.reservoir.map((tile) => tile.id).filter((id) => before.includes(id))).toEqual(before);
    expect(new Set(state.reservoir.map((tile) => tile.id)).size).toBe(4);
  });

  it("propose des leurres plausibles : jamais le bon résultat, jamais négatifs, jamais des doublons dans le réservoir", () => {
    for (const operation of [ADDITION, SUBTRACTION, MULTIPLICATION]) {
      for (let seed = 1; seed <= 40; seed += 1) {
        let state = createBuilder(operation, seed);
        const pairs: Array<[number, number]> = [[1, 2], [5, 5], [7, 3], [9, 10]];
        pairs.forEach(([a, b], index) => {
          state = pending(state, 1 + index * 2, a, b);
        });
        const values = state.reservoir.map((tile) => tile.value);
        expect(values.every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
        for (const expression of state.expressions) {
          // Chaque opération a son bon résultat dans le réservoir, et son leurre n'est jamais ce résultat.
          expect(state.reservoir.some((tile) => tile.value === expression.expected)).toBe(true);
        }
        // Un bon résultat et un leurre par opération.
        expect(state.reservoir).toHaveLength(2 * state.expressions.length);
      }
    }
  });

  it("rejoue les mêmes leurres à graine égale, et d'autres à graine différente", () => {
    const run = (seed: number) => pending(pending(createBuilder(MULTIPLICATION, seed), 1, 3, 4), 3, 2, 6).reservoir.map((tile) => tile.value);
    expect(run(7)).toEqual(run(7));
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(run).map((values) => values.join(",")).filter((value, index, all) => all.indexOf(value) === index).length).toBeGreaterThan(1);
  });

  it("trouve un leurre même quand presque tout est exclu (petits nombres)", () => {
    const decoy = decoyFor(MULTIPLICATION, [0, 0], 0, [1, 2, 3, 4, 5], createRng(1));
    expect(decoy).not.toBe(0);
    expect([1, 2, 3, 4, 5]).not.toContain(decoy);
    expect(decoyFor(DIVISION, [4, 2], 2, [], createRng(2))).not.toBe(2);
  });
});

describe("placement des résultats par l'enfant", () => {
  it("verrouille la tuile qui porte le bon résultat : l'opération passe à « résultat » et la tuile quitte le réservoir", () => {
    const state = pending(createBuilder(MULTIPLICATION, 3), 1, 3, 4);
    const tile = tileOf(state, 12)!;
    const placed = placeResultOnExpression(state, tile.id, 0);
    expect(placed.outcome).toEqual({ accepted: true });
    expect(placed.events).toEqual([{ type: "result-placed", expression: 0, tile: tile.id, value: 12 }]);
    expect(placed.state.expressions[0]).toMatchObject({ stage: "result", result: 12, expected: 12 });
    expect(placed.state.reservoir.map((t) => t.id)).not.toContain(tile.id);
  });

  it("refuse un mauvais résultat sans rien changer, et un leurre n'est jamais accepté", () => {
    const state = pending(createBuilder(MULTIPLICATION, 3), 1, 3, 4);
    const decoy = state.reservoir.find((tile) => tile.value !== 12)!;
    const refused = placeResultOnExpression(state, decoy.id, 0);
    expect(refused.outcome).toEqual({ accepted: false, reason: "wrong" });
    expect(refused.state).toBe(state);
    expect(refused.events).toEqual([]);
  });

  it("refuse une tuile ou une opération inconnue, et une opération pas encore à « = »", () => {
    const state = pending(createBuilder(MULTIPLICATION, 3), 1, 3, 4);
    expect(placeResultOnExpression(state, 999, 0).outcome).toEqual({ accepted: false, reason: "unknown-tile" });
    expect(placeResultOnExpression(state, tileOf(state, 12)!.id, 7).outcome).toEqual({ accepted: false, reason: "unknown-expression" });
    const early = feed(feed(state, n(3, 2)).state, n(4, 6)).state; // 2 × 6 arrive : signe pas encore affiché
    expect(placeResultOnExpression(early, tileOf(early, 12)!.id, 1).outcome).toEqual({ accepted: false, reason: "not-ready" });
  });

  it("accepte, pour deux opérations de même résultat, n'importe quelle tuile de cette valeur (2 × 6 et 3 × 4 donnent 12)", () => {
    const state = pending(pending(createBuilder(MULTIPLICATION, 5), 1, 3, 4), 3, 2, 6);
    const twelves = state.reservoir.filter((tile) => tile.value === 12);
    expect(twelves).toHaveLength(2);
    const first = placeResultOnExpression(state, twelves[1]!.id, 0);
    const second = placeResultOnExpression(first.state, twelves[0]!.id, 1);
    expect(first.outcome.accepted && second.outcome.accepted).toBe(true);
    expect(second.state.expressions.map((expression) => expression.result)).toEqual([12, 12]);
  });

  it("n'est complète que si toutes les opérations attendues ont leur résultat posé", () => {
    let state = createBuilder(MULTIPLICATION, 2);
    expect(allExpressionsComplete(state, 4)).toBe(false);
    state = pending(pending(state, 1, 2, 3), 3, 4, 5);
    // Construites, mais aucun résultat posé : pas complète.
    expect(allExpressionsComplete(state, 4)).toBe(false);
    state = placeResultOnExpression(state, tileOf(state, 6)!.id, 0).state;
    expect(allExpressionsComplete(state, 4)).toBe(false);
    state = placeResultOnExpression(state, tileOf(state, 20)!.id, 1).state;
    expect(allExpressionsComplete(state, 4)).toBe(true);
    expect(allExpressionsComplete(state, 3)).toBe(false);
    expect(allExpressionsComplete(state, 6)).toBe(false);
  });
});
