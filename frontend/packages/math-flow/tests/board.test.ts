import { describe, expect, it } from "vitest";

import { areAdjacent, cellAt, createBoard, emptyCells, indexOf, neighborsOf, positionOf, tilesOf, withCells } from "../src/engine/board";
import { layout } from "./helpers";

describe("plateau", () => {
  it("crée un plateau vide aux bonnes dimensions", () => {
    const board = createBoard(5, 5);
    expect(board.cells).toHaveLength(25);
    expect(emptyCells(board)).toHaveLength(25);
  });

  it("refuse des dimensions invalides", () => {
    expect(() => createBoard(0, 5)).toThrow();
    expect(() => createBoard(5, 2.5)).toThrow();
  });

  it("convertit les positions et les indices dans les deux sens", () => {
    const board = createBoard(4, 6);
    expect(indexOf(board, { row: 2, col: 3 })).toBe(15);
    expect(positionOf(board, 15)).toEqual({ row: 2, col: 3 });
  });

  it("n'accepte comme voisines que des cases en croix, jamais en diagonale ni d'un bord à l'autre", () => {
    const board = createBoard(3, 3);
    expect(areAdjacent(board, 4, 5)).toBe(true);
    expect(areAdjacent(board, 4, 1)).toBe(true);
    expect(areAdjacent(board, 4, 8)).toBe(false);
    expect(areAdjacent(board, 2, 3)).toBe(false); // fin de la ligne 0 et début de la ligne 1
    expect(areAdjacent(board, 4, 4)).toBe(false);
    expect(areAdjacent(board, 4, 99)).toBe(false);
  });

  it("liste les voisines d'un coin, d'un bord et du centre", () => {
    const board = createBoard(3, 3);
    expect(neighborsOf(board, 0).sort()).toEqual([1, 3]);
    expect(neighborsOf(board, 1).sort()).toEqual([0, 2, 4]);
    expect(neighborsOf(board, 4).sort()).toEqual([1, 3, 5, 7]);
  });

  it("ne modifie jamais le plateau d'origine", () => {
    const board = layout(["R Y", "1 ."]);
    const changed = withCells(board, [[0, null]]);
    expect(cellAt(board, 0)).not.toBeNull();
    expect(cellAt(changed, 0)).toBeNull();
  });

  it("signale une case hors du plateau au lieu de la croire vide", () => {
    expect(() => cellAt(createBoard(2, 2), 4)).toThrow();
  });

  it("distingue tuiles et cases libres", () => {
    const board = layout(["R 2 .", ". . Y"]);
    expect(tilesOf(board)).toHaveLength(3);
    expect(emptyCells(board)).toEqual([2, 3, 4]);
  });
});
