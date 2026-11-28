import type { Board, Cell, ImageTile, NumberTile, Position, Tile } from "./types";

/** Plateau vide de rows × cols cases. */
export function createBoard(rows: number, cols: number): Board {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) throw new Error(`Dimensions invalides : ${rows} × ${cols}`);
  return { rows, cols, cells: Array<Cell>(rows * cols).fill(null) };
}

export const isImageTile = (cell: Cell | undefined): cell is ImageTile => cell?.kind === "image";
export const isNumberTile = (cell: Cell | undefined): cell is NumberTile => cell?.kind === "number";

export function indexOf(board: Board, position: Position): number {
  return position.row * board.cols + position.col;
}

export function positionOf(board: Board, index: number): Position {
  return { row: Math.floor(index / board.cols), col: index % board.cols };
}

export function inBounds(board: Board, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < board.cells.length;
}

/** Contenu d'une case ; une case hors du plateau est signalée par une erreur plutôt que par « vide ». */
export function cellAt(board: Board, index: number): Cell {
  if (!inBounds(board, index)) throw new Error(`Case hors du plateau : ${index}`);
  return board.cells[index] ?? null;
}

/** Deux cases voisines côte à côte ou l'une au-dessus de l'autre (jamais en diagonale, jamais d'un bord à l'autre). */
export function areAdjacent(board: Board, a: number, b: number): boolean {
  if (!inBounds(board, a) || !inBounds(board, b)) return false;
  const first = positionOf(board, a);
  const second = positionOf(board, b);
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

/** Cases voisines (haut, bas, gauche, droite) qui existent. */
export function neighborsOf(board: Board, index: number): number[] {
  const { row, col } = positionOf(board, index);
  const result: number[] = [];
  if (row > 0) result.push(index - board.cols);
  if (row < board.rows - 1) result.push(index + board.cols);
  if (col > 0) result.push(index - 1);
  if (col < board.cols - 1) result.push(index + 1);
  return result;
}

/** Nouveau plateau dont les cases indiquées prennent les contenus donnés. */
export function withCells(board: Board, changes: ReadonlyArray<readonly [number, Cell]>): Board {
  const cells = [...board.cells];
  for (const [index, cell] of changes) {
    if (!inBounds(board, index)) throw new Error(`Case hors du plateau : ${index}`);
    cells[index] = cell;
  }
  return { rows: board.rows, cols: board.cols, cells };
}

export function emptyCells(board: Board): number[] {
  return board.cells.flatMap((cell, index) => (cell === null ? [index] : []));
}

export function tilesOf(board: Board): Tile[] {
  return board.cells.filter((cell): cell is Tile => cell !== null);
}
