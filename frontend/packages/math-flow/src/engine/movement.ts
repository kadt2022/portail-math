import { cellAt, neighborsOf, withCells } from "./board";
import { distanceField, UNREACHABLE } from "./paths";
import type { Board, NumberTile } from "./types";

export interface NumberMove {
  readonly id: number;
  readonly from: number;
  readonly to: number;
}

/**
 * Un pas de déplacement de tous les nombres vers l'entrée du tuyau : chacun avance d'au plus une case, vers une voisine plus
 * proche de l'entrée. Les nombres les plus proches de l'entrée bougent d'abord (à égalité, le plus petit identifiant) : celui qui
 * suit peut donc entrer dans la case que son prédécesseur vient de quitter, mais jamais dans une case occupée. Un nombre dont
 * les voisines utiles sont prises attend. Chaque pas rapproche strictement d'une case de l'entrée : aucun va-et-vient, aucun
 * échange face à face, aucune traversée de tuile, aucune téléportation.
 *
 * Le nombre déjà sur la case d'entrée ne bouge pas ici : il entre dans le tuyau (voir flow.ts).
 */
export function stepNumbers(board: Board, entrance: number): { board: Board; moves: NumberMove[] } {
  const distance = distanceField(board, entrance);
  const movers = board.cells
    .flatMap((cell, index) => (cell?.kind === "number" && distance[index]! > 0 && distance[index] !== UNREACHABLE ? [{ index, id: cell.id }] : []))
    .sort((a, b) => distance[a.index]! - distance[b.index]! || a.id - b.id);

  const cells = [...board.cells];
  const moves: NumberMove[] = [];
  for (const { index, id } of movers) {
    const target = neighborsOf(board, index).find((next) => distance[next] === distance[index]! - 1 && cells[next] === null);
    if (target === undefined) continue;
    cells[target] = cells[index] ?? null;
    cells[index] = null;
    moves.push({ id, from: index, to: target });
  }
  return { board: moves.length === 0 ? board : { rows: board.rows, cols: board.cols, cells }, moves };
}

/** Vide la case d'entrée et rend le nombre qui s'y trouvait (ou null). */
export function takeFromEntrance(board: Board, entrance: number): { board: Board; tile: NumberTile | null } {
  const cell = cellAt(board, entrance);
  if (cell?.kind !== "number") return { board, tile: null };
  return { board: withCells(board, [[entrance, null]]), tile: cell };
}
