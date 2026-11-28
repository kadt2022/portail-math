import { areAdjacent, cellAt, inBounds, isImageTile, withCells } from "./board";
import { findMatches, type Match } from "./match";
import { clearMatches } from "./removal";
import type { Board } from "./types";

export type SwapRefusal = "out-of-bounds" | "same-cell" | "not-adjacent" | "not-image" | "no-alignment";

export type SwapOutcome =
  | { readonly accepted: false; readonly reason: SwapRefusal }
  | {
      readonly accepted: true;
      /** Plateau juste après la permutation, avant la disparition (pour l'animation). */
      readonly swapped: Board;
      /** Plateau après la disparition des alignements. */
      readonly board: Board;
      readonly matches: Match[];
      /** Cases libérées, triées. */
      readonly removed: number[];
    };

/** Échange brut de deux cases, sans aucune règle. */
export function swapCells(board: Board, a: number, b: number): Board {
  return withCells(board, [
    [a, cellAt(board, b)],
    [b, cellAt(board, a)],
  ]);
}

/**
 * Permutation du joueur. Règles : deux cases voisines, toutes deux occupées par une tuile imagée (jamais un nombre, jamais une
 * case vide), et la permutation doit produire au moins un alignement qui touche l'une des deux tuiles déplacées. Sinon elle est
 * refusée et le plateau reste intact (aucune pénalité).
 */
export function trySwap(board: Board, a: number, b: number): SwapOutcome {
  if (!inBounds(board, a) || !inBounds(board, b)) return { accepted: false, reason: "out-of-bounds" };
  if (a === b) return { accepted: false, reason: "same-cell" };
  if (!areAdjacent(board, a, b)) return { accepted: false, reason: "not-adjacent" };
  if (!isImageTile(cellAt(board, a)) || !isImageTile(cellAt(board, b))) return { accepted: false, reason: "not-image" };
  const swapped = swapCells(board, a, b);
  const touching = findMatches(swapped).some((match) => match.cells.includes(a) || match.cells.includes(b));
  if (!touching) return { accepted: false, reason: "no-alignment" };
  const cleared = clearMatches(swapped);
  return { accepted: true, swapped, board: cleared.board, matches: cleared.matches, removed: cleared.removed };
}

/** Toutes les permutations acceptées sur ce plateau, chaque paire une seule fois (a < b). Vide : plus aucun coup possible. */
export function listValidSwaps(board: Board): Array<readonly [number, number]> {
  const swaps: Array<readonly [number, number]> = [];
  for (let index = 0; index < board.cells.length; index += 1) {
    if (!isImageTile(board.cells[index])) continue;
    const candidates = [];
    if ((index + 1) % board.cols !== 0) candidates.push(index + 1);
    if (index + board.cols < board.cells.length) candidates.push(index + board.cols);
    for (const other of candidates) {
      if (trySwap(board, index, other).accepted) swaps.push([index, other]);
    }
  }
  return swaps;
}
