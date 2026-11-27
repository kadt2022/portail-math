import { describe, expect, it } from "vitest";

import { allExpressionsComplete, createBuilder, receiveNumber, stepBuilder, type BuilderState, type ExpressionEvent } from "../src/engine/expression";
import { MULTIPLICATION, SUBTRACTION } from "../src/engine/operations";
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

describe("construction des multiplications", () => {
  it("suit la séquence : 1er nombre, 2e nombre, ×, =, résultat", () => {
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
    expect(done.events).toEqual([
      { type: "expression-operator", expression: 0, symbol: "×" },
      { type: "expression-equals", expression: 0 },
      { type: "expression-result", expression: 0, value: 12 },
    ]);
    expect(done.state.expressions[0]).toMatchObject({ stage: "result", operands: [3, 4], result: 12 });
  });

  it("n'affiche un étage qu'à chaque pas : signe, puis égal, puis résultat", () => {
    let state = feed(feed(createBuilder(MULTIPLICATION), n(1, 2)).state, n(2, 5)).state;
    const stages: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      state = stepBuilder(state).state;
      stages.push(state.expressions[0]!.stage);
    }
    expect(stages).toEqual(["operator", "equals", "result", "result"]);
  });

  it("calcule le résultat lui-même : aucune tuile ne le porte", () => {
    const state = settle(feed(feed(createBuilder(MULTIPLICATION), n(1, 5)).state, n(2, 5)).state).state;
    expect(state.expressions[0]?.result).toBe(25);
    expect([state.expressions[0]?.a.value, state.expressions[0]?.b?.value]).toEqual([5, 5]);
  });

  it("apparie les nombres dans leur ordre d'arrivée : 1er+2e, 3e+4e", () => {
    let state = createBuilder(MULTIPLICATION);
    for (const [id, value] of [[1, 2], [2, 3], [3, 4], [4, 5]] as const) state = feed(state, n(id, value)).state;
    state = settle(state).state;
    expect(state.expressions.map((e) => e.operands)).toEqual([[2, 3], [4, 5]]);
    expect(state.expressions.map((e) => e.result)).toEqual([6, 20]);
  });

  it("garde les opérations terminées visibles", () => {
    let state = settle(feed(feed(createBuilder(MULTIPLICATION), n(1, 2)).state, n(2, 3)).state).state;
    state = feed(state, n(3, 4)).state;
    expect(state.expressions).toHaveLength(2);
    expect(state.expressions[0]?.stage).toBe("result");
    expect(state.expressions[1]?.stage).toBe("first");
  });

  it("accepte l'arrivée d'un nombre pendant qu'une opération s'achève", () => {
    let state = feed(feed(createBuilder(MULTIPLICATION), n(1, 2)).state, n(2, 3)).state;
    state = stepBuilder(state).state; // « × » affiché
    state = feed(state, n(3, 4)).state; // le suivant arrive
    expect(state.expressions.map((e) => e.stage)).toEqual(["operator", "first"]);
    state = settle(state).state;
    expect(state.expressions.map((e) => e.stage)).toEqual(["result", "first"]);
  });

  it("n'est complète que si toutes les opérations attendues sont terminées", () => {
    let state = createBuilder(MULTIPLICATION);
    expect(allExpressionsComplete(state, 4)).toBe(false);
    for (const [id, value] of [[1, 2], [2, 3], [3, 4]] as const) state = feed(state, n(id, value)).state;
    state = settle(state).state;
    expect(allExpressionsComplete(state, 4)).toBe(false);
    state = settle(feed(state, n(4, 5)).state).state;
    expect(allExpressionsComplete(state, 4)).toBe(true);
    expect(allExpressionsComplete(state, 3)).toBe(false);
  });

  it("applique l'opération configurée : la soustraction range le plus grand en premier", () => {
    const state = settle(feed(feed(createBuilder(SUBTRACTION), n(1, 2)).state, n(2, 7)).state).state;
    expect(state.expressions[0]).toMatchObject({ operands: [7, 2], result: 5 });
  });
});
