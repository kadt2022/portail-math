import { describe, expect, it } from "vitest";

import { entranceCell, unreachableNumbers } from "../src/engine/paths";
import { solve } from "../src/engine/solver";
import { trySwap } from "../src/engine/swap";
import type { Board } from "../src/engine/types";
import { layout } from "./helpers";

function play(board: Board, moves: ReadonlyArray<readonly [number, number]>): Board {
  let current = board;
  for (const [a, b] of moves) {
    const outcome = trySwap(current, a, b);
    expect(outcome.accepted).toBe(true);
    if (outcome.accepted) current = outcome.board;
  }
  return current;
}

describe("solveur exhaustif", () => {
  it("dit « résolu » quand tous les nombres ont déjà un chemin", () => {
    const board = layout(["4 . . .", ". . . ."]);
    expect(solve(board, entranceCell(board, 0))).toEqual({ status: "solved", moves: [] });
  });

  it("exhibe une séquence de coups qui libère les nombres, vérifiée coup par coup", () => {
    const board = layout(["4 R . .", "R R Y .", "S Y R ."]);
    const entrance = entranceCell(board, 0);
    const result = solve(board, entrance);
    expect(result.status).toBe("solvable");
    if (result.status !== "solvable") return;
    expect(unreachableNumbers(play(board, result.moves), entrance)).toEqual([]);
  });

  it("conclut « sans issue » après exploration complète quand le matériel manque", () => {
    // Deux tuiles rouges seulement : aucun alignement ne sera jamais possible.
    const board = layout(["4 R . .", "R Y . .", "S P . ."]);
    expect(solve(board, entranceCell(board, 0))).toEqual({ status: "unsolvable" });
  });

  it("dit « inconnu » plutôt que de conclure quand son budget est épuisé", () => {
    const board = layout(["4 R . .", "R R Y .", "S Y R ."]);
    expect(solve(board, entranceCell(board, 0), 0)).toEqual({ status: "unknown" });
  });
});
