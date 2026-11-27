import { TILE_COLORS, type TileColor } from "./types";

/** Réglages d'un niveau. La grille ne dépasse pas 7 × 7 (téléphone). */
export interface LevelConfig {
  readonly id: number;
  readonly rows: number;
  readonly cols: number;
  /** Nombre de nombres sur le plateau (pair : ils s'apparient deux par deux). */
  readonly numberCount: number;
  /** Valeurs possibles des nombres : « tables de 1 à 5 » = [1, 5]. */
  readonly numberRange: readonly [number, number];
  /** Nombre de couleurs différentes utilisées. */
  readonly colorCount: number;
  /** Nombre de coups de la solution construite (alignements à réaliser). */
  readonly steps: number;
  /** Tuiles imagées de plus, hors des murs à ouvrir. */
  readonly leftover: number;
  /** Nombres au moins qui sont bloqués au départ. */
  readonly minBlocked: number;
  readonly pipeLength: number;
}

export const LEVELS: readonly LevelConfig[] = [
  { id: 1, rows: 5, cols: 5, numberCount: 4, numberRange: [1, 5], colorCount: 4, steps: 4, leftover: 4, minBlocked: 3, pipeLength: 5 },
  { id: 2, rows: 5, cols: 5, numberCount: 6, numberRange: [1, 5], colorCount: 4, steps: 4, leftover: 4, minBlocked: 3, pipeLength: 5 },
  { id: 3, rows: 6, cols: 6, numberCount: 6, numberRange: [1, 7], colorCount: 5, steps: 6, leftover: 4, minBlocked: 4, pipeLength: 6 },
  { id: 4, rows: 6, cols: 6, numberCount: 8, numberRange: [1, 9], colorCount: 6, steps: 7, leftover: 3, minBlocked: 4, pipeLength: 6 },
  { id: 5, rows: 7, cols: 7, numberCount: 8, numberRange: [1, 10], colorCount: 6, steps: 8, leftover: 8, minBlocked: 4, pipeLength: 7 },
];

export function levelConfig(id: number): LevelConfig {
  const level = LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Niveau inconnu : ${id}`);
  return level;
}

/** Couleurs d'un niveau : les premières de la palette, dans un ordre fixe. */
export function levelColors(level: LevelConfig): TileColor[] {
  return TILE_COLORS.slice(0, level.colorCount);
}

/** Le niveau suivant, ou null après le dernier. */
export function nextLevel(id: number): LevelConfig | null {
  return LEVELS.find((candidate) => candidate.id === id + 1) ?? null;
}
