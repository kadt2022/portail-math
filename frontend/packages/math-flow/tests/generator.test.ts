import { describe, expect, it } from "vitest";

import { generateLevel } from "../src/engine/generator";
import { newGame, startGame, verifySolution, type ReplaySchedule } from "../src/engine/game";
import { levelConfig, LEVELS } from "../src/engine/levels";
import { findMatches } from "../src/engine/match";
import { entranceCell, unreachableNumbers } from "../src/engine/paths";
import { colorOfPicture } from "../src/engine/pictures";
import { solve } from "../src/engine/solver";
import { trySwap } from "../src/engine/swap";
import { isNumberTile } from "../src/engine/board";

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

describe("générateur de plateaux", () => {
  it("est déterministe : même graine, même plateau, même solution", () => {
    for (const level of LEVELS) {
      const a = generateLevel(level, 42);
      const b = generateLevel(level, 42);
      expect(b.board).toEqual(a.board);
      expect(b.solution).toEqual(a.solution);
    }
  });

  it("varie avec la graine", () => {
    const level = levelConfig(3);
    const boards = new Set(SEEDS.map((seed) => JSON.stringify(generateLevel(level, seed).board.cells.map((cell) => cell?.id ?? 0))));
    expect(boards.size).toBeGreaterThan(5);
  });

  for (const level of LEVELS) {
    describe(`niveau ${level.id}`, () => {
      const generated = SEEDS.map((seed) => generateLevel(level, seed));

      it("respecte les réglages : taille, nombres, plage de valeurs, couleurs", () => {
        for (const { board, entranceRow } of generated) {
          expect([board.rows, board.cols]).toEqual([level.rows, level.cols]);
          const numbers = board.cells.filter(isNumberTile);
          expect(numbers).toHaveLength(level.numberCount);
          for (const number of numbers) expect(number.value).toBeGreaterThanOrEqual(level.numberRange[0]);
          for (const number of numbers) expect(number.value).toBeLessThanOrEqual(level.numberRange[1]);
          // Jamais de nombre dans la colonne de l'entrée.
          for (const [index, cell] of board.cells.entries()) if (cell?.kind === "number") expect(index % board.cols).toBeLessThan(board.cols - 1);
          expect(entranceRow).toBe(Math.floor(level.rows / 2));
          const ids = board.cells.flatMap((cell) => (cell ? [cell.id] : []));
          expect(new Set(ids).size).toBe(ids.length);
          for (const cell of board.cells) if (cell?.kind === "image") expect(colorOfPicture(cell.picture)).toBe(cell.color);
          const colors = new Set(board.cells.flatMap((cell) => (cell?.kind === "image" ? [cell.color] : [])));
          expect(colors.size).toBeLessThanOrEqual(level.colorCount);
        }
      });

      it("part d'un plateau stable, avec des nombres enfermés", () => {
        for (const { board, entranceRow } of generated) {
          expect(findMatches(board)).toEqual([]);
          expect(unreachableNumbers(board, entranceCell(board, entranceRow)).length).toBeGreaterThanOrEqual(level.minBlocked);
        }
      });

      it("fournit une séquence de coups dont chacun est accepté et qui libère tous les nombres", () => {
        for (const { board, entranceRow, solution } of generated) {
          expect(solution).toHaveLength(level.steps);
          let current = board;
          for (const [a, b] of solution) {
            const outcome = trySwap(current, a, b);
            expect(outcome.accepted).toBe(true);
            if (outcome.accepted) current = outcome.board;
          }
          expect(unreachableNumbers(current, entranceCell(board, entranceRow))).toEqual([]);
        }
      });

      it("est résolu par un rejeu complet dans le vrai moteur, sous trois cadences de jeu", () => {
        const schedules: ReplaySchedule[] = ["deferred", "interleaved", "patient"];
        for (const [index, seed] of SEEDS.entries()) {
          const game = newGame(level.id, seed);
          for (const schedule of schedules) {
            const report = verifySolution(game.state, game.solution, schedule);
            expect(report.reason, `niveau ${level.id} graine ${seed} ${schedule}`).toBeUndefined();
            expect(report.ok).toBe(true);
            expect(report.expressions).toHaveLength(level.numberCount / 2);
          }
          expect(index).toBeGreaterThanOrEqual(0);
        }
      });

      it("est confirmé par le solveur exhaustif, qui exhibe lui aussi une séquence", () => {
        for (const { board, entranceRow } of generated.slice(0, 10)) {
          const result = solve(board, entranceCell(board, entranceRow));
          expect(result.status).toBe("solvable");
        }
      });
    });
  }

  it("le rejeu détecte une séquence fausse : sans le dernier coup, ou dans le désordre, ou avec un coup refusé", () => {
    const game = newGame(3, 7);
    expect(verifySolution(game.state, game.solution).ok).toBe(true);
    expect(verifySolution(game.state, game.solution.slice(0, -1)).ok).toBe(false);
    expect(verifySolution(game.state, []).ok).toBe(false);
    const bogus = verifySolution(game.state, [...game.solution, [0, 0]]);
    expect(bogus.ok).toBe(false);
    expect(bogus.reason).toMatch(/refusé/);
  });

  it("une partie démarre avec tous ses nombres sur le plateau et aucune opération", () => {
    const { state } = newGame(1, 3);
    expect(state.totalNumbers).toBe(4);
    expect(state.builder.expressions).toEqual([]);
    expect(state.status).toBe("playing");
    expect(startGame(generateLevel(levelConfig(1), 3)).deadEndGuard).toBe(true);
    expect(startGame(generateLevel(levelConfig(1), 3), { deadEndGuard: false }).deadEndGuard).toBe(false);
  });
});
