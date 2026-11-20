// Tutoriel de la première partie des Tuiles magiques (TM-02).
//
// Rien ici n'est enregistré à l'avance : chaque indication est recalculée d'après l'état réel du plateau, avec les
// vraies règles du moteur (voisinage, validation de la carte). Aucune règle n'est modifiée pour faire réussir la démonstration.
// Une grille pédagogique, mélangée par déplacements légaux depuis une disposition valide, garantit que la résolution existe.

import {
  canPlaceCard,
  CENTER_INDEX,
  type Cell,
  createInitialState,
  type Difficulty,
  type GameState,
  generateGridSpec,
  type GridSpec,
  NEIGHBORS,
  placeCardAndValidate,
  scrambleRing,
} from "./grille-magique-engine";

export type TutorialStep =
  /** La carte magique est cachée : montrer comment la révéler. */
  | { kind: "reveal" }
  /** Expliquer qu'une ligne doit donner le résultat de droite (0 à 2 : ligne), puis une colonne le résultat du bas. */
  | { kind: "rows" }
  | { kind: "cols" }
  /** Prochaine tuile à toucher : toujours un déplacement légal vers la case vide, sur un chemin qui mène à une grille valide. */
  | { kind: "move"; index: number; first: boolean }
  /** La grille est valide et la case vide est au centre : poser la carte. */
  | { kind: "place" }
  /** La partie est gagnée. */
  | { kind: "victory" };

/** Nombre d'écrans d'explication (ligne, colonne) avant les déplacements. */
export const EXPLANATION_STEPS = 2;

function keyOf(tiles: readonly Cell[]): string {
  return tiles.join(",");
}

/**
 * Plus court chemin (suite de tuiles à toucher) qui ramène les tuiles à la disposition canonique de la grille, case vide au centre.
 * Recherche A* sur de vrais déplacements légaux (voisinage du moteur) avec la distance de Manhattan, qui ne surestime jamais :
 * chaque coup proposé est donc possible, le chemin est le plus court, et le calcul reste instantané même loin de la solution.
 * Renvoie un tableau vide si la disposition est déjà atteinte, et null si elle est inaccessible (ne peut pas arriver depuis une vraie partie).
 */
export function solveToCanonical(tiles: readonly Cell[], gridSpec: GridSpec): number[] | null {
  const goal: Cell[] = gridSpec.canonicalTiles.map((value, index) => (index === CENTER_INDEX ? null : value));
  const target = keyOf(goal);
  const start = keyOf(tiles);
  if (start === target) {
    return [];
  }
  const goalPosition = new Map<number, number>();
  goal.forEach((value, index) => {
    if (value !== null) {
      goalPosition.set(value, index);
    }
  });
  const distance = (state: readonly Cell[]) => {
    let total = 0;
    state.forEach((value, index) => {
      if (value === null) {
        return;
      }
      const wanted = goalPosition.get(value) as number;
      total += Math.abs(Math.floor(index / 3) - Math.floor(wanted / 3)) + Math.abs((index % 3) - (wanted % 3));
    });
    return total;
  };

  interface Node {
    tiles: Cell[];
    key: string;
    cost: number;
  }
  const parents = new Map<string, { from: string; click: number }>();
  const best = new Map<string, number>([[start, 0]]);
  // File à priorité par seaux : l'estimation f = coût + distance est un petit entier.
  const buckets: Node[][] = [];
  const push = (node: Node) => {
    const priority = node.cost + distance(node.tiles);
    (buckets[priority] ??= []).push(node);
  };
  push({ tiles: [...tiles], key: start, cost: 0 });
  for (let priority = 0; priority < buckets.length; priority++) {
    const bucket = buckets[priority];
    while (bucket && bucket.length > 0) {
      const node = bucket.pop() as Node;
      if ((best.get(node.key) ?? Infinity) < node.cost) {
        continue;
      }
      if (node.key === target) {
        const path: number[] = [];
        let cursor = node.key;
        while (cursor !== start) {
          const parent = parents.get(cursor) as { from: string; click: number };
          path.push(parent.click);
          cursor = parent.from;
        }
        return path.reverse();
      }
      const blank = node.tiles.indexOf(null);
      for (const neighbour of NEIGHBORS[blank]) {
        const moved = [...node.tiles];
        moved[blank] = moved[neighbour];
        moved[neighbour] = null;
        const movedKey = keyOf(moved);
        const cost = node.cost + 1;
        if (cost >= (best.get(movedKey) ?? Infinity)) {
          continue;
        }
        best.set(movedKey, cost);
        parents.set(movedKey, { from: node.key, click: neighbour });
        push({ tiles: moved, key: movedKey, cost });
      }
    }
  }
  return null;
}

/** Étape à montrer maintenant, d'après l'état réel du plateau (jamais d'après une liste de clics enregistrée). */
export function tutorialStep(state: GameState, gridSpec: GridSpec, explained: number): TutorialStep {
  if (state.status === "won") {
    return { kind: "victory" };
  }
  if (!state.cardRevealed) {
    return { kind: "reveal" };
  }
  if (explained < 1) {
    return { kind: "rows" };
  }
  if (explained < EXPLANATION_STEPS) {
    return { kind: "cols" };
  }
  if (canPlaceCard(state) && placeCardAndValidate(state, gridSpec).result.valid) {
    return { kind: "place" };
  }
  const path = solveToCanonical(state.tiles, gridSpec);
  if (path && path.length > 0) {
    return { kind: "move", index: path[0], first: state.moves === 0 };
  }
  return { kind: "place" };
}

export interface TutorialGame {
  gridSpec: GridSpec;
  state: GameState;
}

const TUTORIAL_DIFFICULTY: Difficulty = "facile";
const PEDAGOGICAL_MIN_MOVES = 4;
const PEDAGOGICAL_MAX_MOVES = 6;

/**
 * Première grille pédagogique : niveau Facile (additions seulement), mélangée par quelques déplacements légaux depuis une
 * disposition résolue. La résolution est garantie, et courte (de 4 à 6 coups) pour garder l'attention de l'enfant.
 */
export function createTutorialGame(rng: () => number = Math.random): TutorialGame {
  let fallback: TutorialGame | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const gridSpec = generateGridSpec(TUTORIAL_DIFFICULTY, rng);
    const tiles = scrambleRing(gridSpec.canonicalTiles, PEDAGOGICAL_MAX_MOVES + 2, rng);
    const state: GameState = { ...createInitialState(gridSpec, rng), tiles };
    const length = solveToCanonical(tiles, gridSpec)?.length ?? 0;
    if (length >= PEDAGOGICAL_MIN_MOVES && length <= PEDAGOGICAL_MAX_MOVES) {
      return { gridSpec, state };
    }
    if (length > 0 && !fallback) {
      fallback = { gridSpec, state };
    }
  }
  if (fallback) {
    return fallback;
  }
  const gridSpec = generateGridSpec(TUTORIAL_DIFFICULTY, rng);
  return { gridSpec, state: createInitialState(gridSpec, rng) };
}

// Mémoire du tutoriel : une fois terminé ou passé, il ne se relance plus tout seul (« Revoir le tutoriel » le relance à la demande).
const STORAGE_KEY = "mbuyamba:tuiles-magiques:tutoriel";

export function isTutorialDone(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "fait";
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "fait");
  } catch {
    // Stockage indisponible (navigation privée) : le tutoriel pourra simplement se relancer.
  }
}
