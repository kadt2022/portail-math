import { addShape, emptyMesh, mixColor, type Color, type MeshData } from "./kit";
import { shoreDistance, terrainHeight, TERRAIN_HALF_WIDTH, type RiverLayout } from "./layout";
import { fbm, smoothstep, valueNoise } from "./noise";

// Terrain, eau et plaine, calculés par morceaux le long du tracé. Le terrain et l'eau partagent les mêmes coordonnées
// de rivière : les berges, les îlots et les embranchements se raccordent sans couture.

/** Écarts d (m) des colonnes du terrain : serrées près de l'eau, plus lâches vers les collines. */
export const TERRAIN_COLUMNS: readonly number[] = (() => {
  const columns: number[] = [];
  for (let d = -TERRAIN_HALF_WIDTH; d < -24; d += 2.75) columns.push(d);
  for (let d = -24; d <= 24; d += 1) columns.push(d);
  for (let d = 24 + 2.75; d < TERRAIN_HALF_WIDTH; d += 2.75) columns.push(d);
  columns.push(TERRAIN_HALF_WIDTH);
  return columns;
})();

const TERRAIN_ROW_STEP = 2;
const WATER_ROW_STEP = 1.5;
const WATER_COLUMNS = 15;
/** L'eau déborde un peu sous les berges : aucune fente au bord. */
const WATER_OVERLAP = 1.8;
const SKIRT_DEPTH = -7;

const COLORS = {
  sandShallow: [0.66, 0.6, 0.42] as Color,
  bedDeep: [0.2, 0.3, 0.26] as Color,
  mud: [0.5, 0.42, 0.29] as Color,
  grass: [0.27, 0.5, 0.18] as Color,
  grassLight: [0.42, 0.62, 0.22] as Color,
  forest: [0.15, 0.33, 0.12] as Color,
  earth: [0.6, 0.49, 0.33] as Color,
};

function inVillage(layout: RiverLayout, s: number, d: number): boolean {
  return layout.villages.some((village) => s > village.start - 4 && s < village.end + 4 && Math.sign(d) === village.side);
}

export function terrainColor(layout: RiverLayout, s: number, d: number, height: number): Color {
  if (height < -0.05) {
    return mixColor(COLORS.sandShallow, COLORS.bedDeep, smoothstep(0.1, 1.6, -height));
  }
  if (height < 0.32) return mixColor(COLORS.mud, COLORS.sandShallow, valueNoise(s * 0.3, d * 0.3, 2) * 0.5);
  const patches = fbm(s * 0.05, d * 0.08, 3, 4);
  let color = mixColor(COLORS.grass, COLORS.grassLight, patches);
  color = mixColor(color, COLORS.forest, smoothstep(1.6, 5, height) * 0.7);
  const edge = Math.abs(d) - layout.halfWidth(s);
  if (inVillage(layout, s, d) && edge < 9) color = mixColor(color, COLORS.earth, 0.55 * (1 - smoothstep(5, 9, edge)));
  return color;
}

/** Morceau de terrain entre s0 et s1, jupe comprise sur les bords extérieurs. */
export function buildTerrainChunk(layout: RiverLayout, s0: number, s1: number): MeshData {
  const mesh = emptyMesh();
  const rows: number[] = [];
  for (let s = s0; s < s1; s += TERRAIN_ROW_STEP) rows.push(s);
  rows.push(s1);
  const columns = [TERRAIN_HALF_WIDTH * -1 - 0.5, ...TERRAIN_COLUMNS, TERRAIN_HALF_WIDTH + 0.5];
  const vertices: [number, number, number][] = [];
  const colors: Color[] = [];
  for (const s of rows) {
    columns.forEach((d, index) => {
      const skirt = index === 0 || index === columns.length - 1;
      const height = skirt ? SKIRT_DEPTH : terrainHeight(layout, s, d);
      const { x, z } = layout.toWorld(s, d);
      vertices.push([x, height, z]);
      colors.push(terrainColor(layout, s, d, skirt ? 1 : height));
    });
  }
  const width = columns.length;
  const triangles: number[] = [];
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (let c = 0; c < width - 1; c += 1) {
      const a = r * width + c;
      triangles.push(a, a + width, a + 1, a + 1, a + width, a + width + 1);
    }
  }
  addShape(mesh, vertices, triangles, colors);
  return mesh;
}

export interface WaterMeshData {
  positions: number[];
  /** Coordonnées de rivière (s, d) de chaque sommet : le courant suit le tracé. */
  river: number[];
  /** Profondeur sous le sommet et distance au bord (m) : couleur de l'eau et écume. */
  shore: number[];
  indices: number[];
}

export function buildWaterChunk(layout: RiverLayout, s0: number, s1: number): WaterMeshData {
  const data: WaterMeshData = { positions: [], river: [], shore: [], indices: [] };
  const rows: number[] = [];
  for (let s = s0; s < s1; s += WATER_ROW_STEP) rows.push(s);
  rows.push(s1);
  for (const s of rows) {
    const half = layout.halfWidth(s) + WATER_OVERLAP;
    for (let i = 0; i < WATER_COLUMNS; i += 1) {
      const u = (i / (WATER_COLUMNS - 1)) * 2 - 1;
      const d = Math.sign(u) * Math.pow(Math.abs(u), 0.8) * half;
      const { x, z } = layout.toWorld(s, d);
      data.positions.push(x, 0, z);
      data.river.push(s, d);
      data.shore.push(Math.max(0, -terrainHeight(layout, s, d)), Math.max(-1, shoreDistance(layout, s, d)));
    }
  }
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (let c = 0; c < WATER_COLUMNS - 1; c += 1) {
      const a = r * WATER_COLUMNS + c;
      data.indices.push(a, a + WATER_COLUMNS, a + 1, a + 1, a + WATER_COLUMNS, a + WATER_COLUMNS + 1);
    }
  }
  return data;
}

/** Points grossiers du tracé, pour mesurer vite la distance d'un point du monde à la rivière. */
export function coarsePath(layout: RiverLayout, from: number, to: number, step = 6): { x: number; z: number }[] {
  const points: { x: number; z: number }[] = [];
  for (let s = from; s <= to; s += step) points.push(layout.toWorld(s, 0));
  return points;
}

export function distanceToPath(points: readonly { x: number; z: number }[], x: number, z: number): number {
  let best = Infinity;
  for (const point of points) {
    const dx = point.x - x;
    const dz = point.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
  }
  return Math.sqrt(best);
}

/**
 * Plaine de rizières autour de la vallée, jusqu'à l'horizon. Les sommets proches de la rivière descendent sous le
 * terrain : la plaine ne recouvre jamais l'eau.
 */
interface PlainGrid {
  path: { x: number; z: number }[];
  minX: number;
  minZ: number;
  step: number;
  cols: number;
  rows: number;
  height(x: number, z: number): number;
}

function plainGrid(layout: RiverLayout, from: number, to: number): PlainGrid {
  const path = coarsePath(layout, from, to);
  const xs = path.map((p) => p.x);
  const zs = path.map((p) => p.z);
  const margin = 950;
  const minX = Math.min(...xs) - margin;
  const maxX = Math.max(...xs) + margin;
  const minZ = Math.min(...zs) - margin;
  const maxZ = Math.max(...zs) + margin;
  const step = 30;
  const height = (x: number, z: number) => (distanceToPath(path, x, z) < TERRAIN_HALF_WIDTH + 3 ? SKIRT_DEPTH : 1.1 + valueNoise(x * 0.012, z * 0.012, 21) * 0.5);
  return { path, minX, minZ, step, cols: Math.ceil((maxX - minX) / step) + 1, rows: Math.ceil((maxZ - minZ) / step) + 1, height };
}

/**
 * Hauteur de la plaine en un point du monde, exactement celle du maillage de buildPlain (mêmes sommets, mêmes
 * triangles) : de quoi poser un arbre sur la plaine sans qu'il flotte ni s'enfonce.
 */
export function plainSampler(layout: RiverLayout, from: number, to: number): (x: number, z: number) => number {
  const grid = plainGrid(layout, from, to);
  return (x, z) => {
    const u = (x - grid.minX) / grid.step;
    const v = (z - grid.minZ) / grid.step;
    const c = Math.floor(u);
    const r = Math.floor(v);
    const fx = u - c;
    const fz = v - r;
    const at = (rr: number, cc: number) => grid.height(grid.minX + cc * grid.step, grid.minZ + rr * grid.step);
    const h01 = at(r, c + 1);
    const h10 = at(r + 1, c);
    if (fx + fz <= 1) {
      const h00 = at(r, c);
      return h00 + fx * (h01 - h00) + fz * (h10 - h00);
    }
    const h11 = at(r + 1, c + 1);
    return h11 + (1 - fx) * (h10 - h11) + (1 - fz) * (h01 - h11);
  };
}

export function buildPlain(layout: RiverLayout, from: number, to: number): MeshData {
  const mesh = emptyMesh();
  const { minX, minZ, step, cols, rows, height } = plainGrid(layout, from, to);
  const vertices: [number, number, number][] = [];
  const colors: Color[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = minX + c * step;
      const z = minZ + r * step;
      const field = valueNoise(x * 0.012, z * 0.012, 21);
      vertices.push([x, height(x, z), z]);
      colors.push(mixColor(COLORS.grass, field > 0.55 ? COLORS.grassLight : COLORS.forest, Math.abs(field - 0.5) * 1.6));
    }
  }
  const triangles: number[] = [];
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a = r * cols + c;
      triangles.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  addShape(mesh, vertices, triangles, colors);
  return mesh;
}
