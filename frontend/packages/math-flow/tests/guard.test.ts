import { describe, expect, it, vi } from "vitest";

import { assess, newGame, swapGame, type GameState } from "../src/engine/game";
import { unreachableNumbers } from "../src/engine/paths";
import { createRng } from "../src/engine/rng";
import { listValidSwaps } from "../src/engine/swap";
import { isDeadEnd, randomPlay } from "./helpers";

// Ces tests parcourent des centaines de parties et appellent le solveur à chaque coup : ils prennent plusieurs secondes.
// La configuration du paquet leur accorde déjà ce temps, mais la suite du portail (lancée depuis frontend/, où vitest
// garde ses 5 s par défaut) les exécute aussi : on fixe ici le même délai pour qu'ils ne dépendent pas de qui les lance.
vi.setConfig({ testTimeout: 120_000 });

const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1);

describe("garde-fou contre les impasses (activé par défaut)", () => {
  it("sans garde-fou, un joueur qui joue n'importe quoi peut se retrouver sans issue (ce que le garde-fou évite)", () => {
    let dead = 0;
    for (const levelId of [2, 3, 4, 5]) {
      for (const seed of SEEDS) if (isDeadEnd(randomPlay(newGame(levelId, seed, { deadEndGuard: false }).state, createRng(seed * 31)))) dead += 1;
    }
    expect(dead).toBeGreaterThan(0);
  });

  it("avec le garde-fou : jamais d'impasse, jamais bloqué, et la partie reste toujours résoluble", () => {
    let refused = 0;
    let unknown = 0;
    for (const levelId of [1, 2, 3, 4, 5]) {
      for (const seed of SEEDS) {
        let state: GameState = newGame(levelId, seed, { deadEndGuard: true }).state;
        const rng = createRng(seed * 17);
        for (let i = 0; i < 60; i += 1) {
          if (unreachableNumbers(state.flow.board, state.flow.entrance).length === 0) break;
          // Il y a toujours au moins un coup : la partie n'est jamais bloquée.
          const moves = listValidSwaps(state.flow.board);
          expect(moves.length).toBeGreaterThan(0);
          const [a, b] = moves[Math.floor(rng() * moves.length)] as readonly [number, number];
          const played = swapGame(state, a, b);
          if (!played.outcome.accepted) {
            expect(played.outcome.reason).toBe("dead-end");
            expect(played.state).toBe(state);
            refused += 1;
            continue;
          }
          state = played.state;
          const status = assess(state, 200_000).solvability;
          if (status === "unknown") unknown += 1;
          expect(["solved", "solvable"]).toContain(status);
        }
        expect(unreachableNumbers(state.flow.board, state.flow.entrance).length === 0 || assess(state, 200_000).solvability === "solvable").toBe(true);
      }
    }
    expect(unknown).toBe(0);
    expect(refused).toBeGreaterThan(0);
  });

  it("refuse seulement les coups qui bloqueraient : ceux de la solution restent toujours acceptés", () => {
    for (const levelId of [1, 3, 5]) {
      const { state, solution } = newGame(levelId, 3, { deadEndGuard: true });
      let current = state;
      for (const [a, b] of solution) {
        const played = swapGame(current, a, b);
        expect(played.outcome.accepted).toBe(true);
        current = played.state;
      }
    }
  });
});
