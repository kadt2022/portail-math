import { createBoard, withCells } from "../src/engine/board";
import { colorOfPicture } from "../src/engine/pictures";
import { TILE_COLORS, type Board, type Cell, type TileColor } from "../src/engine/types";

// Une lettre par couleur (illustration par défaut de la couleur), un chiffre pour un nombre, un point pour une case libre.
const LETTERS: Record<string, string> = { R: "pomme", Y: "banane", O: "orange", G: "poire", P: "raisin", B: "noix-de-coco" };
// « S » : une septième couleur fictive, réservée aux tests (aucun fruit n'est gris), pour disposer d'une tuile différente de toutes les autres.
const TEST_ONLY_COLOR = "grey" as TileColor;
export const LETTER_OF_COLOR: Record<string, string> = { red: "R", yellow: "Y", orange: "O", green: "G", purple: "P", brown: "B", grey: "S" };

/** Construit un plateau à partir de lignes de texte, cases séparées par des espaces : « R Y 3 . ». */
export function layout(lines: string[]): Board {
  const rows = lines.map((line) => line.trim().split(/\s+/));
  const cols = rows[0]?.length ?? 0;
  let board = createBoard(rows.length, cols);
  let id = 1;
  const changes: Array<readonly [number, Cell]> = [];
  rows.forEach((row, r) => {
    if (row.length !== cols) throw new Error(`Ligne ${r} de longueur ${row.length}, attendu ${cols}`);
    row.forEach((symbol, c) => {
      const index = r * cols + c;
      if (symbol === ".") return;
      if (symbol === "S") {
        changes.push([index, { kind: "image", id: id++, picture: "test-gris", color: TEST_ONLY_COLOR }]);
        return;
      }
      const picture = LETTERS[symbol];
      if (picture) changes.push([index, { kind: "image", id: id++, picture, color: colorOfPicture(picture) }]);
      else if (/^\d+$/.test(symbol)) changes.push([index, { kind: "number", id: id++, value: Number(symbol) }]);
      else throw new Error(`Symbole inconnu : ${symbol}`);
    });
  });
  board = withCells(board, changes);
  return board;
}

/** Représentation texte d'un plateau (l'inverse de layout, aux illustrations près). */
export function render(board: Board): string[] {
  const lines: string[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    const symbols: string[] = [];
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r * board.cols + c];
      symbols.push(!cell ? "." : cell.kind === "number" ? String(cell.value) : LETTER_OF_COLOR[cell.color] ?? "?");
    }
    lines.push(symbols.join(" "));
  }
  return lines;
}

/** Hasard reproductible (mulberry32). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COLOR_COUNT = TILE_COLORS.length;

// ——— Parties simulées (MF-03) ———
import { assess, swapGame, type GameState } from "../src/engine/game";
import { unreachableNumbers } from "../src/engine/paths";
import { listValidSwaps } from "../src/engine/swap";

/** Un joueur qui choisit chaque permutation valide au hasard, sans réfléchir, jusqu'à libérer tous les nombres ou n'avoir plus de coup. */
export function randomPlay(start: GameState, rng: () => number, maxMoves = 40): GameState {
  let state = start;
  for (let i = 0; i < maxMoves; i += 1) {
    if (unreachableNumbers(state.flow.board, state.flow.entrance).length === 0) break;
    const moves = listValidSwaps(state.flow.board);
    if (moves.length === 0) break;
    const [a, b] = moves[Math.floor(rng() * moves.length)] as readonly [number, number];
    state = swapGame(state, a, b).state;
  }
  return state;
}

export const isDeadEnd = (state: GameState): boolean => unreachableNumbers(state.flow.board, state.flow.entrance).length > 0 && assess(state, 200_000).solvability === "unsolvable";
