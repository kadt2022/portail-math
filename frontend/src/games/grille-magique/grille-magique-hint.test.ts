import { describe, expect, it } from "vitest";

import { applyMove, createInitialState, generateGridSpec, NEIGHBORS, type GameState } from "./grille-magique-engine";
import { getHint } from "./grille-magique-hint";

const spec = generateGridSpec("facile", () => 0);

describe("indice des Tuiles magiques", () => {
  it("désigne une tuile mal placée et sa destination, sans toucher à la partie", () => {
    const state = createInitialState(spec, () => 0);
    const before = JSON.stringify(state);
    const hint = getHint(state, spec);
    expect(JSON.stringify(state)).toBe(before);
    expect(hint.kind).toBe("move");
    if (hint.kind === "move") {
      expect(state.tiles[hint.index]).toBe(hint.value);
      const target = (hint.row - 1) * 3 + (hint.col - 1);
      expect(spec.canonicalTiles[target]).toBe(hint.value);
      expect(hint.index).not.toBe(target);
    }
  });

  it("annonce de ramener la case vide au centre quand tout est en place", () => {
    const solved: GameState = {
      tiles: spec.canonicalTiles.map((value, index) => (index === 4 ? null : value)),
      cardRevealed: false,
      moves: 0,
      status: "playing",
    };
    expect(getHint(solved, spec)).toEqual({ kind: "center" });
  });

  it("préfère une tuile voisine de la case vide, donc déplaçable tout de suite", () => {
    for (const roll of [0, 0.3, 0.6, 0.9]) {
      const state = createInitialState(spec, () => roll);
      const hint = getHint(state, spec);
      if (hint.kind !== "move") continue;
      const blank = state.tiles.indexOf(null);
      const misplacedNeighbours = NEIGHBORS[blank].filter(
        (index) => state.tiles[index] !== null && state.tiles[index] !== spec.canonicalTiles[index],
      );
      if (misplacedNeighbours.length > 0) {
        expect(misplacedNeighbours).toContain(hint.index);
      }
    }
  });

  it("répète l'indice sans jamais bloquer : appliquer le coup désigné rapproche toujours du but", () => {
    let state = createInitialState(spec, () => 0.37);
    for (let step = 0; step < 100; step++) {
      const hint = getHint(state, spec);
      if (hint.kind !== "move") break;
      const blank = state.tiles.indexOf(null);
      const candidates = NEIGHBORS[blank].filter((index) => state.tiles[index] !== null);
      state = applyMove(state, candidates[step % candidates.length]);
    }
    expect(["move", "center"]).toContain(getHint(state, spec).kind);
  });

  it("répond « terminé » après une victoire", () => {
    expect(getHint({ tiles: [...spec.canonicalTiles], cardRevealed: true, moves: 3, status: "won" }, spec)).toEqual({ kind: "done" });
  });
});
