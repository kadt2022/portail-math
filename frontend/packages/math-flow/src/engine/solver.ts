import { isImageTile } from "./board";
import { unreachableNumbers } from "./paths";
import { listValidSwaps, trySwap } from "./swap";
import type { Board } from "./types";

/** Un coup du joueur : la permutation de deux cases voisines. */
export type Move = readonly [number, number];

export type SolveResult =
  /** Tous les nombres ont déjà un chemin vers l'entrée : plus rien à faire, le transport s'en charge. */
  | { readonly status: "solved"; readonly moves: readonly [] }
  /** Une séquence de coups existe ; elle est donnée (le premier coup est l'indice). */
  | { readonly status: "solvable"; readonly moves: readonly Move[] }
  /** Recherche exhaustive terminée : aucune suite de coups ne libère tous les nombres. */
  | { readonly status: "unsolvable" }
  /** Budget de recherche épuisé avant de conclure. */
  | { readonly status: "unknown" };

export const DEFAULT_SOLVER_BUDGET = 60_000;

const key = (board: Board): string => board.cells.map((cell) => (isImageTile(cell) ? cell.picture : ".")).join("|");

/**
 * Recherche exhaustive d'une suite de coups qui libère un chemin vers l'entrée pour tous les nombres. Les nombres ne se
 * permutent pas et ne servent qu'à fixer ce qu'il faut atteindre ; libérer des cases ne peut que faciliter l'accès, donc
 * l'objectif est atteint dès que plus aucun nombre n'est enfermé. Chaque coup retire au moins trois tuiles : la recherche
 * est finie. Les états déjà vus sans issue sont mémorisés. L'ordre des coups favorise ceux qui libèrent le plus de nombres.
 */
export function solve(board: Board, entrance: number, budget: number = DEFAULT_SOLVER_BUDGET): SolveResult {
  if (unreachableNumbers(board, entrance).length === 0) return { status: "solved", moves: [] };
  const dead = new Set<string>();
  let nodes = 0;
  let exhausted = false;

  const search = (current: Board): Move[] | null => {
    const id = key(current);
    if (dead.has(id)) return null;
    nodes += 1;
    if (nodes > budget) {
      exhausted = true;
      return null;
    }
    const options = listValidSwaps(current)
      .map(([a, b]) => {
        const outcome = trySwap(current, a, b);
        return outcome.accepted ? { move: [a, b] as Move, board: outcome.board, blocked: unreachableNumbers(outcome.board, entrance).length, removed: outcome.removed.length } : null;
      })
      .filter((option): option is NonNullable<typeof option> => option !== null)
      .sort((x, y) => x.blocked - y.blocked || y.removed - x.removed || x.move[0] - y.move[0] || x.move[1] - y.move[1]);
    for (const option of options) {
      if (option.blocked === 0) return [option.move];
      const rest = search(option.board);
      if (rest) return [option.move, ...rest];
      if (exhausted) return null;
    }
    if (!exhausted) dead.add(id);
    return null;
  };

  const moves = search(board);
  if (moves) return { status: "solvable", moves };
  return exhausted ? { status: "unknown" } : { status: "unsolvable" };
}
