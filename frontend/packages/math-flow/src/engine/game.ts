import { allExpressionsComplete, createBuilder, receiveNumber, stepBuilder, type BuilderState, type ExpressionEvent } from "./expression";
import { createFlow, playerSwap, tick, type FlowEvent, type FlowState } from "./flow";
import { generateLevel, type GeneratedLevel } from "./generator";
import { levelConfig, type LevelConfig } from "./levels";
import { MULTIPLICATION, type Operation } from "./operations";
import { unreachableNumbers } from "./paths";
import { solve, type Move, type SolveResult } from "./solver";
import { rescueShuffle, type RescueResult } from "./rescue";
import { createRng, type Rng } from "./rng";
import { listValidSwaps, trySwap, type SwapOutcome } from "./swap";

/** Une partie : le plateau et le transport des nombres, les opérations construites, et l'état de la partie. */
export interface GameState {
  readonly level: LevelConfig;
  readonly operation: Operation;
  readonly seed: number;
  readonly flow: FlowState;
  readonly builder: BuilderState;
  readonly totalNumbers: number;
  /** Nombre de permutations acceptées (information, jamais une pénalité). */
  readonly moves: number;
  readonly status: "playing" | "won";
  /**
   * Garde-fou contre les impasses (activé par défaut) : une permutation qui rendrait la partie sans issue est refusée, avec la
   * raison « dead-end », avant d'être appliquée (les tuiles reviennent, sans pénalité). Tant que la partie est résoluble au
   * départ, elle le reste : jamais de blocage.
   */
  readonly deadEndGuard: boolean;
}

export interface GameOptions {
  readonly operation?: Operation;
  readonly deadEndGuard?: boolean;
}

/** Budget de recherche du garde-fou : largement au-dessus de ce que demandent les niveaux prévus (voir les tests). */
const GUARD_BUDGET = 200_000;

export type GameEvent = FlowEvent | ExpressionEvent | { readonly type: "swap"; readonly a: number; readonly b: number; readonly removed: readonly number[] } | { readonly type: "won" };

export function startGame(generated: GeneratedLevel, options: GameOptions = {}): GameState {
  const operation = options.operation ?? MULTIPLICATION;
  const flow = createFlow(generated.board, { entranceRow: generated.entranceRow, pipeLength: generated.level.pipeLength });
  const totalNumbers = generated.board.cells.filter((cell) => cell?.kind === "number").length;
  return { level: generated.level, operation, seed: generated.seed, flow, builder: createBuilder(operation), totalNumbers, moves: 0, status: "playing", deadEndGuard: options.deadEndGuard ?? true };
}

/** Nouvelle partie d'un niveau : le plateau est vérifié par un rejeu complet avant d'être proposé (voir verifyGenerated). */
export function newGame(levelId: number, seed: number, options: GameOptions = {}): { state: GameState; solution: readonly Move[] } {
  const level = levelConfig(levelId);
  for (let offset = 0; offset < 50; offset += 1) {
    const generated = generateLevel(level, seed + offset * 104729);
    const state = startGame(generated, options);
    if (verifySolution(state, generated.solution).ok) return { state, solution: generated.solution };
  }
  throw new Error(`Aucun plateau vérifié pour le niveau ${levelId} (graine ${seed})`);
}

/** Un pas de temps : transport des nombres, arrivée dans le second tableau, construction des opérations. */
export function tickGame(state: GameState): { state: GameState; events: GameEvent[] } {
  const flowStep = tick(state.flow);
  const events: GameEvent[] = [...flowStep.events];
  let builder = state.builder;
  for (const event of flowStep.events) {
    if (event.type !== "delivered") continue;
    const tile = flowStep.state.delivered[event.order];
    if (!tile) continue;
    const received = receiveNumber(builder, tile);
    builder = received.state;
    events.push(...received.events);
  }
  const built = stepBuilder(builder);
  builder = built.state;
  events.push(...built.events);
  let status = state.status;
  if (status === "playing" && allExpressionsComplete(builder, state.totalNumbers)) {
    status = "won";
    events.push({ type: "won" });
  }
  return { state: { ...state, flow: flowStep.state, builder, status }, events };
}

export type GameSwapOutcome = SwapOutcome | { readonly accepted: false; readonly reason: "dead-end" };

/** Permutation du joueur, possible à tout moment. Avec le garde-fou, un coup qui bloquerait la partie est refusé (« dead-end »). */
export function swapGame(state: GameState, a: number, b: number): { state: GameState; outcome: GameSwapOutcome; events: GameEvent[] } {
  if (state.deadEndGuard) {
    const preview = trySwap(state.flow.board, a, b);
    if (preview.accepted && solve(preview.board, state.flow.entrance, GUARD_BUDGET).status === "unsolvable") return { state, outcome: { accepted: false, reason: "dead-end" }, events: [] };
  }
  const result = playerSwap(state.flow, a, b);
  if (!result.outcome.accepted) return { state, outcome: result.outcome, events: [] };
  return { state: { ...state, flow: result.state, moves: state.moves + 1 }, outcome: result.outcome, events: [{ type: "swap", a, b, removed: result.outcome.removed }] };
}

/** Mélange de secours : voir rescueShuffle. Les nombres, leurs positions et les cases libres ne bougent pas. */
export function rescueGame(state: GameState, rng: Rng = createRng(state.seed + state.moves)): { state: GameState; result: RescueResult } {
  const result = rescueShuffle(state.flow.board, state.flow.entrance, rng);
  if (!result.ok) return { state, result };
  return { state: { ...state, flow: { ...state.flow, board: result.board } }, result };
}

export type Hint = { readonly kind: "move"; readonly move: Move } | { readonly kind: "none-needed" } | { readonly kind: "unsolvable" } | { readonly kind: "unknown" };

/** Indice : le premier coup d'une séquence qui, depuis le plateau actuel, libère tous les nombres. Jamais un coup au hasard. */
export function hint(state: GameState, budget?: number): Hint {
  const result: SolveResult = solve(state.flow.board, state.flow.entrance, budget);
  if (result.status === "solvable") return { kind: "move", move: result.moves[0] as Move };
  if (result.status === "solved") return { kind: "none-needed" };
  return { kind: result.status };
}

export interface Assessment {
  /** Aucune permutation n'est possible. */
  readonly noMoves: boolean;
  /** Nombres sans chemin vers l'entrée pour l'instant. */
  readonly blocked: number;
  readonly solvability: SolveResult["status"];
}

export function assess(state: GameState, budget?: number): Assessment {
  const board = state.flow.board;
  return { noMoves: listValidSwaps(board).length === 0, blocked: unreachableNumbers(board, state.flow.entrance).length, solvability: solve(board, state.flow.entrance, budget).status };
}

export type ReplaySchedule =
  /** Tous les coups d'abord, puis le transport. */
  | "deferred"
  /** Deux pas de temps entre deux coups : le joueur joue pendant que les nombres se déplacent. */
  | "interleaved"
  /** Le transport se termine entièrement avant chaque coup. */
  | "patient";

export interface ReplayReport {
  readonly ok: boolean;
  readonly reason?: string;
  readonly ticks: number;
  /** Nombres dans leur ordre d'arrivée au second tableau. */
  readonly arrivals: readonly number[];
  /** Opérations affichées à la fin, par exemple « 3 × 4 = 12 ». */
  readonly expressions: readonly string[];
}

const QUIET_LIMIT = 2000;

function runUntilQuiet(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < QUIET_LIMIT; i += 1) {
    const step = tickGame(current);
    current = step.state;
    if (step.events.length === 0) break;
  }
  return current;
}

/**
 * Rejeu complet d'une séquence de coups dans le vrai moteur (permutations, déplacements, tuyau, opérations). La séquence est
 * valide si chaque coup est accepté et si, à la fin, tous les nombres ont été livrés, appariés dans leur ordre d'arrivée, et
 * toutes les opérations affichées avec le bon résultat, recalculé ici indépendamment.
 */
export function verifySolution(start: GameState, moves: readonly Move[], schedule: ReplaySchedule = "interleaved"): ReplayReport {
  let state = start;
  let ticks = 0;
  const fail = (reason: string): ReplayReport => ({ ok: false, reason, ticks, arrivals: state.flow.delivered.map((tile) => tile.value), expressions: describe(state) });
  for (const [index, [a, b]] of moves.entries()) {
    const played = swapGame(state, a, b);
    if (!played.outcome.accepted) return fail(`coup ${index + 1} refusé (${played.outcome.reason})`);
    state = played.state;
    if (schedule === "interleaved") {
      for (let i = 0; i < 2; i += 1) {
        state = tickGame(state).state;
        ticks += 1;
      }
    } else if (schedule === "patient") {
      const before = state.flow.ticks;
      state = runUntilQuiet(state);
      ticks += state.flow.ticks - before;
    }
  }
  const before = state.flow.ticks;
  state = runUntilQuiet(state);
  ticks += state.flow.ticks - before;

  if (unreachableNumbers(state.flow.board, state.flow.entrance).length > 0) return fail("des nombres restent enfermés");
  if (state.flow.delivered.length !== state.totalNumbers) return fail(`${state.flow.delivered.length} nombres livrés sur ${state.totalNumbers}`);
  if (state.status !== "won") return fail("opérations incomplètes");
  const arrivals = state.flow.delivered.map((tile) => tile.value);
  for (const [index, expression] of state.builder.expressions.entries()) {
    const first = arrivals[2 * index] as number;
    const second = arrivals[2 * index + 1] as number;
    const [x, y] = state.operation.arrange(first, second);
    if (expression.operands?.[0] !== x || expression.operands?.[1] !== y) return fail(`opération ${index + 1} : opérandes hors ordre d'arrivée`);
    if (expression.result !== state.operation.compute(x, y)) return fail(`opération ${index + 1} : résultat incorrect`);
  }
  return { ok: true, ticks, arrivals, expressions: describe(state) };
}

function describe(state: GameState): string[] {
  return state.builder.expressions.map((expression) => (expression.operands ? `${expression.operands[0]} ${state.operation.symbol} ${expression.operands[1]}${expression.result === null ? "" : ` = ${expression.result}`}` : `${expression.a.value}`));
}
