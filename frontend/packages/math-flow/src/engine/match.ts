import { isImageTile } from "./board";
import type { Board, TileColor } from "./types";

/** Longueur minimale d'un alignement. */
export const MIN_ALIGNMENT = 3;

export interface Match {
  /** Cases de l'alignement, dans l'ordre de lecture. */
  readonly cells: readonly number[];
  readonly color: TileColor;
  readonly direction: "horizontal" | "vertical";
}

/**
 * Tous les alignements du plateau : au moins trois tuiles imagées de même couleur, côte à côte ou l'une au-dessus de l'autre.
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
          if (!isImageTile(next) || next.color !== first.color) break;
          end += 1;
        }
        if (end - start >= minLength) {
          const cells: number[] = [];
          for (let step = start; step < end; step += 1) cells.push(at(line, step));
          matches.push({ cells, color: first.color, direction });
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
