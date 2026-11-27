import { describe, expect, it } from "vitest";

import { assess, newGame, rescueGame, verifySolution } from "../src/engine/game";
import { entranceCell, unreachableNumbers } from "../src/engine/paths";
import { rescueShuffle } from "../src/engine/rescue";
import { createRng } from "../src/engine/rng";
import { findMatches } from "../src/engine/match";
import { isDeadEnd, layout, randomPlay } from "./helpers";

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe("mélange de secours", () => {
  it("ne fait rien quand aucun nombre n'est enfermé", () => {
    const board = layout(["4 . . .", "R Y . ."]);
    expect(rescueShuffle(board, entranceCell(board, 0))).toEqual({ ok: true, board, moves: [] });
  });

  it("dit pourquoi il échoue quand il n'y a aucune ligne de trois tuiles à libérer", () => {
    // Un mur de deux tuiles seulement : aucune ligne de trois, aucune disposition ne peut l'ouvrir.
    const board = layout(["4 R . .", "R Y . ."]);
    expect(rescueShuffle(board, entranceCell(board, 0))).toEqual({ ok: false, reason: "no-cut" });
  });

  it("dit pourquoi il échoue quand il manque des tuiles de même couleur", () => {
    const board = layout(["4 R Y . .", "Y P G . .", "B O R . ."]);
    const result = rescueShuffle(board, entranceCell(board, 0));
    expect(result.ok).toBe(false);
  });

  it("sur des impasses réelles : toute disposition rendue a une séquence rejouée avec succès, et rien d'autre ne bouge", () => {
    let dead = 0;
    let rescued = 0;
    const failures: Record<string, number> = {};
    for (const levelId of [1, 2, 3, 4, 5]) {
      for (const seed of SEEDS) {
        const { state: start } = newGame(levelId, seed, { deadEndGuard: false });
        const state = randomPlay(start, createRng(seed * 31));
        if (!isDeadEnd(state)) continue;
        dead += 1;
        const { state: after, result } = rescueGame(state, createRng(seed));
        if (!result.ok) {
          failures[result.reason] = (failures[result.reason] ?? 0) + 1;
          expect(after).toBe(state);
          continue;
        }
        rescued += 1;
        const before = state.flow.board;
        const board = after.flow.board;
        // Nombres, cases libres : inchangés. Cases occupées : les mêmes, et les mêmes tuiles (mêmes identifiants).
        for (const [index, cell] of before.cells.entries()) {
          if (cell?.kind === "number") expect(board.cells[index]).toBe(cell);
          else if (cell === null) expect(board.cells[index]).toBeNull();
          else expect(board.cells[index]?.kind).toBe("image");
        }
        const ids = (cells: typeof before.cells) => cells.flatMap((cell) => (cell?.kind === "image" ? [cell.id] : [])).sort((a, b) => a - b);
        expect(ids(board.cells)).toEqual(ids(before.cells));
        expect(findMatches(board)).toEqual([]);
        // Il existe une séquence complète, rejouée dans le vrai moteur.
        expect(result.moves.length).toBeGreaterThan(0);
        const report = verifySolution(after, result.moves, "interleaved");
        expect(report.reason).toBeUndefined();
        expect(report.ok).toBe(true);
        expect(unreachableNumbers(board, after.flow.entrance).length).toBeGreaterThan(0);
        expect(assess(after, 200_000).solvability).toBe("solvable");
      }
    }
    expect(dead).toBeGreaterThan(20);
    expect(rescued).toBeGreaterThan(0);
    // Les échecs sont tous expliqués.
    for (const reason of Object.keys(failures)) expect(["no-cut", "not-enough-material", "not-found"]).toContain(reason);
  });

  it("est reproductible : même graine, même résultat", () => {
    const { state: start } = newGame(4, 5, { deadEndGuard: false });
    let state = start;
    for (let seed = 1; seed < 80; seed += 1) {
      state = randomPlay(newGame(4, seed, { deadEndGuard: false }).state, createRng(seed * 31));
      if (isDeadEnd(state) && rescueShuffle(state.flow.board, state.flow.entrance, createRng(3)).ok) break;
    }
    const a = rescueShuffle(state.flow.board, state.flow.entrance, createRng(3));
    const b = rescueShuffle(state.flow.board, state.flow.entrance, createRng(3));
    expect(b).toEqual(a);
  });

  it("les nombres déjà en route ne sont pas touchés : le mélange pendant un déplacement garde leurs cases", () => {
    const { state: start } = newGame(2, 4);
    const board = start.flow.board;
    const entrance = start.flow.entrance;
    const result = rescueShuffle(board, entrance, createRng(8));
    if (!result.ok) return;
    for (const [index, cell] of board.cells.entries()) if (cell?.kind === "number") expect(result.board.cells[index]).toBe(cell);
  });
});
