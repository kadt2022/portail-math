import { cellAt, isNumberTile, withCells } from "./board";
import { findMatches, matchedCells, type Match } from "./match";
import type { Board } from "./types";

/**
 * Libère les cases indiquées. Une tuile numérique ne se détruit jamais : la demander est une erreur de programmation,
 * pas un cas de jeu. Les autres tuiles ne bougent pas (ni chute ni remplissage) : les cases libérées deviennent des chemins.
 */
export function removeCells(board: Board, cells: readonly number[]): Board {
  const unique = [...new Set(cells)];
  for (const index of unique) {
    if (isNumberTile(cellAt(board, index))) throw new Error(`Une tuile numérique ne peut pas être détruite : case ${index}`);
  }
  return withCells(board, unique.map((index) => [index, null] as const));
}

export interface ClearResult {
  readonly board: Board;
  readonly matches: Match[];
  /** Cases libérées, triées. */
  readonly removed: number[];
}

/** Détruit tous les alignements présents sur le plateau. */
export function clearMatches(board: Board): ClearResult {
  const matches = findMatches(board);
  const removed = matchedCells(matches);
  return { board: removed.length === 0 ? board : removeCells(board, removed), matches, removed };
}
