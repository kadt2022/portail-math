import { describe, expect, it } from "vitest";

import { cellAt } from "../src/engine/board";
import { clearMatches, removeCells } from "../src/engine/removal";
import { layout, render } from "./helpers";

describe("suppression", () => {
  it("libère uniquement les cases demandées, sans faire tomber ni remplir", () => {
    const board = layout(["R Y P", "B G S", "O R Y"]);
    const result = removeCells(board, [0, 4]);
    expect(render(result)).toEqual([". Y P", "B . S", "O R Y"]);
  });

  it("refuse de détruire un nombre", () => {
    const board = layout(["R 7 P"]);
    expect(() => removeCells(board, [1])).toThrow();
    expect(cellAt(board, 1)).not.toBeNull();
  });

  it("accepte une case déjà libre et des doublons", () => {
    const board = layout(["R . P"]);
    expect(render(removeCells(board, [1, 1, 0]))).toEqual([". . P"]);
  });

  it("détruit tous les alignements et laisse les nombres où ils sont", () => {
    const board = layout(["R R R 2", "Y G P 3", "B 4 B S"]);
    const result = clearMatches(board);
    expect(result.removed).toEqual([0, 1, 2]);
    expect(render(result.board)).toEqual([". . . 2", "Y G P 3", "B 4 B S"]);
  });

  it("ne change rien quand il n'y a pas d'alignement", () => {
    const board = layout(["R Y P", "B G S"]);
    const result = clearMatches(board);
    expect(result.board).toBe(board);
    expect(result.removed).toEqual([]);
  });
});
