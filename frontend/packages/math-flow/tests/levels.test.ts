import { describe, expect, it } from "vitest";

import { levelColors, levelConfig, LEVELS, nextLevel } from "../src/engine/levels";
import { TILE_COLORS } from "../src/engine/types";

describe("progression des niveaux", () => {
  it("commence par une grille 5 × 5 et les tables de 1 à 5", () => {
    const first = levelConfig(1);
    expect([first.rows, first.cols]).toEqual([5, 5]);
    expect(first.numberRange).toEqual([1, 5]);
  });

  it("ne dépasse jamais 7 × 7 et garde un nombre pair de nombres", () => {
    for (const level of LEVELS) {
      expect(Math.max(level.rows, level.cols)).toBeLessThanOrEqual(7);
      expect(level.numberCount % 2).toBe(0);
      expect(level.colorCount).toBeLessThanOrEqual(TILE_COLORS.length);
      expect(levelColors(level)).toHaveLength(level.colorCount);
    }
  });

  it("augmente la difficulté d'un niveau à l'autre", () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      const previous = LEVELS[i - 1]!;
      const level = LEVELS[i]!;
      expect(level.id).toBe(previous.id + 1);
      expect(level.steps).toBeGreaterThanOrEqual(previous.steps);
      expect(level.numberCount).toBeGreaterThanOrEqual(previous.numberCount);
      expect(level.numberRange[1]).toBeGreaterThanOrEqual(previous.numberRange[1]);
      expect(level.rows * level.cols).toBeGreaterThanOrEqual(previous.rows * previous.cols);
    }
  });

  it("enchaîne les niveaux et s'arrête après le dernier", () => {
    expect(nextLevel(1)?.id).toBe(2);
    expect(nextLevel(LEVELS.length)).toBeNull();
    expect(() => levelConfig(99)).toThrow();
  });
});
