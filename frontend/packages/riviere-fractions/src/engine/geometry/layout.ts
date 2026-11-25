import { clamp, fbm, smoothstep } from "./noise";

// Tracé du niveau 1, en TypeScript pur. La rivière est décrite en coordonnées de rivière : s, la distance le long du
// tracé depuis le ponton de départ, et d, l'écart au centre du chenal (positif vers la droite du bateau). Le même
// tracé sert à dessiner l'eau, le terrain et les décors, à guider le bateau, et à dire dans quelle voie il passe.

export type Lane = 0 | 1 | 2;

/** Un embranchement : un bief calme où la question apparaît, l'élargissement, les trois voies, puis la réunion. */
export interface ForkLayout {
  index: number;
  reachStart: number;
  approachStart: number;
  /** Pointe des îlots : la ligne de décision. */
  tip: number;
  islandEnd: number;
  mergeEnd: number;
  /** Portiques des panneaux, plantés sur la pointe des îlots, juste après la ligne de décision. */
  gate: number;
  /** Barrage qui se lève dans une mauvaise voie. */
  barrier: number;
}

export interface RiverPoint {
  x: number;
  z: number;
  /** Cap : 0 vers +z, positif en tournant vers +x. */
  heading: number;
}

export const LANE_CENTERS: readonly [number, number, number] = [-14, 0, 14];
/** Demi-largeur du chenal dans un bief, et devant les trois voies. */
export const REACH_HALF_WIDTH = 9;
export const FORK_HALF_WIDTH = 20;
/** Îlots entre les voies : centrés à ±7, demi-largeur 2,5. */
export const ISLAND_CENTER = 7;
export const ISLAND_HALF_WIDTH = 2.5;
/** Demi-largeur d'une voie, d'un îlot à l'autre. */
export const LANE_HALF_WIDTH = 4.5;
/** Étendue du terrain de part et d'autre du centre ; au-delà, la plaine et les montagnes. */
export const TERRAIN_HALF_WIDTH = 46;

const START_LENGTH = 60;
const REACH = 70;
const APPROACH = 35;
const ISLANDS = 45;
const MERGE = 25;
const FINISH_LENGTH = 150;
const WIDEN = 25;
const TAPER = 8;
/** Cap du chenal devant chaque embranchement : la rivière serpente entre deux virages doux. */
const FORK_HEADINGS = [0.32, -0.2, 0.28, -0.32, 0.18, -0.24, 0.12];
const SAMPLE_STEP = 0.5;

export const BLOCK_LENGTH = REACH + APPROACH + ISLANDS + MERGE;

export interface Village {
  start: number;
  end: number;
  side: -1 | 1;
}

export interface RiverLayout {
  length: number;
  start: number;
  /** Ponton d'arrivée. */
  finish: number;
  forks: readonly ForkLayout[];
  villages: readonly Village[];
  /** Ponts au-dessus du chenal (abscisses s). */
  bridges: readonly number[];
  pointAt(s: number): RiverPoint;
  toWorld(s: number, d: number): { x: number; z: number };
  halfWidth(s: number): number;
  /** Demi-largeur de l'îlot (gauche ou droite, ils sont symétriques) à l'abscisse s ; 0 hors des embranchements. */
  islandHalfWidth(s: number): number;
  /** Embranchement dont la zone contient s, s'il y en a un. */
  forkAt(s: number): ForkLayout | null;
}

function buildForks(): ForkLayout[] {
  return FORK_HEADINGS.map((_, index) => {
    const reachStart = START_LENGTH + index * BLOCK_LENGTH;
    const approachStart = reachStart + REACH;
    const tip = approachStart + APPROACH;
    const islandEnd = tip + ISLANDS;
    return { index, reachStart, approachStart, tip, islandEnd, mergeEnd: islandEnd + MERGE, gate: tip + 4, barrier: tip + 30 };
  });
}

function headingAt(s: number, forks: readonly ForkLayout[]): number {
  let previous = 0;
  for (const fork of forks) {
    const target = FORK_HEADINGS[fork.index];
    if (s < fork.reachStart) return previous;
    if (s < fork.approachStart) {
      const u = (s - fork.reachStart) / REACH;
      return previous + (target - previous) * (1 - Math.cos(Math.PI * u)) * 0.5;
    }
    previous = target;
  }
  return previous;
}

/** Courbure maximale du tracé (1/rayon), pour vérifier qu'aucun virage n'est impossible. */
export function maxCurvature(layout: RiverLayout, step = 1): number {
  let worst = 0;
  for (let s = step; s < layout.length - step; s += step) {
    const turn = Math.abs(layout.pointAt(s + step).heading - layout.pointAt(s - step).heading) / (2 * step);
    worst = Math.max(worst, turn);
  }
  return worst;
}

export function createLevelOneLayout(): RiverLayout {
  const forks = buildForks();
  const last = forks[forks.length - 1];
  const finishStart = last.mergeEnd;
  const length = finishStart + FINISH_LENGTH;
  const finish = length - 28;

  const count = Math.ceil(length / SAMPLE_STEP) + 2;
  const xs = new Float64Array(count);
  const zs = new Float64Array(count);
  const hs = new Float64Array(count);
  for (let i = 1; i < count; i += 1) {
    const mid = (i - 0.5) * SAMPLE_STEP;
    const heading = headingAt(mid, forks);
    xs[i] = xs[i - 1] + Math.sin(heading) * SAMPLE_STEP;
    zs[i] = zs[i - 1] + Math.cos(heading) * SAMPLE_STEP;
    hs[i] = headingAt(i * SAMPLE_STEP, forks);
  }

  const end = (count - 1) * SAMPLE_STEP;
  const pointAt = (s: number): RiverPoint => {
    // Avant le départ et après l'arrivée, le tracé se prolonge en ligne droite (la caméra y voit encore de l'eau).
    if (s < 0) return { x: Math.sin(hs[0]) * s, z: Math.cos(hs[0]) * s, heading: hs[0] };
    if (s > end) {
      const h = hs[count - 1];
      return { x: xs[count - 1] + Math.sin(h) * (s - end), z: zs[count - 1] + Math.cos(h) * (s - end), heading: h };
    }
    const t = clamp(s, 0, end) / SAMPLE_STEP;
    const i = Math.min(count - 2, Math.floor(t));
    const f = t - i;
    return { x: xs[i] + (xs[i + 1] - xs[i]) * f, z: zs[i] + (zs[i + 1] - zs[i]) * f, heading: hs[i] + (hs[i + 1] - hs[i]) * f };
  };

  const forkAt = (s: number): ForkLayout | null => forks.find((fork) => s >= fork.approachStart && s < fork.mergeEnd) ?? null;

  const halfWidth = (s: number): number => {
    const fork = forkAt(s);
    let width = REACH_HALF_WIDTH;
    if (fork) {
      const open = smoothstep(fork.approachStart, fork.approachStart + WIDEN, s);
      const close = 1 - smoothstep(fork.islandEnd, fork.islandEnd + MERGE - 5, s);
      width = REACH_HALF_WIDTH + (FORK_HALF_WIDTH - REACH_HALF_WIDTH) * Math.min(open, close);
    }
    // Port d'arrivée : le chenal s'ouvre en bassin.
    width += 15 * smoothstep(finishStart + 40, finishStart + 90, s);
    // Départ : un petit bassin autour du ponton.
    width += 3 * (1 - smoothstep(10, 45, s));
    return width;
  };

  const islandHalfWidth = (s: number): number => {
    const fork = forkAt(s);
    if (!fork || s < fork.tip || s > fork.islandEnd) return 0;
    return ISLAND_HALF_WIDTH * Math.min(smoothstep(fork.tip, fork.tip + TAPER, s), 1 - smoothstep(fork.islandEnd - TAPER, fork.islandEnd, s));
  };

  const toWorld = (s: number, d: number) => {
    const p = pointAt(s);
    return { x: p.x + Math.cos(p.heading) * d, z: p.z - Math.sin(p.heading) * d };
  };

  const villages: Village[] = [
    { start: 12, end: 52, side: -1 },
    { start: forks[1].reachStart + 8, end: forks[1].reachStart + 60, side: 1 },
    { start: forks[3].reachStart + 6, end: forks[3].reachStart + 62, side: -1 },
    { start: forks[5].reachStart + 10, end: forks[5].reachStart + 60, side: 1 },
    { start: finishStart + 60, end: length - 4, side: -1 },
    { start: finishStart + 70, end: length - 8, side: 1 },
  ];

  return {
    length,
    start: 10,
    finish,
    forks,
    villages,
    bridges: [forks[0].reachStart + 30, forks[4].reachStart + 34, finishStart + 26],
    pointAt,
    toWorld,
    halfWidth,
    islandHalfWidth,
    forkAt,
  };
}

/** Voie dans laquelle se trouve un écart d au centre, au moment de franchir la ligne de décision. */
export function laneOf(d: number): Lane {
  if (d < -ISLAND_CENTER) return 0;
  if (d > ISLAND_CENTER) return 2;
  return 1;
}

/** Distance (positive) au bord d'eau le plus proche : berge ou îlot. Négative hors de l'eau. */
export function shoreDistance(layout: RiverLayout, s: number, d: number): number {
  const toBank = layout.halfWidth(s) - Math.abs(d);
  const island = layout.islandHalfWidth(s);
  if (island <= 0) return toBank;
  const toIsland = Math.abs(Math.abs(d) - ISLAND_CENTER) - island * 0.75;
  return Math.min(toBank, toIsland);
}

/**
 * Altitude du terrain (l'eau est à 0) : lit de la rivière sous l'eau, berges en pente douce, collines, puis la plaine.
 * Continue partout, îlots compris : aucune fente entre la terre et l'eau aux embranchements.
 */
export function terrainHeight(layout: RiverLayout, s: number, d: number): number {
  const width = layout.halfWidth(s);
  const edge = Math.abs(d) - width;
  let height: number;
  if (edge < 0) {
    height = -(0.28 + 1.8 * smoothstep(0, width * 0.75, -edge));
  } else {
    const hills = 5.5 * fbm(s * 0.018, d * 0.05, 3, 7) * smoothstep(3, 16, edge);
    const plainBlend = smoothstep(TERRAIN_HALF_WIDTH - 12, TERRAIN_HALF_WIDTH, Math.abs(d));
    const bank = -0.28 + 0.7 * smoothstep(0, 1.4, edge) + 0.12 * Math.min(edge, 12) + hills;
    height = bank * (1 - plainBlend) + 1.3 * plainBlend;
  }
  const island = layout.islandHalfWidth(s);
  if (island > 0.05) {
    const off = Math.abs(Math.abs(d) - ISLAND_CENTER) / island;
    height = Math.max(height, 0.75 - 1.35 * off * off);
  }
  return height;
}
