// Moteur pur de Raster Puzzle : aucune dépendance à React, au DOM ni à une image. Il ne connaît que des morceaux numérotés : le morceau
// p appartient, à la fin, dans la case p. Aucune pénalité : un morceau se déplace, se retire ou s'échange autant qu'on veut.

/** Source de hasard (0 inclus, 1 exclu) : `Math.random` en jeu, une suite fixe dans les tests. */
export type Rng = () => number;

export type LevelId = "beginner" | "easy" | "medium" | "advanced" | "expert";

export interface Level {
  id: LevelId;
  /** Côté de la grille : size × size morceaux. */
  size: number;
}

export const LEVELS: Level[] = [
  { id: "beginner", size: 2 },
  { id: "easy", size: 3 },
  { id: "medium", size: 4 },
  { id: "advanced", size: 5 },
  { id: "expert", size: 6 },
];

export const DEFAULT_LEVEL: LevelId = "easy";

export function levelSize(id: LevelId): number {
  return (LEVELS.find((level) => level.id === id) ?? LEVELS[1]).size;
}

export interface PuzzleState {
  size: number;
  /**
   * Classe d'équivalence visuelle de chaque morceau (indexé par sa vraie case). Deux morceaux d'une même classe sont
   * interchangeables : par exemple deux morceaux de fond blanc.
   */
  classes: number[];
  /** Morceau posé dans chaque case de la grille, ou null. */
  board: Array<number | null>;
  /** Morceaux encore dans la zone de stockage, dans l'ordre d'affichage. */
  tray: number[];
  /** Nombre de déplacements (information, jamais une pénalité). */
  moves: number;
  status: "playing" | "won";
}

export type PieceLocation = { where: "tray"; index: number } | { where: "board"; cell: number };

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Nouveau puzzle : tous les morceaux dans la zone de stockage, mélangés (jamais dans l'ordre de l'image quand c'est possible). */
export function createPuzzle(size: number, classes?: number[], rng: Rng = Math.random): PuzzleState {
  const count = size * size;
  const identity = Array.from({ length: count }, (_, index) => index);
  let tray = shuffle(identity, rng);
  for (let attempt = 0; attempt < 5 && count > 1 && tray.every((piece, index) => piece === index); attempt += 1) tray = shuffle(identity, rng);
  if (count > 1 && tray.every((piece, index) => piece === index)) [tray[0], tray[1]] = [tray[1], tray[0]];
  return { size, classes: classes ?? identity, board: Array.from({ length: count }, () => null), tray, moves: 0, status: "playing" };
}

/** Applique les classes d'équivalence une fois l'image lue : la partie en cours est réévaluée (un puzzle déjà juste est gagné). */
export function withClasses(state: PuzzleState, classes: number[]): PuzzleState {
  return settle({ ...state, classes });
}

export function locate(state: PuzzleState, piece: number): PieceLocation | null {
  const index = state.tray.indexOf(piece);
  if (index >= 0) return { where: "tray", index };
  const cell = state.board.indexOf(piece);
  return cell >= 0 ? { where: "board", cell } : null;
}

/** La grille est reconstituée : chaque case porte un morceau de la même classe que celui qui lui revient. */
export function isSolved(state: PuzzleState): boolean {
  return state.board.every((piece, cell) => piece !== null && state.classes[piece] === state.classes[cell]);
}

export interface Verdict {
  /** Cases dont la tuile est la bonne (ou une tuile visuellement identique). */
  correct: number[];
  /** Cases dont la tuile n'est pas la bonne. */
  wrong: number[];
  /** Cases encore vides. */
  empty: number[];
}

/** Verdict de la grille, case par case : bonnes tuiles, mauvaises tuiles, cases vides. Ne change jamais la partie. */
export function checkBoard(state: PuzzleState): Verdict {
  const verdict: Verdict = { correct: [], wrong: [], empty: [] };
  state.board.forEach((piece, cell) => {
    if (piece === null) verdict.empty.push(cell);
    else if (state.classes[piece] === state.classes[cell]) verdict.correct.push(cell);
    else verdict.wrong.push(cell);
  });
  return verdict;
}

function settle(state: PuzzleState): PuzzleState {
  return isSolved(state) ? { ...state, status: "won" } : state;
}

/** Pose un morceau dans une case. Case occupée : le morceau qui s'y trouvait prend la place laissée libre (échange). */
export function placePiece(state: PuzzleState, piece: number, cell: number): PuzzleState {
  const from = locate(state, piece);
  if (state.status === "won" || !from || cell < 0 || cell >= state.board.length || (from.where === "board" && from.cell === cell)) return state;
  const occupant = state.board[cell];
  const board = [...state.board];
  let tray = state.tray;
  if (from.where === "tray") {
    tray = occupant === null ? state.tray.filter((_, index) => index !== from.index) : state.tray.map((entry, index) => (index === from.index ? occupant : entry));
  } else {
    board[from.cell] = occupant;
  }
  board[cell] = piece;
  return settle({ ...state, board, tray, moves: state.moves + 1 });
}

/** Retire le morceau d'une case : il retourne dans la zone de stockage. */
export function returnToTray(state: PuzzleState, cell: number): PuzzleState {
  const piece = state.board[cell];
  if (state.status === "won" || piece == null) return state;
  const board = [...state.board];
  board[cell] = null;
  return { ...state, board, tray: [...state.tray, piece], moves: state.moves + 1 };
}

/** Plus grand côté de tuile, tel que `count` tuiles tiennent dans width × height avec `gap` entre elles. */
export function fitTiles(width: number, height: number, count: number, gap: number): number {
  if (width <= 0 || height <= 0 || count <= 0) return 0;
  let best = 0;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    best = Math.max(best, Math.min((width - (columns - 1) * gap) / columns, (height - (rows - 1) * gap) / rows));
  }
  return Math.max(0, Math.floor(best));
}

/** Choisit la prochaine image en évitant les dernières déjà vues (au plus tous sauf un). */
export function pickImage(pool: string[], recent: string[], rng: Rng = Math.random, avoid = 4): string | null {
  if (pool.length === 0) return null;
  const memory = new Set(recent.slice(-Math.min(avoid, pool.length - 1)));
  const candidates = pool.filter((id) => !memory.has(id));
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(rng() * source.length)];
}

/** Mémoire courte des dernières images vues. */
export function remember(recent: string[], id: string, keep = 6): string[] {
  return [...recent.filter((entry) => entry !== id), id].slice(-keep);
}
