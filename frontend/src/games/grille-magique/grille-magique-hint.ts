// Indice des Tuiles magiques : aide d'interface, sans effet sur les règles ni sur le score.
// Il s'appuie sur la disposition canonique de la grille (celle qui a servi à la générer) : toute tuile
// qui y est à sa place est correcte, donc suivre l'indice mène toujours à une grille valide.

import { CENTER_INDEX, NEIGHBORS, type GameState, type GridSpec } from "./grille-magique-engine";

export type Hint =
  /** Une tuile n'est pas à sa place : sa valeur et la case où elle doit aller (1 à 3). */
  | { kind: "move"; index: number; value: number; row: number; col: number }
  /** Tout est en place sauf la case vide : la ramener au centre, puis poser la carte. */
  | { kind: "center" }
  /** La partie est terminée. */
  | { kind: "done" };

export function getHint(state: GameState, gridSpec: GridSpec): Hint {
  if (state.status === "won") {
    return { kind: "done" };
  }
  const blank = state.tiles.indexOf(null);
  const misplaced: number[] = [];
  state.tiles.forEach((value, index) => {
    if (value !== null && value !== gridSpec.canonicalTiles[index]) {
      misplaced.push(index);
    }
  });
  if (misplaced.length === 0) {
    return { kind: "center" };
  }
  // On préfère une tuile qui peut bouger tout de suite (voisine de la case vide) : l'indice est alors actionnable.
  const index = misplaced.find((candidate) => NEIGHBORS[blank]?.includes(candidate)) ?? misplaced[0];
  const value = state.tiles[index] as number;
  // La case centrale de la disposition canonique porte la carte magique : une tuile n'y est jamais attendue.
  const target = gridSpec.canonicalTiles.findIndex((tile, position) => tile === value && position !== CENTER_INDEX);
  return { kind: "move", index, value, row: Math.floor(target / 3) + 1, col: (target % 3) + 1 };
}
