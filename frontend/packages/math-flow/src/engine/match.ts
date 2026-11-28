import { isImageTile } from "./board";
import type { Board } from "./types";

/** Longueur minimale d'un alignement. */
export const MIN_ALIGNMENT = 3;

export interface Match {
  /** Cases de l'alignement, dans l'ordre de lecture. */
  readonly cells: readonly number[];
  /** L'image de l'alignement : trois tuiles identiques, pas seulement de la même couleur. */
  readonly picture: string;
  readonly direction: "horizontal" | "vertical";
}

/**
 * Tous les alignements du plateau : au moins trois tuiles imagées identiques (la même image), côte à côte ou l'une au-dessus de l'autre.
 * Un nombre ou une case vide interrompt un alignement ; un alignement ne passe jamais d'une ligne ou d'une colonne à l'autre.
 */
export function findMatches(board: Board, minLength: number = MIN_ALIGNMENT): Match[] {
  const matches: Match[] = [];
  const scan = (count: number, length: number, at: (line: number, step: number) => number, direction: Match["direction"]) => {
    for (let line = 0; line < count; line += 1) {
      let start = 0;
      while (start < length) {
        const first = board.cells[at(line, start)];
        if (!isImageTile(first)) {
          start += 1;
          continue;
        }
        let end = start + 1;
        while (end < length) {
          const next = board.cells[at(line, end)];
          if (!isImageTile(next) || next.picture !== first.picture) break;
          end += 1;
        }
        if (end - start >= minLength) {
          const cells: number[] = [];
          for (let step = start; step < end; step += 1) cells.push(at(line, step));
          matches.push({ cells, picture: first.picture, direction });
        }
        start = end;
      }
    }
  };
  scan(board.rows, board.cols, (row, col) => row * board.cols + col, "horizontal");
  scan(board.cols, board.rows, (col, row) => row * board.cols + col, "vertical");
  return matches;
}

/** Cases touchées par au moins un alignement, sans doublon (une croix ou un L partage une case), triées. */
export function matchedCells(matches: readonly Match[]): number[] {
  return [...new Set(matches.flatMap((match) => match.cells))].sort((a, b) => a - b);
}
