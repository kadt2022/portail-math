import { describe, expect, it } from "vitest";

import { areAdjacent } from "../src/engine/board";
import { distanceField, entranceCell, findPath, UNREACHABLE, unreachableNumbers } from "../src/engine/paths";
import { layout } from "./helpers";

describe("entrée du tuyau", () => {
  it("se trouve sur la dernière colonne, à la ligne du tuyau", () => {
    const board = layout([". . .", ". . .", ". . ."]);
    expect(entranceCell(board, 1)).toBe(5);
    expect(() => entranceCell(board, 3)).toThrow();
    expect(() => entranceCell(board, -1)).toThrow();
  });
});

describe("recherche de chemins", () => {
  it("calcule les distances en croix, sans diagonale", () => {
    const board = layout([". . .", ". . .", ". . ."]);
    const field = distanceField(board, 5);
    expect(field).toEqual([3, 2, 1, 2, 1, 0, 3, 2, 1]);
  });

  it("trouve le plus court chemin, entrée comprise, uniquement par des cases voisines", () => {
    const board = layout(["4 . . .", ". . . .", ". . . ."]);
    const path = findPath(board, 0, 7);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(5);
    expect(path![0]).toBe(0);
    expect(path![path!.length - 1]).toBe(7);
    for (let i = 1; i < path!.length; i += 1) expect(areAdjacent(board, path![i - 1]!, path![i]!)).toBe(true);
  });

  it("contourne les tuiles imagées, qui sont des murs", () => {
    const board = layout(["4 R . .", ". R . .", ". . . ."]);
    const path = findPath(board, 0, 3);
    expect(path).toHaveLength(8);
    for (let i = 1; i < path!.length; i += 1) expect(areAdjacent(board, path![i - 1]!, path![i]!)).toBe(true);
    for (const cell of path!) expect(board.cells[cell]?.kind).not.toBe("image");
  });

  it("traverse la case d'un autre nombre (il avancera aussi)", () => {
    const board = layout(["4 5 . ."]);
    expect(findPath(board, 0, 3)).toEqual([0, 1, 2, 3]);
  });

  it("n'a pas de chemin quand un mur de tuiles ferme le passage", () => {
    const board = layout(["4 R . .", "R R . ."]);
    expect(findPath(board, 0, 3)).toBeNull();
    expect(distanceField(board, 3)[0]).toBe(UNREACHABLE);
    expect(unreachableNumbers(board, 3)).toEqual([0]);
  });

  it("n'a aucun chemin quand la case d'entrée est fermée par une tuile imagée", () => {
    const board = layout(["4 . . R"]);
    expect(findPath(board, 0, 3)).toBeNull();
    expect(unreachableNumbers(board, 3)).toEqual([0]);
  });

  it("donne un chemin d'une seule case à un nombre déjà sur l'entrée", () => {
    const board = layout([". . 4"]);
    expect(findPath(board, 2, 2)).toEqual([2]);
  });
});
