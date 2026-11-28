import { describe, expect, it } from "vitest";

import { createBoard, withCells } from "../src/engine/board";
import { findMatches, matchedCells } from "../src/engine/match";
import { colorOfPicture } from "../src/engine/pictures";
import { layout } from "./helpers";

describe("alignements", () => {
  it("n'aligne pas des fruits différents de la même couleur : une pastèque, une poire, une pastèque", () => {
    const pictures = ["pasteque", "poire", "pasteque"];
    const board = withCells(createBoard(1, 3), pictures.map((picture, index) => [index, { kind: "image", id: index + 1, picture, color: colorOfPicture(picture) }] as const));
    expect(board.cells.every((cell) => cell?.kind === "image" && cell.color === "green")).toBe(true);
    expect(findMatches(board)).toHaveLength(0);
  });

  it("détecte trois tuiles identiques à l'horizontale", () => {
    const matches = findMatches(layout(["R R R", "Y G P", "B S O"]));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ cells: [0, 1, 2], picture: "pomme", direction: "horizontal" });
  });

  it("détecte trois tuiles identiques à la verticale", () => {
    const matches = findMatches(layout(["R Y P", "R G O", "R B S"]));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ cells: [0, 3, 6], picture: "pomme", direction: "vertical" });
  });

  it("ne détecte rien avec seulement deux tuiles", () => {
    expect(findMatches(layout(["R R Y", "Y G P", "B S O"]))).toEqual([]);
  });

  it("prend toute la longueur d'un alignement de quatre ou cinq", () => {
    expect(findMatches(layout(["R R R R Y"]))[0]?.cells).toEqual([0, 1, 2, 3]);
    expect(findMatches(layout(["Y Y Y Y Y"]))[0]?.cells).toEqual([0, 1, 2, 3, 4]);
  });

  it("aligne par couleur, quelle que soit l'illustration", () => {
    // Banane, ananas et girafe sont toutes jaunes.
    const board = layout(["Y Y Y"]);
    expect(findMatches(board)).toHaveLength(1);
  });

  it("est interrompu par un nombre, même entre trois tuiles de la même couleur", () => {
    expect(findMatches(layout(["R R 4 R R"]))).toEqual([]);
    expect(findMatches(layout(["R R R 4 R R"]))).toHaveLength(1);
  });

  it("est interrompu par une case libre", () => {
    expect(findMatches(layout(["R R . R R"]))).toEqual([]);
  });

  it("n'aligne jamais des nombres, même identiques", () => {
    expect(findMatches(layout(["3 3 3", "3 3 3", "3 3 3"]))).toEqual([]);
  });

  it("ne passe pas d'une ligne à la suivante", () => {
    // Fin de ligne : deux R ; début de la ligne suivante : un R. Ce ne sont pas trois tuiles voisines.
    expect(findMatches(layout(["Y R R", "R Y Y"]))).toEqual([]);
  });

  it("trouve deux alignements séparés", () => {
    const matches = findMatches(layout(["R R R", "Y G P", "B B B"]));
    expect(matches).toHaveLength(2);
    expect(matchedCells(matches)).toEqual([0, 1, 2, 6, 7, 8]);
  });

  it("fusionne les cases d'un L ou d'une croix sans doublon", () => {
    const board = layout(["R R R", "R Y P", "R B S"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(2);
    expect(matchedCells(matches)).toEqual([0, 1, 2, 3, 6]);
    const cross = layout(["Y R P", "R R R", "S R B"]);
    expect(matchedCells(findMatches(cross))).toEqual([1, 3, 4, 5, 7]);
  });

  it("accepte un seuil différent", () => {
    expect(findMatches(layout(["R R Y"]), 2)).toHaveLength(1);
  });
});
