import { describe, expect, it } from "vitest";

import { dragDirection, expressionOffset, neighbour, reservoirLayout, scanFrom } from "./geometry";

describe("geometry", () => {
  it("donne la case voisine, et rien au bord", () => {
    expect(neighbour(5, 5, 12, "up")).toBe(7);
    expect(neighbour(5, 5, 12, "down")).toBe(17);
    expect(neighbour(5, 5, 12, "left")).toBe(11);
    expect(neighbour(5, 5, 12, "right")).toBe(13);
    expect(neighbour(5, 5, 0, "up")).toBeNull();
    expect(neighbour(5, 5, 0, "left")).toBeNull();
    expect(neighbour(5, 5, 4, "right")).toBeNull();
    expect(neighbour(5, 5, 24, "down")).toBeNull();
  });

  it("lit un glissement par son axe dominant, au-delà du seuil seulement", () => {
    expect(dragDirection(3, 2, 10)).toBeNull();
    expect(dragDirection(20, 5, 10)).toBe("right");
    expect(dragDirection(-20, 5, 10)).toBe("left");
    expect(dragDirection(4, 18, 10)).toBe("down");
    expect(dragDirection(4, -18, 10)).toBe("up");
  });

  it("centre les opérations dans le second tableau", () => {
    expect(expressionOffset(5)).toBe(0);
    expect(expressionOffset(6)).toBe(0);
    expect(expressionOffset(7)).toBe(1);
  });

  it("cherche la prochaine case acceptée dans une direction", () => {
    const accepted = new Set([8, 9]);
    expect(scanFrom(3, 5, 5, "right", (c) => accepted.has(c))).toBe(8);
    expect(scanFrom(3, 5, 9, "right", (c) => accepted.has(c))).toBeNull();
    expect(scanFrom(3, 5, 6, "right", (c) => accepted.has(c))).toBe(8);
    expect(scanFrom(3, 5, 9, "left", (c) => accepted.has(c))).toBe(8);
  });
});

describe("réservoir de résultats", () => {
  it("garde toutes les tuiles sur une rangée et laisse la place du tuyau vertical", () => {
    for (const [cols, total] of [[5, 4], [5, 8], [6, 12], [7, 16]] as const) {
      const layout = reservoirLayout(cols, total);
      expect(layout.tile).toBeLessThanOrEqual(0.7);
      expect(layout.tile * total * 1.12).toBeLessThanOrEqual(cols);
      expect(layout.start).toBeGreaterThan(layout.zone);
    }
  });
});
