import { entranceCell } from "./paths";
import { stepNumbers, takeFromEntrance } from "./movement";
import { advancePipe, canEnter, createPipe, DEFAULT_PIPE_LENGTH, enterPipe, type Pipe } from "./pipe";
import { trySwap, type SwapOutcome } from "./swap";
import type { Board, NumberTile } from "./types";

export interface FlowConfig {
  /** Ligne du plateau où débouche le tuyau (sur la dernière colonne). */
  readonly entranceRow: number;
  readonly pipeLength: number;
}

/** État du transport des nombres : le plateau, le tuyau, et les nombres déjà livrés, dans leur ordre d'arrivée. */
export interface FlowState {
  readonly board: Board;
  readonly config: FlowConfig;
  readonly entrance: number;
  readonly pipe: Pipe;
  readonly delivered: readonly NumberTile[];
  readonly ticks: number;
}

export type FlowEvent =
  | { readonly type: "pipe-advanced"; readonly id: number; readonly slot: number }
  | { readonly type: "delivered"; readonly id: number; readonly value: number; readonly order: number }
  | { readonly type: "entered-pipe"; readonly id: number; readonly value: number }
  | { readonly type: "moved"; readonly id: number; readonly from: number; readonly to: number };

export function createFlow(board: Board, config: Partial<FlowConfig> = {}): FlowState {
  const resolved: FlowConfig = { entranceRow: config.entranceRow ?? Math.floor(board.rows / 2), pipeLength: config.pipeLength ?? DEFAULT_PIPE_LENGTH };
  return { board, config: resolved, entrance: entranceCell(board, resolved.entranceRow), pipe: createPipe(resolved.pipeLength), delivered: [], ticks: 0 };
}

/**
 * Un pas de temps, toujours dans le même ordre : le tuyau avance (un nombre peut en sortir), le nombre posé sur la case d'entrée
 * entre dans le tuyau si celui-ci est vide (un seul nombre à la fois ; les autres attendent à l'entrée), puis tous les autres nombres avancent d'une case. Sans événement,
 * l'état n'a pas changé : le transport est au repos (tant que le joueur ne joue pas).
 */
export function tick(state: FlowState): { state: FlowState; events: FlowEvent[] } {
  const events: FlowEvent[] = [];
  const advance = advancePipe(state.pipe);
  let pipe = advance.pipe;
  for (const { tile, slot } of advance.advanced) events.push({ type: "pipe-advanced", id: tile.id, slot });
  let delivered = state.delivered;
  if (advance.exiting) {
    events.push({ type: "delivered", id: advance.exiting.id, value: advance.exiting.value, order: delivered.length });
    delivered = [...delivered, advance.exiting];
  }

  let board = state.board;
  if (canEnter(pipe)) {
    const taken = takeFromEntrance(board, state.entrance);
    if (taken.tile) {
      board = taken.board;
      pipe = enterPipe(pipe, taken.tile);
      events.push({ type: "entered-pipe", id: taken.tile.id, value: taken.tile.value });
    }
  }

  const stepped = stepNumbers(board, state.entrance);
  board = stepped.board;
  for (const move of stepped.moves) events.push({ type: "moved", ...move });

  return { state: { ...state, board, pipe, delivered, ticks: state.ticks + 1 }, events };
}

/**
 * Permutation du joueur, à tout moment, même pendant que des nombres se déplacent ou traversent le tuyau : elle ne touche
 * jamais une case occupée par un nombre, et ne fait que libérer des cases.
 */
export function playerSwap(state: FlowState, a: number, b: number): { state: FlowState; outcome: SwapOutcome } {
  const outcome = trySwap(state.board, a, b);
  return { state: outcome.accepted ? { ...state, board: outcome.board } : state, outcome };
}

/** Nombres encore sur le plateau ou dans le tuyau. */
export function numbersInTransit(state: FlowState): number {
  return state.board.cells.filter((cell) => cell?.kind === "number").length + state.pipe.slots.filter(Boolean).length;
}
