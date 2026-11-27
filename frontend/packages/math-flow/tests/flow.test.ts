import { describe, expect, it } from "vitest";

import { areAdjacent, cellAt } from "../src/engine/board";
import { createFlow, numbersInTransit, playerSwap, tick, type FlowEvent, type FlowState } from "../src/engine/flow";
import { unreachableNumbers } from "../src/engine/paths";
import { layout, render, seeded } from "./helpers";

function run(state: FlowState, maxTicks = 200): { state: FlowState; log: Array<{ tick: number; events: FlowEvent[] }> } {
  const log: Array<{ tick: number; events: FlowEvent[] }> = [];
  let current = state;
  for (let i = 0; i < maxTicks; i += 1) {
    const step = tick(current);
    current = step.state;
    if (step.events.length === 0) break;
    log.push({ tick: current.ticks, events: step.events });
  }
  return { state: current, log };
}
const kinds = (log: ReturnType<typeof run>["log"], type: FlowEvent["type"]) => log.flatMap((entry) => entry.events.filter((event) => event.type === type).map((event) => ({ tick: entry.tick, event })));

describe("déplacement d'un nombre", () => {
  const board = layout([". . . . .", "4 . . . .", ". . . . ."]);

  it("avance d'une case par pas, de case voisine en case voisine, jusqu'à l'entrée", () => {
    const { log } = run(createFlow(board, { entranceRow: 1, pipeLength: 3 }));
    const moves = kinds(log, "moved").map(({ event }) => event);
    expect(moves.map((move) => (move.type === "moved" ? [move.from, move.to] : []))).toEqual([
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
    ]);
    expect(kinds(log, "moved").map(({ tick: t }) => t)).toEqual([1, 2, 3, 4]);
  });

  it("entre dans le tuyau, le traverse sans téléportation, et sort après sa longueur", () => {
    const { state, log } = run(createFlow(board, { entranceRow: 1, pipeLength: 3 }));
    expect(kinds(log, "entered-pipe").map(({ tick: t }) => t)).toEqual([5]);
    expect(kinds(log, "pipe-advanced").map(({ tick: t, event }) => [t, event.type === "pipe-advanced" ? event.slot : -1])).toEqual([
      [6, 1],
      [7, 2],
    ]);
    expect(kinds(log, "delivered").map(({ tick: t }) => t)).toEqual([8]);
    expect(state.delivered.map((tile) => tile.value)).toEqual([4]);
    expect(numbersInTransit(state)).toBe(0);
    expect(render(state.board)).toEqual([". . . . .", ". . . . .", ". . . . ."]);
  });
});

describe("collisions et file", () => {
  it("fait suivre deux nombres dans un couloir sans qu'ils se partagent une case", () => {
    const board = layout(["3 4 . . ."]);
    let state = createFlow(board, { entranceRow: 0, pipeLength: 2 });
    for (let i = 0; i < 12; i += 1) {
      state = tick(state).state;
      const positions = state.board.cells.flatMap((cell, index) => (cell ? [index] : []));
      expect(new Set(positions).size).toBe(positions.length);
    }
    expect(state.delivered.map((tile) => tile.value)).toEqual([4, 3]);
  });

  it("livre dans l'ordre de passage à l'entrée : le plus proche d'abord", () => {
    const board = layout(["1 . . 2 .", ". . . . .", ". . . . ."]);
    const { state } = run(createFlow(board, { entranceRow: 0, pipeLength: 2 }));
    expect(state.delivered.map((tile) => tile.value)).toEqual([2, 1]);
  });

  it("à distance égale, le plus petit identifiant passe en premier", () => {
    const board = layout([". 5 .", ". . .", ". 6 ."]);
    const { state } = run(createFlow(board, { entranceRow: 1, pipeLength: 2 }));
    expect(state.delivered.map((tile) => tile.value)).toEqual([5, 6]);
  });

  it("ne met jamais plus d'un nombre dans le tuyau : les autres attendent à l'entrée, un livré tous les pipeLength pas", () => {
    const board = layout([". . . . .", "1 2 3 4 ."]);
    let state = createFlow(board, { entranceRow: 1, pipeLength: 4 });
    const deliveries: number[] = [];
    for (let i = 0; i < 60; i += 1) {
      const step = tick(state);
      state = step.state;
      expect(state.pipe.slots.filter(Boolean).length).toBeLessThanOrEqual(1);
      for (const event of step.events) if (event.type === "delivered") deliveries.push(state.ticks);
    }
    expect(state.delivered.map((tile) => tile.value)).toEqual([4, 3, 2, 1]);
    expect(deliveries).toHaveLength(4);
    for (let i = 1; i < deliveries.length; i += 1) expect(deliveries[i]! - deliveries[i - 1]!).toBe(4);
  });

  it("garde les suivants sur le plateau, dans la file, tant que le tuyau est occupé", () => {
    const board = layout([". . . . .", "1 2 3 4 ."]);
    let state = createFlow(board, { entranceRow: 1, pipeLength: 6 });
    for (let i = 0; i < 5; i += 1) state = tick(state).state;
    expect(state.pipe.slots.filter(Boolean)).toHaveLength(1);
    expect(state.board.cells.filter((cell) => cell?.kind === "number")).toHaveLength(3);
    expect(state.delivered).toHaveLength(0);
  });

  it("attend sans bloquer le jeu quand la case d'entrée est fermée par une tuile imagée", () => {
    const board = layout(["4 . . R"]);
    const { state, log } = run(createFlow(board, { entranceRow: 0, pipeLength: 2 }));
    expect(log).toEqual([]);
    expect(state.delivered).toEqual([]);
    expect(unreachableNumbers(state.board, state.entrance)).toEqual([0]);
  });

  it("n'avance jamais à travers une tuile imagée", () => {
    const board = layout(["4 R . .", ". R . .", ". . . ."]);
    let state = createFlow(board, { entranceRow: 0, pipeLength: 2 });
    for (let i = 0; i < 20; i += 1) {
      const before = state.board;
      const step = tick(state);
      for (const event of step.events) {
        if (event.type !== "moved") continue;
        expect(areAdjacent(before, event.from, event.to)).toBe(true);
        expect(cellAt(before, event.to)).toBeNull();
      }
      state = step.state;
    }
    expect(state.delivered.map((tile) => tile.value)).toEqual([4]);
    expect(state.board.cells[1]?.kind).toBe("image");
    expect(state.board.cells[5]?.kind).toBe("image");
  });
});

describe("le joueur continue de jouer", () => {
  it("permute pendant que des nombres se déplacent, sans perturber leur trajet", () => {
    const board = layout(["4 . . . .", ". . . . .", "R R Y . .", "Y G R . ."]);
    let state = createFlow(board, { entranceRow: 0, pipeLength: 3 });
    state = tick(state).state;
    state = tick(state).state;
    const numberBefore = state.board.cells.findIndex((cell) => cell?.kind === "number");
    expect(numberBefore).toBe(2);
    const swapped = playerSwap(state, 12, 17);
    expect(swapped.outcome.accepted).toBe(true);
    expect(swapped.state.board.cells[numberBefore]?.kind).toBe("number");
    expect(render(swapped.state.board)).toEqual([". . 4 . .", ". . . . .", ". . . . .", "Y G Y . ."]);
    const { state: finished } = run(swapped.state);
    expect(finished.delivered.map((tile) => tile.value)).toEqual([4]);
  });

  it("libère un nombre bloqué : un alignement ouvre le mur, et il repart au pas suivant", () => {
    const blocked = layout(["4 R . .", "R R Y .", "S Y R ."]);
    const state = createFlow(blocked, { entranceRow: 0, pipeLength: 2 });
    expect(unreachableNumbers(state.board, state.entrance)).toEqual([0]);
    expect(run(state).log).toEqual([]);
    // Le joueur permute Y et R : trois R en colonne 1 disparaissent et ouvrent la ligne du haut.
    const result = playerSwap(state, 9, 10);
    expect(result.outcome.accepted).toBe(true);
    expect(unreachableNumbers(result.state.board, result.state.entrance)).toEqual([]);
    const next = tick(result.state);
    expect(next.events).toEqual([{ type: "moved", id: 1, from: 0, to: 1 }]);
    const { state: finished } = run(result.state);
    expect(finished.delivered.map((tile) => tile.value)).toEqual([4]);
  });

  it("une permutation refusée ne change rien", () => {
    const state = createFlow(layout(["4 . . . .", "R Y P B S"]), { entranceRow: 0, pipeLength: 2 });
    const result = playerSwap(state, 5, 6);
    expect(result.outcome.accepted).toBe(false);
    expect(result.state).toBe(state);
  });
});

describe("conservation sur des plateaux aléatoires", () => {
  const SYMBOLS = ["R", "Y", "O", "G", "P", "B", "S"];
  function randomLayout(seed: number): string[] {
    const rng = seeded(seed);
    const rows = 5;
    const cols = 5;
    const grid = Array.from({ length: rows }, () => Array<string>(cols).fill("."));
    let numbers = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols - 1; c += 1) {
        const roll = rng();
        if (roll < 0.15 && numbers < 6) {
          grid[r]![c] = String(1 + Math.floor(rng() * 5));
          numbers += 1;
        } else if (roll < 0.55) grid[r]![c] = SYMBOLS[Math.floor(rng() * SYMBOLS.length)]!;
      }
    }
    return grid.map((row) => row.join(" "));
  }

  it("sur 200 plateaux : aucun nombre perdu ni dupliqué, jamais deux sur la même case, pas de saut", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rng = seeded(seed * 7);
      let state = createFlow(layout(randomLayout(seed)), { entranceRow: Math.floor(rng() * 5), pipeLength: 1 + Math.floor(rng() * 5) });
      const total = numbersInTransit(state);
      const ids = new Set(state.board.cells.flatMap((cell) => (cell?.kind === "number" ? [cell.id] : [])));
      for (let i = 0; i < 80; i += 1) {
        const before = state.board;
        const step = tick(state);
        for (const event of step.events) {
          if (event.type !== "moved") continue;
          expect(areAdjacent(before, event.from, event.to)).toBe(true);
        }
        state = step.state;
        // Le joueur tente parfois un coup pendant le transport.
        const a = Math.floor(rng() * 25);
        const b = rng() < 0.5 ? a + 1 : a + 5;
        if (b < 25) state = playerSwap(state, a, b).state;
        const onBoard = state.board.cells.flatMap((cell) => (cell?.kind === "number" ? [cell.id] : []));
        const inPipe = state.pipe.slots.flatMap((tile) => (tile ? [tile.id] : []));
        const done = state.delivered.map((tile) => tile.id);
        const everyone = [...onBoard, ...inPipe, ...done];
        expect(everyone).toHaveLength(total);
        expect(new Set(everyone)).toEqual(ids);
      }
    }
  });

  it("sur 200 plateaux : tout nombre joignable finit livré, une seule fois, dans l'ordre de sortie du tuyau", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const start = createFlow(layout(randomLayout(seed + 1000)), { entranceRow: seed % 5, pipeLength: 1 + (seed % 4) });
      const stuck = unreachableNumbers(start.board, start.entrance).length;
      const total = numbersInTransit(start);
      const { state } = run(start, 300);
      expect(state.delivered).toHaveLength(total - stuck);
      expect(new Set(state.delivered.map((tile) => tile.id)).size).toBe(state.delivered.length);
      expect(unreachableNumbers(state.board, state.entrance)).toHaveLength(stuck);
    }
  });
});
