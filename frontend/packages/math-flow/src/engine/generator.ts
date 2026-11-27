import { areAdjacent, cellAt, createBoard, isImageTile, neighborsOf, positionOf, withCells } from "./board";
import { levelColors, type LevelConfig } from "./levels";
import { findMatches } from "./match";
import { entranceCell, findPath, unreachableNumbers } from "./paths";
import { colorOfPicture, picturesOfColor } from "./pictures";
import { createRng, randomInt, shuffled, type Rng } from "./rng";
import type { Move } from "./solver";
import { trySwap } from "./swap";
import type { Board, Cell, ImageTile, TileColor } from "./types";

export interface GeneratedLevel {
  readonly level: LevelConfig;
  readonly seed: number;
  readonly entranceRow: number;
  readonly board: Board;
  /** Séquence de coups construite avec le plateau : la jouer libère tous les nombres. Elle est vérifiée par rejeu (voir game.ts). */
  readonly solution: readonly Move[];
}

export const sameBoard = (a: Board, b: Board): boolean => a.cells.length === b.cells.length && a.cells.every((cell, index) => (cell?.id ?? -1) === (b.cells[index]?.id ?? -1) && cell?.kind === b.cells[index]?.kind);

function makeImage(id: number, color: TileColor, rng: Rng): ImageTile {
  const pictures = picturesOfColor(color);
  const picture = pictures[Math.floor(rng() * pictures.length)] as string;
  return { kind: "image", id, picture, color: colorOfPicture(picture) };
}

/** Lignes de trois cases consécutives (horizontales et verticales) toutes libres. */
function freeWindows(board: Board): number[][] {
  const windows: number[][] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const start = row * board.cols + col;
      if (col + 2 < board.cols) windows.push([start, start + 1, start + 2]);
      if (row + 2 < board.rows) windows.push([start, start + board.cols, start + 2 * board.cols]);
    }
  }
  return windows.filter((cells) => cells.every((cell) => board.cells[cell] === null));
}

/**
 * Un pas de construction à l'envers. À partir d'un plateau P, on remplit trois cases libres alignées avec une couleur c, sauf
 * une case pivot qui reçoit une tuile voisine d (de couleur différente), et la voisine reçoit une tuile c : le plateau Q obtenu
 * est stable, et permuter pivot et voisine produit exactement l'alignement qui, une fois détruit, redonne P. Le pas n'est
 * gardé que si le moteur réel (trySwap) confirme que Q → P exactement.
 */
function reverseStep(board: Board, entrance: number, colors: readonly TileColor[], rng: Rng, nextId: { value: number }): { board: Board; move: Move } | null {
  const windows = shuffled(freeWindows(board), rng);
  const scored = windows
    .map((cells) => {
      const walled = withCells(board, cells.map((cell) => [cell, { kind: "image", id: -1, picture: "pomme", color: "red" } as ImageTile] as const));
      return { cells, blocked: unreachableNumbers(walled, entrance).length };
    })
    .sort((a, b) => b.blocked - a.blocked);
  for (const { cells } of scored.slice(0, 60)) {
    for (const pivot of shuffled(cells, rng)) {
      for (const partner of shuffled(neighborsOf(board, pivot), rng)) {
        if (cells.includes(partner)) continue;
        const moved = cellAt(board, partner);
        if (!isImageTile(moved)) continue;
        for (const color of shuffled(colors, rng)) {
          if (color === moved.color) continue;
          const created = makeImage(nextId.value, color, rng);
          const changes: Array<readonly [number, Cell]> = cells.map((cell) => [cell, cell === pivot ? moved : makeImage(nextId.value + 1 + cells.indexOf(cell), color, rng)] as const);
          changes.push([partner, created]);
          const candidate = withCells(board, changes);
          if (findMatches(candidate).length > 0) continue;
          const outcome = trySwap(candidate, pivot, partner);
          if (!outcome.accepted || !sameBoard(outcome.board, board)) continue;
          nextId.value += 5;
          return { board: candidate, move: [pivot, partner] };
        }
      }
    }
  }
  return null;
}

function build(level: LevelConfig, rng: Rng): { board: Board; solution: Move[]; entranceRow: number } | null {
  const entranceRow = Math.floor(level.rows / 2);
  let board = createBoard(level.rows, level.cols);
  const entrance = entranceCell(board, entranceRow);
  const colors = levelColors(level);
  const nextId = { value: 1 };

  // Nombres : loin de l'entrée, jamais dans sa colonne.
  const entrancePosition = positionOf(board, entrance);
  const spots = shuffled(
    board.cells.flatMap((_, index) => {
      const { row, col } = positionOf(board, index);
      return col < board.cols - 1 && Math.abs(row - entrancePosition.row) + Math.abs(col - entrancePosition.col) >= 2 ? [index] : [];
    }),
    rng,
  ).slice(0, level.numberCount);
  if (spots.length < level.numberCount) return null;
  const [min, max] = level.numberRange;
  board = withCells(
    board,
    spots.map((spot) => [spot, { kind: "number", id: nextId.value++, value: randomInt(rng, min, max) }] as const),
  );

  // Cases à garder libres : les chemins les plus courts de chaque nombre vers l'entrée.
  const keep = new Set<number>();
  for (const spot of spots) for (const cell of findPath(board, spot, entrance) ?? []) keep.add(cell);

  // Quelques tuiles de plus, hors de ces chemins, sans former d'alignement.
  const free = shuffled(
    board.cells.flatMap((cell, index) => (cell === null && !keep.has(index) ? [index] : [])),
    rng,
  );
  for (const index of free.slice(0, level.leftover)) {
    for (const color of shuffled(colors, rng)) {
      const candidate = withCells(board, [[index, makeImage(nextId.value, color, rng)]]);
      if (findMatches(candidate).length === 0) {
        board = candidate;
        nextId.value += 1;
        break;
      }
    }
  }

  // Construction à l'envers : chaque pas ajoute un mur qu'un coup précis démolira.
  const backwards: Move[] = [];
  for (let step = 0; step < level.steps; step += 1) {
    const made = reverseStep(board, entrance, colors, rng, nextId);
    if (!made) return null;
    board = made.board;
    backwards.push(made.move);
  }
  if (unreachableNumbers(board, entrance).length < level.minBlocked) return null;
  // Les coups à jouer sont ceux de la construction, pris dans l'ordre inverse.
  return { board, solution: backwards.reverse(), entranceRow };
}

/** Plateau d'un niveau pour une graine donnée, avec la séquence de coups qui le résout. Même graine, même plateau. */
export function generateLevel(level: LevelConfig, seed: number): GeneratedLevel {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const built = build(level, createRng(seed + attempt * 7919));
    if (!built) continue;
    // Contrôle de sécurité au niveau du plateau : la solution libère bien tous les nombres, coup après coup.
    let current = built.board;
    const entrance = entranceCell(current, built.entranceRow);
    let valid = findMatches(current).length === 0;
    for (const [a, b] of built.solution) {
      const outcome = trySwap(current, a, b);
      if (!outcome.accepted || !areAdjacent(current, a, b)) {
        valid = false;
        break;
      }
      current = outcome.board;
    }
    if (valid && unreachableNumbers(current, entrance).length === 0) return { level, seed, entranceRow: built.entranceRow, board: built.board, solution: built.solution };
  }
  throw new Error(`Aucun plateau généré pour le niveau ${level.id} (graine ${seed})`);
}
