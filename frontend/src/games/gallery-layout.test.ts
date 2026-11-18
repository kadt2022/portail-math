import { describe, expect, it } from "vitest";

import { distributeRows, galleryPlacements, GALLERY_COLUMNS, maxCardsPerRow } from "./gallery-layout";

describe("distributeRows", () => {
  it.each([
    [1, 3, [1]],
    [2, 3, [2]],
    [3, 3, [3]],
    [4, 3, [2, 2]],
    [5, 3, [3, 2]],
    [6, 3, [3, 3]],
    [5, 4, [3, 2]],
    [7, 4, [4, 3]],
    [4, 4, [4]],
    [5, 2, [1, 2, 2]],
    [3, 2, [1, 2]],
    [7, 2, [1, 2, 2, 2]],
    [3, 1, [1, 1, 1]],
    [0, 3, []],
  ])("répartit %i jeux avec %i par rangée au plus", (count, max, expected) => {
    expect(distributeRows(count, max)).toEqual(expected);
  });

  it("ne dépasse jamais le maximum et conserve tous les jeux", () => {
    for (let count = 1; count <= 24; count += 1) {
      for (let max = 1; max <= 4; max += 1) {
        const rows = distributeRows(count, max);
        expect(rows.reduce((a, b) => a + b, 0)).toBe(count);
        expect(Math.max(...rows)).toBeLessThanOrEqual(max);
        // Rangées équilibrées : jamais plus d'une carte d'écart.
        expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(1);
        // Une rangée d'une carte, quand il y a plusieurs colonnes, ouvre la galerie.
        if (max > 1 && rows.length > 1 && rows.includes(1)) expect(rows[0]).toBe(1);
      }
    }
  });
});

describe("galleryPlacements", () => {
  it("remplit chaque rangée sur toute la largeur, sans colonne vide", () => {
    for (let count = 2; count <= 12; count += 1) {
      for (let max = 1; max <= 4; max += 1) {
        const placements = galleryPlacements(count, max);
        expect(placements).toHaveLength(count);
        let used = 0;
        for (const placement of placements) {
          used += placement.span;
          if (used === GALLERY_COLUMNS) used = 0;
          expect(used).toBeLessThan(GALLERY_COLUMNS);
        }
        expect(used).toBe(0);
      }
    }
  });

  it("donne les mêmes proportions à toutes les cartes d'une rangée", () => {
    const placements = galleryPlacements(5, 3);
    expect(placements.map((p) => p.perRow)).toEqual([3, 3, 3, 2, 2]);
    expect(new Set(placements.slice(0, 3).map((p) => p.ratio)).size).toBe(1);
    expect(new Set(placements.slice(3).map((p) => p.ratio)).size).toBe(1);
  });

  it("centre une carte seule à moitié de largeur sur grand écran, et la remplit sur téléphone", () => {
    expect(galleryPlacements(1, 3)).toEqual([{ span: 6, start: 4, perRow: 1, ratio: "16 / 10" }]);
    expect(galleryPlacements(1, 1)).toEqual([{ span: 12, perRow: 1, ratio: "16 / 10" }]);
  });
});

describe("maxCardsPerRow", () => {
  it.each([
    [320, 1],
    [559, 1],
    [560, 2],
    [859, 2],
    [860, 3],
    [1199, 3],
    [1200, 4],
    [1700, 4],
  ])("à %ipx de galerie : %i carte(s) au plus par rangée", (width, expected) => {
    expect(maxCardsPerRow(width)).toBe(expected);
  });
});
