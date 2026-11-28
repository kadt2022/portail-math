import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cardMinWidth, cardWidth, CARD_MIN_BASE, CARD_MIN_BASE_2, CARD_MIN_SLOPE, CARD_MIN_SLOPE_2, CATALOGUE_GAP, columnsFor } from "./catalogue-grid";

// Largeur utile du conteneur de la galerie (celle de l'écran moins marges et menu latéral) -> cartes par ligne attendues.
const EXPECTED: ReadonlyArray<readonly [number, number]> = [
  [288, 1], // petit smartphone
  [328, 1],
  [358, 2], // smartphone standard
  [398, 2],
  [736, 2], // tablette
  [880, 3],
  [1230, 3], // ordinateur portable
  [1790, 4], // grand écran
  [2000, 5],
  [2430, 5],
];

describe("grille adaptative du catalogue", () => {
  it.each(EXPECTED)("%i px de large : %i carte(s) par ligne", (width, columns) => {
    expect(columnsFor(width)).toBe(columns);
  });

  it("garde de grandes cartes : jamais sous 165 px de large, et au moins 260 px dès 700 px de conteneur", () => {
    for (let width = 288; width <= 3000; width += 8) {
      expect(cardWidth(width)).toBeGreaterThanOrEqual(165);
    }
    for (let width = 700; width <= 3000; width += 8) expect(cardWidth(width)).toBeGreaterThanOrEqual(260);
  });

  it("n'ajoute une colonne que si les cartes ne rétrécissent pas trop, et n'en perd jamais en s'élargissant", () => {
    let previous = 0;
    for (let width = 288; width <= 3000; width += 4) {
      const columns = columnsFor(width);
      expect(columns).toBeGreaterThanOrEqual(previous);
      previous = columns;
    }
  });

  it("l'écart est de 16 px, identique en largeur et en hauteur", () => {
    expect(CATALOGUE_GAP).toBe(16);
  });

  it("la carte minimale grandit avec la largeur", () => {
    expect(cardMinWidth(320)).toBeLessThan(cardMinWidth(800));
    expect(cardMinWidth(800)).toBeLessThan(cardMinWidth(2400));
  });

  it("le CSS reprend exactement les mêmes valeurs : auto-fill, minmax, aucun point de rupture", () => {
    const css = readFileSync(join(process.cwd(), "src/games/GamesCataloguePage.module.css"), "utf8");
    const grid = /\.grid \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(grid).toContain(`--gap: ${CATALOGUE_GAP}px`);
    expect(grid).toContain(`--card-min: min(${CARD_MIN_BASE}px + ${Math.round(CARD_MIN_SLOPE * 100)}cqw, ${CARD_MIN_BASE_2}px + ${Math.round(CARD_MIN_SLOPE_2 * 100)}cqw)`);
    expect(grid).toContain("repeat(auto-fill, minmax(min(100%, var(--card-min)), 1fr))");
    expect(css).toMatch(/\.gallery \{[^}]*container-type: inline-size/);
    expect(css.replace(/\.grid \{[^}]*\}/, "")).not.toMatch(/@media[^{]*\{\s*\.grid\b/);
  });
});
