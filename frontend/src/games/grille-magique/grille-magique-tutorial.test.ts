import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyMove,
  canMoveTile,
  canPlaceCard,
  createInitialState,
  generateGridSpec,
  placeCardAndValidate,
  revealCard,
  type GameState,
} from "./grille-magique-engine";
import {
  createTutorialGame,
  EXPLANATION_STEPS,
  isTutorialDone,
  markTutorialDone,
  solveToCanonical,
  tutorialStep,
} from "./grille-magique-tutorial";

// Hasard varié mais reproductible.
function seeded(seed: number) {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("solveur du tutoriel", () => {
  it("ne propose que de vrais déplacements légaux et mène à une grille valide, pour de nombreuses grilles", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = seeded(seed);
      const spec = generateGridSpec(seed % 2 === 0 ? "facile" : "moyen", rng);
      let state = createInitialState(spec, rng);
      const path = solveToCanonical(state.tiles, spec);
      expect(path).not.toBeNull();
      for (const index of path as number[]) {
        // Chaque tuile désignée peut réellement glisser vers la case vide à cet instant.
        expect(canMoveTile(state, index)).toBe(true);
        state = applyMove(state, index);
      }
      expect(canPlaceCard(state)).toBe(true);
      expect(placeCardAndValidate(state, spec).result.valid).toBe(true);
    }
  });

  it("renvoie un chemin vide quand la disposition est déjà atteinte", () => {
    const spec = generateGridSpec("facile", seeded(3));
    const solved = spec.canonicalTiles.map((value, index) => (index === 4 ? null : value));
    expect(solveToCanonical(solved, spec)).toEqual([]);
  });

  it("se réévalue après une action différente : le nouveau chemin part de la nouvelle position et reste légal", () => {
    const spec = generateGridSpec("facile", seeded(11));
    let state = createInitialState(spec, seeded(12));
    const expected = solveToCanonical(state.tiles, spec) as number[];
    // L'enfant touche une autre tuile légale que celle conseillée.
    const other = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((index) => canMoveTile(state, index) && index !== expected[0]) as number;
    state = applyMove(state, other);
    const replanned = solveToCanonical(state.tiles, spec) as number[];
    expect(replanned.length).toBeGreaterThan(0);
    expect(canMoveTile(state, replanned[0])).toBe(true);
  });
});

describe("étapes du tutoriel", () => {
  const spec = generateGridSpec("facile", seeded(5));
  const fresh = (): GameState => createInitialState(spec, seeded(6));

  it("enchaîne : révéler la carte, expliquer une ligne puis une colonne, déplacer, poser, victoire", () => {
    let state = fresh();
    expect(tutorialStep(state, spec, 0)).toEqual({ kind: "reveal" });
    state = revealCard(state);
    expect(tutorialStep(state, spec, 0)).toEqual({ kind: "rows" });
    expect(tutorialStep(state, spec, 1)).toEqual({ kind: "cols" });
    const move = tutorialStep(state, spec, EXPLANATION_STEPS);
    expect(move.kind).toBe("move");
    if (move.kind === "move") {
      expect(move.first).toBe(true);
      expect(canMoveTile(state, move.index)).toBe(true);
    }
  });

  it("suit l'état réel jusqu'à la pose de la carte, puis la victoire déclarée par le moteur", () => {
    let state = revealCard(fresh());
    for (let guard = 0; guard < 30; guard++) {
      const step = tutorialStep(state, spec, EXPLANATION_STEPS);
      if (step.kind !== "move") {
        expect(step.kind).toBe("place");
        break;
      }
      expect(canMoveTile(state, step.index)).toBe(true);
      state = applyMove(state, step.index);
    }
    expect(canPlaceCard(state)).toBe(true);
    const { state: won, result } = placeCardAndValidate(state, spec);
    expect(result.valid).toBe(true);
    expect(tutorialStep(won, spec, EXPLANATION_STEPS)).toEqual({ kind: "victory" });
  });

  it("ne montre « poser la carte » que si la grille est réellement valide, jamais pour une disposition fausse", () => {
    // Case vide ramenée au centre après un petit tour (trois tuiles permutées) : accessible par de vrais coups, mais fausse.
    let state: GameState = { tiles: spec.canonicalTiles.map((value, index) => (index === 4 ? null : value)), cardRevealed: true, moves: 0, status: "playing" };
    for (const click of [1, 0, 3, 4]) {
      state = applyMove(state, click);
    }
    expect(state.tiles[4]).toBeNull();
    expect(canPlaceCard(state)).toBe(true);
    expect(placeCardAndValidate(state, spec).result.valid).toBe(false);
    const step = tutorialStep(state, spec, EXPLANATION_STEPS);
    expect(step.kind).toBe("move");
    if (step.kind === "move") {
      expect(canMoveTile(state, step.index)).toBe(true);
      expect(step.first).toBe(false);
    }
  });
});

describe("première grille pédagogique", () => {
  it("est en Facile, résoluble, courte (4 à 6 coups) et jamais déjà résolue", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { gridSpec, state } = createTutorialGame(seeded(seed));
      expect(gridSpec.difficulty).toBe("facile");
      expect(gridSpec.rowOperators.flat().every((operator) => operator === "+")).toBe(true);
      const path = solveToCanonical(state.tiles, gridSpec);
      expect(path).not.toBeNull();
      expect((path as number[]).length).toBeGreaterThanOrEqual(4);
      expect((path as number[]).length).toBeLessThanOrEqual(6);
      expect(state.status).toBe("playing");
      expect(state.moves).toBe(0);
      expect(state.cardRevealed).toBe(false);
    }
  });

  it("reste utilisable avec un hasard constant (jamais de boucle infinie)", () => {
    const { gridSpec, state } = createTutorialGame(() => 0);
    expect(solveToCanonical(state.tiles, gridSpec)).not.toBeNull();
  });
});

describe("mémoire du tutoriel", () => {
  it("se souvient qu'il est terminé ou passé", () => {
    expect(isTutorialDone()).toBe(false);
    markTutorialDone();
    expect(isTutorialDone()).toBe(true);
  });

  it("fonctionne sans stockage disponible (navigation privée)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("indisponible");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("indisponible");
    });
    expect(isTutorialDone()).toBe(false);
    expect(() => markTutorialDone()).not.toThrow();
  });
});
