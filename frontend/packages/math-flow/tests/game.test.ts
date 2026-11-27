import { describe, expect, it } from "vitest";

import { assess, hint, newGame, startGame, swapGame, tickGame, verifySolution, type GameEvent, type GameState } from "../src/engine/game";
import { ADDITION, SUBTRACTION } from "../src/engine/operations";
import { unreachableNumbers } from "../src/engine/paths";
import { layout } from "./helpers";
import { createRng } from "../src/engine/rng";
import { generateLevel } from "../src/engine/generator";
import { levelConfig } from "../src/engine/levels";

function playToTheEnd(start: GameState, solution: ReadonlyArray<readonly [number, number]>) {
  let state = start;
  const events: GameEvent[] = [];
  for (const [a, b] of solution) {
    const played = swapGame(state, a, b);
    expect(played.outcome.accepted).toBe(true);
    state = played.state;
    events.push(...played.events);
    // Le jeu continue pendant que le joueur joue : le temps avance entre deux coups.
    for (let i = 0; i < 3; i += 1) {
      const step = tickGame(state);
      state = step.state;
      events.push(...step.events);
      expect(state.flow.pipe.slots.filter(Boolean).length).toBeLessThanOrEqual(1);
    }
  }
  for (let i = 0; i < 2000; i += 1) {
    const step = tickGame(state);
    state = step.state;
    events.push(...step.events);
    expect(state.flow.pipe.slots.filter(Boolean).length).toBeLessThanOrEqual(1);
    if (step.events.length === 0) break;
  }
  return { state, events };
}

describe("partie de Multipli'Flow", () => {
  it("se joue jusqu'à la victoire : nombres livrés un à un, appariés dans l'ordre, résultats calculés", () => {
    for (const levelId of [1, 2, 3]) {
      const { state: start, solution } = newGame(levelId, 11);
      const { state, events } = playToTheEnd(start, solution);
      expect(state.status).toBe("won");
      expect(events.filter((event) => event.type === "won")).toHaveLength(1);
      const arrivals = state.flow.delivered.map((tile) => tile.value);
      expect(arrivals).toHaveLength(start.totalNumbers);
      expect(state.builder.expressions).toHaveLength(start.totalNumbers / 2);
      state.builder.expressions.forEach((expression, index) => {
        expect(expression.operands).toEqual([arrivals[2 * index], arrivals[2 * index + 1]]);
        expect(expression.result).toBe((arrivals[2 * index] as number) * (arrivals[2 * index + 1] as number));
        expect(expression.stage).toBe("result");
      });
      // Le résultat est un nombre calculé par le moteur : le plateau ne contient plus que des tuiles imagées restantes, aucun résultat.
      expect(state.flow.board.cells.every((cell) => cell === null || cell.kind === "image")).toBe(true);
    }
  });

  it("n'annonce pas la victoire tant que toutes les opérations ne sont pas terminées", () => {
    const { state: start, solution } = newGame(2, 5);
    let state = start;
    for (const [a, b] of solution) state = swapGame(state, a, b).state;
    let sawPlaying = false;
    for (let i = 0; i < 500; i += 1) {
      const step = tickGame(state);
      state = step.state;
      if (state.status === "playing" && state.flow.delivered.length === start.totalNumbers) sawPlaying = true;
      if (step.events.length === 0) break;
    }
    expect(state.status).toBe("won");
    expect(sawPlaying).toBe(true); // la dernière opération se construit encore après la dernière livraison
  });

  it("applique l'opération configurée : l'addition et la soustraction passent le même contrôle de bout en bout", () => {
    for (const operation of [ADDITION, SUBTRACTION]) {
      const { state, solution } = newGame(2, 9, { operation });
      const report = verifySolution(state, solution, "interleaved");
      expect(report.ok, report.reason).toBe(true);
      expect(report.expressions.every((text) => text.includes(operation.symbol))).toBe(true);
    }
    const { state, solution } = newGame(2, 9, { operation: SUBTRACTION });
    const final = playToTheEnd(state, solution).state;
    for (const expression of final.builder.expressions) expect(expression.result).toBeGreaterThanOrEqual(0);
  });
});

describe("indice", () => {
  it("propose le premier coup d'une séquence vérifiée, et en suivant les indices on gagne", () => {
    for (const levelId of [1, 3, 5]) {
      for (const seed of [1, 2, 3]) {
        let { state } = newGame(levelId, seed);
        const played: Array<readonly [number, number]> = [];
        for (let i = 0; i < 20; i += 1) {
          const advice = hint(state);
          if (advice.kind === "none-needed") break;
          expect(advice.kind).toBe("move");
          if (advice.kind !== "move") break;
          const outcome = swapGame(state, advice.move[0], advice.move[1]);
          expect(outcome.outcome.accepted).toBe(true);
          state = outcome.state;
          played.push(advice.move);
        }
        expect(unreachableNumbers(state.flow.board, state.flow.entrance)).toEqual([]);
        const first = newGame(levelId, seed).state;
        expect(verifySolution(first, played).ok).toBe(true);
      }
    }
  });

  it("ne dit rien à faire quand tout est ouvert, et dit « sans issue » sur une impasse prouvée", () => {
    const open = startGame({ ...generateLevel(levelConfig(1), 1), board: layout([". . . . .", "4 . . . .", ". . . . .", ". . . . .", ". . . . ."]), solution: [] });
    expect(hint(open)).toEqual({ kind: "none-needed" });
    const stuck = startGame({ ...generateLevel(levelConfig(1), 1), board: layout(["4 R . . .", "R Y . . .", "S P . . .", ". . . . .", ". . . . ."]), solution: [] });
    expect(hint(stuck)).toEqual({ kind: "unsolvable" });
    expect(assess(stuck)).toMatchObject({ noMoves: true, blocked: 1, solvability: "unsolvable" });
  });

  it("n'indique jamais un coup qui mène à une impasse, même après des coups quelconques du joueur", () => {
    const rng = createRng(99);
    for (let seed = 1; seed <= 40; seed += 1) {
      const { state: start } = newGame(1 + (seed % 5), seed);
      let state = start;
      for (let i = 0; i < 3; i += 1) {
        const advice = hint(state);
        if (advice.kind !== "move") break;
        const after = swapGame(state, advice.move[0], advice.move[1]).state;
        expect(["solved", "solvable"]).toContain(assess(after).solvability);
        // Puis un coup quelconque du joueur, qui peut s'écarter du chemin.
        const moves = [] as Array<readonly [number, number]>;
        for (let a = 0; a < after.flow.board.cells.length; a += 1) for (const b of [a + 1, a + after.flow.board.cols]) if (b < after.flow.board.cells.length && swapGame(after, a, b).outcome.accepted) moves.push([a, b]);
        if (moves.length === 0) break;
        const pick = moves[Math.floor(rng() * moves.length)] as readonly [number, number];
        state = swapGame(after, pick[0], pick[1]).state;
      }
    }
  });
});
