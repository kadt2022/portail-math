import { cellAt, neighborsOf } from "./board";
import type { Board, Cell } from "./types";

/** Distance d'une case qui ne peut pas rejoindre l'entrée du tuyau. */
export const UNREACHABLE = Number.POSITIVE_INFINITY;

/** Une case se traverse si elle est libre ou occupée par un nombre (qui lui-même avance). Une tuile imagée est un mur. */
const passable = (cell: Cell): boolean => cell === null || cell.kind === "number";

/** Case d'entrée du tuyau : la dernière colonne du plateau, sur la ligne du tuyau. */
export function entranceCell(board: Board, row: number): number {
  if (!Number.isInteger(row) || row < 0 || row >= board.rows) throw new Error(`Ligne d'entrée hors du plateau : ${row}`);
  return row * board.cols + (board.cols - 1);
}

/**
 * Distance, en cases, de chaque case à l'entrée du tuyau, par les seules cases traversables et en croix (jamais en diagonale).
 * Une case sans chemin vaut UNREACHABLE. Si l'entrée est elle-même fermée par une tuile imagée, aucune case n'est joignable.
 */
export function distanceField(board: Board, entrance: number): number[] {
  const distance = Array<number>(board.cells.length).fill(UNREACHABLE);
  if (!passable(cellAt(board, entrance))) return distance;
  distance[entrance] = 0;
  const queue = [entrance];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    for (const next of neighborsOf(board, current)) {
      if (distance[next] !== UNREACHABLE || !passable(board.cells[next] ?? null)) continue;
      distance[next] = distance[current]! + 1;
      queue.push(next);
    }
  }
  return distance;
}

/** Plus court chemin de `from` jusqu'à l'entrée (les deux inclus), ou null s'il n'y en a pas. */
export function findPath(board: Board, from: number, entrance: number): number[] | null {
  const distance = distanceField(board, entrance);
  if (distance[from] === undefined || distance[from] === UNREACHABLE) return null;
  const path = [from];
  let current = from;
  while (current !== entrance) {
    const next = neighborsOf(board, current).find((cell) => distance[cell] === distance[current]! - 1);
    if (next === undefined) return null;
    path.push(next);
    current = next;
  }
  return path;
}

/** Cases des nombres qui n'ont aucun chemin vers l'entrée dans l'état actuel du plateau. */
export function unreachableNumbers(board: Board, entrance: number): number[] {
  const distance = distanceField(board, entrance);
  return board.cells.flatMap((cell, index) => (cell?.kind === "number" && distance[index] === UNREACHABLE ? [index] : []));
}
