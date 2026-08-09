import { describe, expect, it } from "vitest";

import {
  applyMove,
  canMoveTile,
  canPlaceCard,
  CENTER_INDEX,
  computeScore,
  createInitialState,
  generateGridSpec,
  type GridSpec,
  NEIGHBORS,
  placeCardAndValidate,
  revealCard,
  scrambleRing,
} from "./grille-magique-engine";

function cyclingRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Petit générateur pseudo-aléatoire déterministe (mulberry32) pour les tests
 * qui s'appuient sur les tentatives successives de generateGridSpec : une
 * courte liste cyclique ne varie pas assez pour satisfaire ses contraintes. */
function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("generateGridSpec", () => {
  it("Facile n'utilise que l'addition", () => {
    const spec = generateGridSpec("facile", cyclingRng([0.1, 0.9, 0.4, 0.6, 0.2, 0.8]));
    for (const [op1, op2] of [...spec.rowOperators, ...spec.colOperators]) {
      expect(op1).toBe("+");
      expect(op2).toBe("+");
    }
  });

  it("Moyen mélange addition et soustraction dans une même grille, sans résultat négatif", () => {
    for (let seed = 0; seed < 25; seed++) {
      const spec = generateGridSpec("moyen", seededRng(seed));
      const operators = [...spec.rowOperators, ...spec.colOperators].flat();
      expect(operators).toContain("+");
      expect(operators).toContain("-");
      expect(spec.rowResults.every((result) => result >= 0)).toBe(true);
      expect(spec.colResults.every((result) => result >= 0)).toBe(true);
    }
  });

  it("utilise neuf valeurs distinctes adaptées au primaire (1 à 9)", () => {
    const spec = generateGridSpec("facile");
    expect(new Set(spec.canonicalTiles).size).toBe(9);
    for (const value of spec.canonicalTiles) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(9);
    }
    expect(spec.magicValue).toBe(spec.canonicalTiles[CENTER_INDEX]);
  });

  it("la grille générée possède au moins une solution valide (la disposition canonique)", () => {
    const spec = generateGridSpec("moyen");
    const state = createInitialState(spec, cyclingRng([0]));
    // ramène manuellement la disposition canonique avec la case vide au centre
    state.tiles = spec.canonicalTiles.map((value, index) => (index === CENTER_INDEX ? null : value));
    const { result } = placeCardAndValidate(state, spec);
    expect(result.valid).toBe(true);
  });
});

describe("scrambleRing", () => {
  it("garantit la résolvabilité : ne contient que le mélange légal des tuiles canoniques", () => {
    const canonicalTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const scrambled = scrambleRing(canonicalTiles, 40, cyclingRng([0.1, 0.6, 0.3, 0.9, 0.05]));

    const nonNullValues = scrambled.filter((value): value is number => value !== null).sort((a, b) => a - b);
    const expectedRing = canonicalTiles.filter((_, index) => index !== CENTER_INDEX).sort((a, b) => a - b);
    expect(nonNullValues).toEqual(expectedRing);
    expect(scrambled.filter((value) => value === null)).toHaveLength(1);
  });

  it("ne revient jamais en arrière immédiatement (pas de va-et-vient trivial)", () => {
    const canonicalTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    // rng toujours à 0 : sans la protection anti-retour, on obtiendrait un aller-retour infini
    const scrambled = scrambleRing(canonicalTiles, 3, cyclingRng([0]));
    expect(scrambled.filter((value) => value === null)).toHaveLength(1);
  });
});

describe("déplacements autorisés et interdits (CA-01)", () => {
  const tiles = [1, 2, 3, 4, null, 6, 7, 8, 9];
  const state = { tiles, cardRevealed: false, moves: 0, status: "playing" as const };

  it("autorise un déplacement voisin de la case vide", () => {
    expect(canMoveTile(state, 1)).toBe(true);
    expect(canMoveTile(state, 3)).toBe(true);
    expect(canMoveTile(state, 5)).toBe(true);
    expect(canMoveTile(state, 7)).toBe(true);
  });

  it("interdit un déplacement non voisin, y compris en diagonale", () => {
    expect(canMoveTile(state, 0)).toBe(false); // diagonale
    expect(canMoveTile(state, 8)).toBe(false); // diagonale
    expect(canMoveTile(state, 2)).toBe(false); // ni ligne ni colonne partagée avec le centre
  });

  it("applyMove ignore un déplacement illégal", () => {
    const next = applyMove(state, 0);
    expect(next).toBe(state);
  });

  it("applyMove déplace la tuile et incrémente les coups pour un déplacement légal", () => {
    const next = applyMove(state, 1);
    expect(next.tiles[CENTER_INDEX]).toBe(2);
    expect(next.tiles[1]).toBeNull();
    expect(next.moves).toBe(1);
  });

  it("la carte de voisinage ne permet aucun déplacement diagonal, quelle que soit la case vide", () => {
    for (const [blank, neighbours] of Object.entries(NEIGHBORS)) {
      const row = Math.floor(Number(blank) / 3);
      const col = Number(blank) % 3;
      for (const neighbour of neighbours) {
        const nRow = Math.floor(neighbour / 3);
        const nCol = neighbour % 3;
        const isOrthogonal = (nRow === row && Math.abs(nCol - col) === 1) || (nCol === col && Math.abs(nRow - row) === 1);
        expect(isOrthogonal).toBe(true);
      }
    }
  });
});

describe("carte magique (CA-03/CA-04)", () => {
  it("la révélation ne modifie ni le statut ni les coups", () => {
    const state = { tiles: [1, 2, 3, 4, 5, 6, 7, 8, null], cardRevealed: false, moves: 3, status: "playing" as const };
    const next = revealCard(state);
    expect(next.cardRevealed).toBe(true);
    expect(next.status).toBe("playing");
    expect(next.moves).toBe(3);
  });

  it("refuse la pose lorsque la case vide n'est pas au centre", () => {
    const state = { tiles: [null, 2, 3, 4, 5, 6, 7, 8, 9], cardRevealed: true, moves: 0, status: "playing" as const };
    expect(canPlaceCard(state)).toBe(false);
  });

  it("autorise la pose uniquement grâce à la position de la case vide, jamais via une disposition secrète", () => {
    const state = { tiles: [9, 8, 7, 6, null, 5, 4, 3, 2], cardRevealed: false, moves: 12, status: "playing" as const };
    expect(canPlaceCard(state)).toBe(true);
  });

  it("placeCardAndValidate lève une erreur si la case vide n'est pas au centre", () => {
    const state = { tiles: [null, 2, 3, 4, 5, 6, 7, 8, 9], cardRevealed: true, moves: 0, status: "playing" as const };
    const spec = generateGridSpec("facile");
    expect(() => placeCardAndValidate(state, spec)).toThrow();
  });
});

describe("validation générique des égalités (CA-05/CA-06)", () => {
  // GridSpec fabriqué à la main (valeurs arbitraires) pour isoler la logique
  // de validation de celle de generateGridSpec.
  const gridSpec: GridSpec = {
    difficulty: "facile",
    canonicalTiles: [1, 2, 3, 10, 5, 20, 3, 2, 1],
    magicValue: 5,
    rowOperators: [
      ["+", "+"],
      ["+", "+"],
      ["+", "+"],
    ],
    colOperators: [
      ["+", "+"],
      ["+", "+"],
      ["+", "+"],
    ],
    rowResults: [6, 35, 6],
    colResults: [14, 9, 24],
  };

  it("accepte la disposition canonique", () => {
    const state = { tiles: [1, 2, 3, 10, null, 20, 3, 2, 1], cardRevealed: true, moves: 5, status: "playing" as const };
    const { state: next, result } = placeCardAndValidate(state, gridSpec);
    expect(result.valid).toBe(true);
    expect(next.status).toBe("won");
    expect(next.tiles[CENTER_INDEX]).toBe(5);
  });

  it("accepte une disposition différente qui respecte les mêmes égalités (rangées 0 et 2 échangées)", () => {
    // Dispositions distinctes de la canonique, mais row0<->row2 ont la même
    // somme (6) : en échangeant les rangées en bloc, les sommes de colonnes
    // (qui ne dépendent pas de l'ordre des lignes) restent inchangées.
    const state = { tiles: [3, 2, 1, 10, null, 20, 1, 2, 3], cardRevealed: true, moves: 9, status: "playing" as const };
    const { state: next, result } = placeCardAndValidate(state, gridSpec);
    expect(result.valid).toBe(true);
    expect(next.status).toBe("won");
  });

  it("refuse une solution incorrecte, indique la ligne fautive et laisse la partie continuer", () => {
    const state = { tiles: [1, 2, 4, 10, null, 20, 3, 2, 1], cardRevealed: true, moves: 2, status: "playing" as const };
    const { state: next, result } = placeCardAndValidate(state, gridSpec);
    expect(result.valid).toBe(false);
    expect(result.rowValid[0]).toBe(false);
    expect(result.colValid[2]).toBe(false);
    expect(next.status).toBe("playing");
    expect(next.tiles[CENTER_INDEX]).toBeNull();
    expect(next.cardRevealed).toBe(true);
  });

  it("après un refus, un nouveau déplacement reste possible", () => {
    const state = { tiles: [1, 2, 4, 10, null, 20, 3, 2, 1], cardRevealed: true, moves: 2, status: "playing" as const };
    const { state: rejected } = placeCardAndValidate(state, gridSpec);
    expect(canMoveTile(rejected, 1)).toBe(true);
  });
});

describe("computeScore", () => {
  it("attribue davantage de points en Moyen qu'en Facile à performance égale", () => {
    expect(computeScore("moyen", 30, 10)).toBeGreaterThan(computeScore("facile", 30, 10));
  });

  it("ne descend jamais sous les points de base", () => {
    const score = computeScore("facile", 10_000, 10_000);
    expect(score).toBeGreaterThanOrEqual(100);
  });
});
