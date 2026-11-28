import type { NumberTile } from "./types";

/** Longueur par défaut du tuyau, en emplacements. */
export const DEFAULT_PIPE_LENGTH = 6;

/**
 * Le tuyau unique : une file d'emplacements numérotés de l'entrée (0) à la sortie (longueur − 1). Il ne transporte qu'un seul
 * nombre à la fois : tant qu'un nombre est dans le tuyau, les suivants attendent à l'entrée, sur le plateau. Le nombre avance
 * d'un emplacement par pas ; le suivant peut entrer au pas même où le précédent sort.
 */
export interface Pipe {
  readonly slots: readonly (NumberTile | null)[];
}

export interface PipeAdvance {
  readonly pipe: Pipe;
  /** Nombre qui sort du tuyau à ce pas, vers le second tableau. */
  readonly exiting: NumberTile | null;
  /** Nombres restés dans le tuyau et l'emplacement qu'ils atteignent. */
  readonly advanced: ReadonlyArray<{ readonly tile: NumberTile; readonly slot: number }>;
}

export function createPipe(length: number = DEFAULT_PIPE_LENGTH): Pipe {
  if (!Number.isInteger(length) || length < 1) throw new Error(`Longueur de tuyau invalide : ${length}`);
  return { slots: Array<NumberTile | null>(length).fill(null) };
}

/** Le tuyau est vide : un nombre peut y entrer. Jamais deux nombres en même temps. */
export function canEnter(pipe: Pipe): boolean {
  return pipe.slots.every((slot) => slot === null);
}

export function enterPipe(pipe: Pipe, tile: NumberTile): Pipe {
  if (!canEnter(pipe)) throw new Error("Le tuyau transporte déjà un nombre");
  return { slots: [tile, ...pipe.slots.slice(1)] };
}

/** Un pas de transport : chaque nombre avance d'un emplacement, celui de la sortie quitte le tuyau. */
export function advancePipe(pipe: Pipe): PipeAdvance {
  const length = pipe.slots.length;
  const exiting = pipe.slots[length - 1] ?? null;
  const slots: (NumberTile | null)[] = Array<NumberTile | null>(length).fill(null);
  const advanced: Array<{ tile: NumberTile; slot: number }> = [];
  for (let slot = 0; slot < length - 1; slot += 1) {
    const tile = pipe.slots[slot];
    if (!tile) continue;
    slots[slot + 1] = tile;
    advanced.push({ tile, slot: slot + 1 });
  }
  return { pipe: { slots }, exiting, advanced };
}

export function pipeContents(pipe: Pipe): NumberTile[] {
  return pipe.slots.filter((tile): tile is NumberTile => tile !== null);
}
