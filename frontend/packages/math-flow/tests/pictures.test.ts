import { describe, expect, it } from "vitest";

import { colorOfPicture, PICTURE_COLOR, picturesOfColor } from "../src/engine/pictures";
import { TILE_COLORS } from "../src/engine/types";

describe("couleurs des illustrations", () => {
  it("n'emploie que des couleurs de jeu connues", () => {
    for (const color of Object.values(PICTURE_COLOR)) expect(TILE_COLORS).toContain(color);
  });

  it("donne au moins une illustration à chaque couleur", () => {
    for (const color of TILE_COLORS) expect(picturesOfColor(color).length).toBeGreaterThan(0);
  });

  it("refuse une illustration inconnue", () => {
    expect(() => colorOfPicture("voiture")).toThrow();
  });

  it("associe 10 illustrations : les fruits seulement, aucun animal", () => {
    expect(Object.keys(PICTURE_COLOR)).toHaveLength(10);
    for (const animal of ["chat", "chien", "lion", "elephant", "singe"]) expect(PICTURE_COLOR[animal]).toBeUndefined();
  });
});
