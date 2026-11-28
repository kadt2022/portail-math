import { cellAt, isImageTile, neighborsOf, withCells } from "./board";
import { sameBoard } from "./generator";
import { findMatches } from "./match";
import { unreachableNumbers } from "./paths";
import { createRng, shuffled, type Rng } from "./rng";
import type { Move } from "./solver";
import { trySwap } from "./swap";
import type { Board, Cell, ImageTile } from "./types";

export type RescueResult =
  | { readonly ok: true; readonly board: Board; /** Séquence complète qui résout la nouvelle disposition (le premier coup est l'indice). Vide si rien n'était bloqué. */ readonly moves: readonly Move[] }
  | { readonly ok: false; readonly reason: "no-cut" | "not-enough-material" | "not-found" };

export interface RescueOptions {
  readonly attempts?: number;
}

/** Lignes de trois cases voisines toutes occupées par une tuile imagée. */
function occupiedWindows(board: Board): number[][] {
  const windows: number[][] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      const start = row * board.cols + col;
      if (col + 2 < board.cols) windows.push([start, start + 1, start + 2]);
      if (row + 2 < board.rows) windows.push([start, start + board.cols, start + 2 * board.cols]);
    }
  }
  return windows.filter((cells) => cells.every((cell) => isImageTile(board.cells[cell])));
}

/** Construction à l'envers d'un coup, avec des tuiles imposées (celles qui existent déjà) : voir generator.ts pour le principe. */
function placeWindow(board: Board, cells: readonly number[], supply: readonly ImageTile[], rng: Rng): { board: Board; move: Move } | null {
  const picture = supply[0]!.picture;
  for (const pivot of shuffled(cells, rng)) {
    for (const partner of shuffled(neighborsOf(board, pivot), rng)) {
      if (cells.includes(partner)) continue;
      const moved = cellAt(board, partner);
      if (!isImageTile(moved) || moved.picture === picture) continue;
      const others = cells.filter((cell) => cell !== pivot);
      const changes: Array<readonly [number, Cell]> = [[pivot, moved], [others[0]!, supply[0]!], [others[1]!, supply[1]!], [partner, supply[2]!]];
      const candidate = withCells(board, changes);
      if (findMatches(candidate).length > 0) continue;
      const outcome = trySwap(candidate, pivot, partner);
      if (outcome.accepted && sameBoard(outcome.board, board)) return { board: candidate, move: [pivot, partner] };
    }
  }
  return null;
}

/**
 * Mélange de secours. Seules les tuiles imagées changent de place, entre les cases qu'elles occupent déjà : les nombres, leurs
 * positions, les cases libres (donc les chemins déjà ouverts) et la quantité de tuiles de chaque couleur ne bougent pas.
 *
 * La disposition n'est pas tirée au hasard puis testée : elle est construite pour avoir une solution. On choisit des lignes de
 * trois tuiles dont la disparition ouvre un chemin à tous les nombres, on leur affecte des couleurs dont il reste au moins
 * trois tuiles, on place les autres tuiles ailleurs, puis on remonte les coups à l'envers (comme le générateur). La séquence
 * obtenue est rejouée dans le vrai moteur avant d'être rendue : une disposition sans séquence vérifiée n'est jamais proposée.
 * Si le matériel restant ne le permet pas, le résultat dit pourquoi (aucune ligne de trois à libérer, pas assez de tuiles de
 * même couleur) au lieu de promettre une solution.
 */
export function rescueShuffle(board: Board, entrance: number, rng: Rng = createRng(1), options: RescueOptions = {}): RescueResult {
  if (unreachableNumbers(board, entrance).length === 0) return { ok: true, board, moves: [] };
  const { attempts = 300 } = options;
  const spots = board.cells.flatMap((cell, index) => (isImageTile(cell) ? [index] : []));
  const tilesByColor = new Map<string, ImageTile[]>();
  for (const spot of spots) {
    const tile = board.cells[spot] as ImageTile;
    tilesByColor.set(tile.picture, [...(tilesByColor.get(tile.picture) ?? []), tile]);
  }
  const triples = [...tilesByColor.values()].reduce((sum, tiles) => sum + Math.floor(tiles.length / 3), 0);
  const windows = occupiedWindows(board);
  if (windows.length === 0) return { ok: false, reason: "no-cut" };
  if (triples === 0) return { ok: false, reason: "not-enough-material" };
  const emptied = withCells(board, spots.map((spot) => [spot, null] as const));
  const blockedAfter = (freed: ReadonlySet<number>): number => unreachableNumbers(withCells(board, [...freed].map((cell) => [cell, null] as const)), entrance).length;

  let sawCut = false;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // 1. Les lignes à libérer : on ajoute, une à une, celle qui ouvre le plus de chemins.
    const chosen: number[][] = [];
    const freed = new Set<number>();
    while (blockedAfter(freed) > 0 && chosen.length < triples) {
      const options = windows.filter((cells) => cells.every((cell) => !freed.has(cell)));
      if (options.length === 0) break;
      const scored = shuffled(options, rng).map((cells) => ({ cells, blocked: blockedAfter(new Set([...freed, ...cells])) }));
      scored.sort((a, b) => a.blocked - b.blocked);
      const pick = rng() < 0.8 ? scored[0]! : scored[Math.floor(rng() * scored.length)]!;
      chosen.push(pick.cells);
      for (const cell of pick.cells) freed.add(cell);
    }
    if (blockedAfter(freed) > 0) continue;
    sawCut = true;

    // 2. Une couleur par ligne, parmi celles dont il reste au moins trois tuiles.
    const pool = new Map<string, ImageTile[]>([...tilesByColor].map(([color, tiles]) => [color, shuffled(tiles, rng)]));
    const supplies: ImageTile[][] = [];
    let enough = true;
    for (let line = 0; line < chosen.length; line += 1) {
      const kinds = shuffled([...pool.keys()].filter((kind) => (pool.get(kind)?.length ?? 0) >= 3), rng);
      const kind = kinds[0];
      if (!kind) {
        enough = false;
        break;
      }
      supplies.push(pool.get(kind)!.splice(0, 3));
    }
    if (!enough) continue;

    // 3. Les tuiles restantes se placent hors des lignes libérées ; puis on remonte les coups à l'envers.
    const leftover = shuffled([...pool.values()].flat(), rng);
    const leftoverSpots = shuffled(spots.filter((spot) => !freed.has(spot)), rng);
    let current = withCells(emptied, leftoverSpots.map((spot, i) => [spot, leftover[i] as Cell] as const));
    if (findMatches(current).length > 0) continue;
    const backwards: Move[] = [];
    let complete = true;
    for (const index of shuffled([...chosen.keys()], rng)) {
      const placed = placeWindow(current, chosen[index]!, supplies[index]!, rng);
      if (!placed) {
        complete = false;
        break;
      }
      current = placed.board;
      backwards.push(placed.move);
    }
    if (!complete) continue;

    // 4. Rejeu : la séquence est exhibée et vérifiée avant de rendre la disposition.
    const moves = backwards.reverse();
    let replay = current;
    let valid = findMatches(replay).length === 0;
    for (const [a, b] of moves) {
      const outcome = trySwap(replay, a, b);
      if (!outcome.accepted) {
        valid = false;
        break;
      }
      replay = outcome.board;
    }
    if (valid && unreachableNumbers(replay, entrance).length === 0) return { ok: true, board: current, moves };
  }
  return { ok: false, reason: sawCut ? "not-found" : "no-cut" };
}
