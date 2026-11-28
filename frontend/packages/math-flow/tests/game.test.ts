import { describe, expect, it } from "vitest";

import { assess, divisionValues, hint, newGame, placeResult, resolveResults, resultHint, startGame, swapGame, tickGame, verifySolution, type GameEvent, type GameState } from "../src/engine/game";
import { ADDITION, DIVISION, MULTIPLICATION, SUBTRACTION } from "../src/engine/operations";
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
  it("livre les nombres un à un, les apparie dans l'ordre, et s'arrête à « = ? » : le moteur ne pose jamais le résultat", () => {
    for (const levelId of [1, 2, 3]) {
      const { state: start, solution } = newGame(levelId, 11);
      const { state, events } = playToTheEnd(start, solution);
      // Tous les nombres ont traversé le tuyau, mais la partie n'est PAS gagnée : l'enfant n'a encore rien calculé.
      expect(state.status).toBe("playing");
      expect(events.filter((event) => event.type === "won")).toHaveLength(0);
      const arrivals = state.flow.delivered.map((tile) => tile.value);
      expect(arrivals).toHaveLength(start.totalNumbers);
      expect(state.builder.expressions).toHaveLength(start.totalNumbers / 2);
      state.builder.expressions.forEach((expression, index) => {
        expect(expression.operands).toEqual([arrivals[2 * index], arrivals[2 * index + 1]]);
        expect(expression.expected).toBe((arrivals[2 * index] as number) * (arrivals[2 * index + 1] as number));
        expect(expression.result).toBeNull();
        expect(expression.stage).toBe("equals");
      });
      // Le réservoir porte un bon résultat et un leurre par opération.
      expect(state.builder.reservoir).toHaveLength(start.totalNumbers);
      // Le plateau ne contient plus que des tuiles imagées restantes, aucun résultat.
      expect(state.flow.board.cells.every((cell) => cell === null || cell.kind === "image")).toBe(true);
    }
  });

  it("n'est gagnée que lorsque l'enfant a posé tous les bons résultats : un à un, jamais avant le dernier", () => {
    for (const levelId of [1, 2, 3]) {
      const { state: start, solution } = newGame(levelId, 11);
      let { state } = playToTheEnd(start, solution);
      const expressions = state.builder.expressions;
      for (const [index, expression] of expressions.entries()) {
        const tile = state.builder.reservoir.find((candidate) => candidate.value === expression.expected)!;
        const placed = placeResult(state, tile.id, expression.id);
        expect(placed.outcome).toEqual({ accepted: true });
        state = placed.state;
        const last = index === expressions.length - 1;
        expect(state.status).toBe(last ? "won" : "playing");
        expect(placed.events.filter((event) => event.type === "won")).toHaveLength(last ? 1 : 0);
      }
      expect(state.builder.expressions.every((expression) => expression.result === expression.expected)).toBe(true);
      // À la victoire, les leurres qui restaient disparaissent.
      expect(state.builder.reservoir).toEqual([]);
      // Une fois gagnée, plus rien ne se place.
      expect(placeResult(state, 1, 0).state).toBe(state);
    }
  });

  it("un mauvais résultat est refusé sans rien changer ni pénaliser : la partie reste gagnable", () => {
    const { state: start, solution } = newGame(2, 5);
    const { state } = playToTheEnd(start, solution);
    const expression = state.builder.expressions[0]!;
    const decoy = state.builder.reservoir.find((tile) => tile.value !== expression.expected)!;
    const refused = placeResult(state, decoy.id, expression.id);
    expect(refused.outcome).toEqual({ accepted: false, reason: "wrong" });
    expect(refused.state).toBe(state);
    expect(refused.events).toEqual([]);
    expect(resolveResults(state).status).toBe("won");
  });

  it("l'indice de résultat désigne une tuile et l'opération où elle va, jusqu'à ce que tout soit placé", () => {
    const { state: start, solution } = newGame(2, 5);
    let { state } = playToTheEnd(start, solution);
    expect(resultHint(start)).toBeNull();
    for (let guard = 0; guard < 10; guard += 1) {
      const advice = resultHint(state);
      if (!advice) break;
      const expression = state.builder.expressions.find((candidate) => candidate.id === advice.expression)!;
      expect(state.builder.reservoir.find((tile) => tile.id === advice.tile)?.value).toBe(expression.expected);
      state = placeResult(state, advice.tile, advice.expression).state;
    }
    expect(state.status).toBe("won");
    expect(resultHint(state)).toBeNull();
  });

  it("applique l'opération configurée : l'addition et la soustraction passent le même contrôle de bout en bout", () => {
    for (const operation of [ADDITION, SUBTRACTION]) {
      const { state, solution } = newGame(2, 9, { operation });
      const report = verifySolution(state, solution, "interleaved");
      expect(report.ok, report.reason).toBe(true);
      expect(report.expressions.every((text) => text.includes(operation.symbol))).toBe(true);
    }
    const { state, solution } = newGame(2, 9, { operation: SUBTRACTION });
    const final = resolveResults(playToTheEnd(state, solution).state);
    expect(final.status).toBe("won");
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

describe("nettoyage automatique du tableau d'entrée", () => {
  const imagesLeft = (state: GameState) => state.flow.board.cells.filter((cell) => cell?.kind === "image").length;

  it("ne se déclenche jamais tant qu'un nombre reste sur le plateau ou dans le tuyau", () => {
    for (const levelId of [1, 2, 3]) {
      const { state: start, solution } = newGame(levelId, 11);
      let state = start;
      for (const [a, b] of solution) {
        state = swapGame(state, a, b).state;
        for (let i = 0; i < 3; i += 1) {
          const step = tickGame(state);
          state = step.state;
          if (state.flow.delivered.length < start.totalNumbers) {
            expect(step.events.some((event) => event.type === "board-cleaned")).toBe(false);
            expect(state.cleaned).toBe(false);
          }
        }
      }
      expect(start.cleaned).toBe(false);
    }
  });

  it("vide le tableau d'un seul coup, une seule fois, quand le dernier nombre est arrivé", () => {
    for (const levelId of [1, 2, 3]) {
      const { state: start, solution } = newGame(levelId, 11);
      const { state, events } = playToTheEnd(start, solution);
      const cleaning = events.filter((event) => event.type === "board-cleaned");
      expect(cleaning).toHaveLength(1);
      expect(state.cleaned).toBe(true);
      expect(imagesLeft(state)).toBe(0);
      expect(state.flow.board.cells.every((cell) => cell === null)).toBe(true);
      // Les nombres, eux, sont bien tous arrivés avant le nettoyage.
      expect(state.flow.delivered).toHaveLength(start.totalNumbers);
      // Plus aucun événement de nettoyage ensuite.
      expect(tickGame(state).events.filter((event) => event.type === "board-cleaned")).toHaveLength(0);
    }
  });

  it("ne compte pas comme un coup, ne gagne pas la partie, et laisse l'enfant poser ses résultats", () => {
    const { state: start, solution } = newGame(2, 5);
    const { state } = playToTheEnd(start, solution);
    expect(state.cleaned).toBe(true);
    expect(state.moves).toBe(solution.length);
    expect(state.status).toBe("playing");
    expect(resultHint(state)).not.toBeNull();
    expect(resolveResults(state).status).toBe("won");
  });

  it("ferme le tableau d'entrée : plus aucune permutation n'est acceptée", () => {
    const { state: start, solution } = newGame(1, 3);
    const { state } = playToTheEnd(start, solution);
    const refused = swapGame(state, 0, 1);
    expect(refused.outcome.accepted).toBe(false);
    expect(refused.state).toBe(state);
  });

  it("repart à zéro avec une nouvelle partie du même niveau ou d'un autre niveau", () => {
    const { state: start, solution } = newGame(1, 3);
    expect(playToTheEnd(start, solution).state.cleaned).toBe(true);
    expect(newGame(1, 3).state.cleaned).toBe(false);
    expect(newGame(2, 3).state.cleaned).toBe(false);
  });
});

describe("les quatre jeux de la famille : seule l'opération change", () => {
  const operations = [ADDITION, SUBTRACTION, MULTIPLICATION, DIVISION];

  it("chaque opération se joue de bout en bout, sur tous les niveaux, et ne se gagne que par les résultats de l'enfant", () => {
    for (const operation of operations) {
      for (const levelId of [1, 2, 3, 4, 5]) {
        for (const seed of [3, 8]) {
          const { state: start, solution } = newGame(levelId, seed, { operation });
          const { state } = playToTheEnd(start, solution);
          expect(state.status, `${operation.id} niveau ${levelId}`).toBe("playing");
          expect(state.builder.expressions).toHaveLength(start.totalNumbers / 2);
          for (const expression of state.builder.expressions) {
            const [x, y] = expression.operands as readonly [number, number];
            expect(expression.expected).toBe(operation.compute(x, y));
            expect(Number.isInteger(expression.expected)).toBe(true);
            expect(expression.expected as number).toBeGreaterThanOrEqual(0);
          }
          for (const tile of state.builder.reservoir) {
            expect(Number.isInteger(tile.value) && tile.value >= 0).toBe(true);
          }
          expect(resolveResults(state).status).toBe("won");
        }
      }
    }
  });

  it("division : tous les nombres sont des puissances de 2, donc n'importe quelle paire se divise exactement", () => {
    for (const levelId of [1, 2, 3, 4, 5]) {
      const { state } = newGame(levelId, 6, { operation: DIVISION });
      const values = divisionValues(state.level);
      const numbers = state.flow.board.cells.flatMap((cell) => (cell?.kind === "number" ? [cell.value] : []));
      expect(numbers).toHaveLength(state.totalNumbers);
      for (const value of numbers) expect(values).toContain(value);
      for (const big of numbers) for (const small of numbers) if (big >= small) expect(big % small).toBe(0);
    }
  });

  it("les autres opérations gardent les nombres du plateau tels qu'ils sont générés", () => {
    const { state } = newGame(3, 6, { operation: MULTIPLICATION });
    const other = newGame(3, 6, { operation: ADDITION }).state;
    expect(state.flow.board.cells.map((cell) => (cell?.kind === "number" ? cell.value : null))).toEqual(other.flow.board.cells.map((cell) => (cell?.kind === "number" ? cell.value : null)));
  });
});
