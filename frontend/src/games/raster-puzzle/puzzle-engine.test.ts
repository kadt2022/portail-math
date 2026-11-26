import { describe, expect, it } from "vitest";

import { checkBoard, createPuzzle, DEFAULT_LEVEL, fitTiles, isSolved, LEVELS, levelSize, locate, pickImage, placePiece, remember, returnToTray, type PuzzleState } from "./puzzle-engine";

/** Hasard déterministe : une suite de valeurs qui se répète. */
function sequence(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

/** Résout le puzzle en posant chaque morceau dans sa vraie case. */
function solve(state: PuzzleState): PuzzleState {
  let next = state;
  for (let piece = 0; piece < state.board.length; piece += 1) next = placePiece(next, piece, piece);
  return next;
}

describe("niveaux", () => {
  it("propose les cinq niveaux : 2×2, 3×3, 4×4, 5×5 et 6×6", () => {
    expect(LEVELS.map((level) => [level.id, level.size, level.size * level.size])).toEqual([
      ["beginner", 2, 4],
      ["easy", 3, 9],
      ["medium", 4, 16],
      ["advanced", 5, 25],
      ["expert", 6, 36],
    ]);
    expect(levelSize(DEFAULT_LEVEL)).toBe(3);
    expect(levelSize("expert")).toBe(6);
  });
});

describe("nouveau puzzle", () => {
  it("met tous les morceaux dans la zone de stockage, mélangés, et la grille vide", () => {
    const state = createPuzzle(4, undefined, sequence([0.3, 0.7, 0.1, 0.9]));
    expect(state.board.every((piece) => piece === null)).toBe(true);
    expect([...state.tray].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, index) => index));
    expect(state.tray.every((piece, index) => piece === index)).toBe(false);
    expect(state.status).toBe("playing");
    expect(state.moves).toBe(0);
  });

  it("ne rend jamais les morceaux dans l'ordre de l'image, même avec un hasard qui les laisserait en place", () => {
    // Un hasard qui choisit toujours le dernier élément laisse l'ordre inchangé : le moteur le corrige.
    const state = createPuzzle(2, undefined, () => 0.999);
    expect(state.tray.every((piece, index) => piece === index)).toBe(false);
  });
});

describe("déplacements", () => {
  it("pose un morceau dans une case : il quitte la zone de stockage", () => {
    const state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    const piece = state.tray[0];
    const next = placePiece(state, piece, 4);
    expect(next.board[4]).toBe(piece);
    expect(next.tray).not.toContain(piece);
    expect(next.tray).toHaveLength(8);
    expect(next.moves).toBe(1);
  });

  it("échange avec un morceau déjà posé : l'ancien occupant prend la place laissée dans la zone de stockage", () => {
    const state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    const [first, second] = state.tray;
    const placed = placePiece(state, first, 0);
    const swapped = placePiece(placed, second, 0);
    expect(swapped.board[0]).toBe(second);
    expect(swapped.tray).toContain(first);
    expect(swapped.tray).toHaveLength(8);
    expect(new Set(swapped.tray).size).toBe(8);
  });

  it("déplace un morceau d'une case à une autre, ou échange deux morceaux de la grille", () => {
    let state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    const [a, b] = state.tray;
    state = placePiece(placePiece(state, a, 0), b, 1);
    const moved = placePiece(state, a, 5);
    expect(moved.board[0]).toBeNull();
    expect(moved.board[5]).toBe(a);
    const swapped = placePiece(state, a, 1);
    expect([swapped.board[0], swapped.board[1]]).toEqual([b, a]);
  });

  it("retire un morceau de la grille : il retourne dans la zone de stockage", () => {
    let state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    const piece = state.tray[0];
    state = placePiece(state, piece, 2);
    state = returnToTray(state, 2);
    expect(state.board[2]).toBeNull();
    expect(state.tray).toContain(piece);
    expect(state.tray).toHaveLength(9);
    expect(locate(state, piece)).toEqual({ where: "tray", index: 8 });
    expect(returnToTray(state, 2)).toBe(state);
  });

  it("ignore un morceau inconnu, une case hors grille, et la case où le morceau est déjà", () => {
    let state = createPuzzle(2, undefined, sequence([0.3]));
    expect(placePiece(state, 99, 0)).toBe(state);
    expect(placePiece(state, state.tray[0], 4)).toBe(state);
    expect(placePiece(state, state.tray[0], -1)).toBe(state);
    state = placePiece(state, state.tray[0], 0);
    expect(placePiece(state, state.board[0] as number, 0)).toBe(state);
  });
});

describe("validation", () => {
  it("l'image est reconstituée quand chaque morceau est dans sa case : la partie est gagnée, sans bouton à presser", () => {
    const state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    const almost = solve({ ...state }).board.map((piece, cell) => (cell === 8 ? null : piece));
    expect(almost[8]).toBeNull();
    const done = solve(state);
    expect(isSolved(done)).toBe(true);
    expect(done.status).toBe("won");
    expect(done.tray).toEqual([]);
  });

  it("une grille presque juste n'est pas gagnée", () => {
    let state = createPuzzle(2, undefined, sequence([0.4, 0.6]));
    state = placePiece(placePiece(placePiece(state, 0, 0), 1, 1), 3, 2);
    state = placePiece(state, 2, 3);
    expect(state.status).toBe("playing");
    expect(isSolved(state)).toBe(false);
  });

  it("deux morceaux visuellement identiques sont interchangeables : les permuter ne coûte rien", () => {
    // Les morceaux 1 et 2 sont deux morceaux de fond blanc (même classe).
    const classes = [0, 1, 1, 2];
    let state = createPuzzle(2, classes, sequence([0.4, 0.6]));
    state = placePiece(placePiece(placePiece(placePiece(state, 0, 0), 2, 1), 1, 2), 3, 3);
    expect(state.status).toBe("won");
  });

  it("deux morceaux seulement ressemblants (classes différentes) ne sont pas interchangeables", () => {
    const classes = [0, 1, 2, 3];
    let state = createPuzzle(2, classes, sequence([0.4, 0.6]));
    state = placePiece(placePiece(placePiece(placePiece(state, 0, 0), 2, 1), 1, 2), 3, 3);
    expect(state.status).toBe("playing");
  });

  it("une partie gagnée ne bouge plus", () => {
    const done = solve(createPuzzle(2, undefined, sequence([0.4, 0.6])));
    expect(placePiece(done, 0, 3)).toBe(done);
    expect(returnToTray(done, 0)).toBe(done);
  });
});

describe("zone de stockage", () => {
  it("calcule la plus grande tuile qui tient, quel que soit le format de la zone", () => {
    // 36 tuiles dans une zone carrée de 300 : 6 par ligne, 6 lignes, 8 px d'écart.
    expect(fitTiles(300, 300, 36, 8)).toBe(43);
    // Zone très large et basse : tout sur peu de lignes.
    expect(fitTiles(600, 60, 9, 4)).toBe(60);
    // Zone étroite et haute.
    expect(fitTiles(60, 600, 9, 4)).toBe(60);
    expect(fitTiles(0, 100, 9, 4)).toBe(0);
    expect(fitTiles(100, 100, 0, 4)).toBe(0);
  });
});

describe("tirage des images", () => {
  const pool = ["a", "b", "c", "d", "e", "f"];

  it("évite les dernières images vues, et garde au moins un candidat avec une petite réserve", () => {
    for (let round = 0; round < 40; round += 1) expect(["a", "b", "c", "d"]).not.toContain(pickImage(pool, ["a", "b", "c", "d"]));
    expect(pickImage(["x", "y"], ["x", "y"], () => 0)).toBe("x");
    expect(pickImage(["x"], ["x"])).toBe("x");
    expect(pickImage([], [])).toBeNull();
  });

  it("garde une mémoire courte et sans doublon", () => {
    expect(remember(["a", "b", "c", "d", "e", "f"], "g")).toEqual(["b", "c", "d", "e", "f", "g"]);
    expect(remember(["a", "b"], "a")).toEqual(["b", "a"]);
  });
});

describe("verdict de la grille", () => {
  it("sépare les cases justes, les cases fausses et les cases vides, sans changer la partie", () => {
    let state = createPuzzle(2, undefined, sequence([0.4, 0.6]));
    state = placePiece(placePiece(state, 0, 0), 2, 1);
    const verdict = checkBoard(state);
    expect(verdict).toEqual({ correct: [0], wrong: [1], empty: [2, 3] });
    expect(state.status).toBe("playing");
    expect(state.moves).toBe(2);
  });

  it("compte comme juste une tuile visuellement identique à celle qui revient dans la case", () => {
    const classes = [0, 1, 1, 2];
    let state = createPuzzle(2, classes, sequence([0.4, 0.6]));
    state = placePiece(placePiece(state, 2, 1), 1, 2);
    expect(checkBoard(state)).toEqual({ correct: [1, 2], wrong: [], empty: [0, 3] });
  });

  it("une grille vide n'a que des cases vides ; une grille juste n'a que des cases justes", () => {
    const state = createPuzzle(3, undefined, sequence([0.2, 0.8]));
    expect(checkBoard(state)).toEqual({ correct: [], wrong: [], empty: [0, 1, 2, 3, 4, 5, 6, 7, 8] });
    expect(checkBoard(solve(state)).correct).toHaveLength(9);
  });
});
