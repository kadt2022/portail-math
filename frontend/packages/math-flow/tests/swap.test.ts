import { describe, expect, it } from "vitest";

import { findMatches } from "../src/engine/match";
import { listValidSwaps, swapCells, trySwap } from "../src/engine/swap";
import { layout, render } from "./helpers";

describe("permutation", () => {
  it("accepte une permutation qui crée un alignement horizontal et détruit les tuiles", () => {
    // Le R de la ligne du bas monte en case 2 : R R R en haut.
    const board = layout(["R R Y", "Y G R", "B S O"]);
    const outcome = trySwap(board, 2, 5);
    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) return;
    expect(render(outcome.swapped)).toEqual(["R R R", "Y G Y", "B S O"]);
    expect(render(outcome.board)).toEqual([". . .", "Y G Y", "B S O"]);
    expect(outcome.removed).toEqual([0, 1, 2]);
    expect(outcome.matches).toHaveLength(1);
  });

  it("accepte une permutation qui crée un alignement vertical", () => {
    const board = layout(["R Y P", "G R S", "R B O"]);
    const outcome = trySwap(board, 3, 4);
    expect(outcome.accepted).toBe(true);
    if (outcome.accepted) expect(outcome.removed).toEqual([0, 3, 6]);
  });

  it("accepte quand c'est l'autre tuile permutée qui forme l'alignement", () => {
    const board = layout(["Y Y G", "R R Y", "B S P"]);
    // Le Y du bas-droit de la ligne 1 monte en case 2 ; le G descend et ne forme rien. Alignement Y Y Y en haut.
    const outcome = trySwap(board, 2, 5);
    expect(outcome.accepted).toBe(true);
  });

  it("refuse une permutation sans alignement et laisse le plateau intact", () => {
    const board = layout(["R Y P", "B G S", "O R Y"]);
    const before = render(board);
    expect(trySwap(board, 0, 1)).toEqual({ accepted: false, reason: "no-alignment" });
    expect(render(board)).toEqual(before);
  });

  it("refuse deux cases non voisines, y compris en diagonale", () => {
    const board = layout(["R R Y", "Y G R", "B S O"]);
    expect(trySwap(board, 0, 2)).toEqual({ accepted: false, reason: "not-adjacent" });
    expect(trySwap(board, 0, 4)).toEqual({ accepted: false, reason: "not-adjacent" });
  });

  it("refuse une case seule, ou hors du plateau", () => {
    const board = layout(["R R Y"]);
    expect(trySwap(board, 1, 1)).toEqual({ accepted: false, reason: "same-cell" });
    expect(trySwap(board, 1, 9)).toEqual({ accepted: false, reason: "out-of-bounds" });
    expect(trySwap(board, -1, 0)).toEqual({ accepted: false, reason: "out-of-bounds" });
  });

  it("refuse de déplacer une tuile vers une case vide, même si cela créerait un alignement", () => {
    const board = layout(["R R .", "Y G R"]);
    expect(trySwap(board, 2, 5)).toEqual({ accepted: false, reason: "not-image" });
    expect(trySwap(board, 1, 2)).toEqual({ accepted: false, reason: "not-image" });
  });

  it("refuse de permuter un nombre, même s'il se glisse entre deux tuiles", () => {
    const board = layout(["R 3 R", "Y R S"]);
    expect(trySwap(board, 1, 4)).toEqual({ accepted: false, reason: "not-image" });
    expect(trySwap(board, 0, 1)).toEqual({ accepted: false, reason: "not-image" });
  });

  it("ne bouge pas les nombres ni les autres tuiles", () => {
    const board = layout(["R R Y 5", "Y G R 6", "B S O 7"]);
    const outcome = trySwap(board, 2, 6);
    expect(outcome.accepted).toBe(true);
    if (outcome.accepted) expect(render(outcome.board)).toEqual([". . . 5", "Y G Y 6", "B S O 7"]);
  });

  it("refuse la permutation de deux tuiles de même couleur (rien ne change)", () => {
    const board = layout(["R R Y", "G P S"]);
    expect(trySwap(board, 0, 1)).toEqual({ accepted: false, reason: "no-alignment" });
  });

  it("swapCells échange deux cases sans règle", () => {
    const board = layout(["R Y"]);
    expect(render(swapCells(board, 0, 1))).toEqual(["Y R"]);
  });
});

describe("coups possibles", () => {
  it("liste chaque permutation acceptée une seule fois", () => {
    const board = layout(["R R Y", "Y G R", "B S O"]);
    expect(listValidSwaps(board)).toEqual([[2, 5]]);
  });

  it("ne liste rien quand plus aucun coup n'est possible", () => {
    expect(listValidSwaps(layout(["R Y P", "B G S", "O R Y"]))).toEqual([]);
    expect(listValidSwaps(layout([". . .", "3 . 4"]))).toEqual([]);
  });

  it("ne voit pas de coup à travers un nombre ou une case libre", () => {
    expect(listValidSwaps(layout(["R R 1 Y R"]))).toEqual([]);
    expect(listValidSwaps(layout(["R R . Y R"]))).toEqual([]);
  });

  it("cohérence : tout coup listé est accepté, tout autre voisinage est refusé", () => {
    const board = layout(["R R Y G", "Y G R P", "B S O B", "P 2 R Y"]);
    const valid = new Set(listValidSwaps(board).map(([a, b]) => `${a}-${b}`));
    for (let index = 0; index < board.cells.length; index += 1) {
      for (const other of [index + 1, index + board.cols]) {
        if (other >= board.cells.length || (other === index + 1 && (index + 1) % board.cols === 0)) continue;
        expect(trySwap(board, index, other).accepted).toBe(valid.has(`${index}-${other}`));
      }
    }
  });
});

describe("invariants sur des plateaux aléatoires", () => {
  const COLORS = ["R", "Y", "O", "G", "P", "B", "S"];

  function randomStableBoard(seed: number): string[] {
    const rng = seededRng(seed);
    const rows = 5;
    const cols = 5;
    const grid: string[][] = [];
    for (let r = 0; r < rows; r += 1) {
      grid.push([]);
      for (let c = 0; c < cols; c += 1) {
        const roll = rng();
        if (roll < 0.12) grid[r]!.push(String(1 + Math.floor(rng() * 5)));
        else if (roll < 0.22) grid[r]!.push(".");
        else {
          let symbol = COLORS[Math.floor(rng() * COLORS.length)]!;
          // Évite tout alignement de départ : la partie commence sur un plateau stable.
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const left = c >= 2 && grid[r]![c - 1] === symbol && grid[r]![c - 2] === symbol;
            const up = r >= 2 && grid[r - 1]![c] === symbol && grid[r - 2]![c] === symbol;
            if (!left && !up) break;
            symbol = COLORS[Math.floor(rng() * COLORS.length)]!;
          }
          const left = c >= 2 && grid[r]![c - 1] === symbol && grid[r]![c - 2] === symbol;
          const up = r >= 2 && grid[r - 1]![c] === symbol && grid[r - 2]![c] === symbol;
          grid[r]!.push(left || up ? "." : symbol);
        }
      }
    }
    return grid.map((row) => row.join(" "));
  }

  function seededRng(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  it("sur 300 plateaux : acceptation cohérente, nombres intacts, plateau stable après chaque coup", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const board = layout(randomStableBoard(seed));
      expect(findMatches(board)).toEqual([]);
      const numbers = board.cells.flatMap((cell, index) => (cell?.kind === "number" ? [[index, cell.value] as const] : []));
      for (const [a, b] of listValidSwaps(board)) {
        const outcome = trySwap(board, a, b);
        expect(outcome.accepted).toBe(true);
        if (!outcome.accepted) continue;
        expect(findMatches(outcome.board)).toEqual([]);
        expect(outcome.removed.length).toBeGreaterThanOrEqual(3);
        for (const [index, value] of numbers) expect(outcome.board.cells[index]).toMatchObject({ kind: "number", value });
        const before = board.cells.filter(Boolean).length;
        expect(outcome.board.cells.filter(Boolean).length).toBe(before - outcome.removed.length);
      }
    }
  });
});
