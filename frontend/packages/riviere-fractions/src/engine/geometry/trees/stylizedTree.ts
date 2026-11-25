import { addShape, emptyMesh, lathe, mixColor, sphere, type Color, type MeshData } from "../kit";
import { valueNoise } from "../noise";

// Arbre stylisé d'après la maquette du Capitaine : tronc torsadé et courbé, racines évasées, branches visibles qui
// portent des plateaux de feuillage faits de grandes feuilles pointues qui se chevauchent comme des tuiles. Tout est
// construit en code (aucune texture) : couleurs par sommet, ombre douce peinte dans les creux. Trois niveaux de
// détail partagent la même silhouette : premier plan, moyenne distance, lointain, et très lointain (forêt).
//
// Écrit pour Yamba. Techniques classiques réécrites : tubes le long d'une courbe de Catmull-Rom à repère transporté,
// répartition des feuilles en spirale de Fibonacci (angle d'or).

export type Vec3 = [number, number, number];
type Rng = () => number;

/** Couleurs d'un arbre : écorce (cinq bruns et la mousse) et feuillage (ombre, ton moyen, lumière). */
export interface TreePalette {
  barkDark: Color;
  bark: Color;
  barkLight: Color;
  barkWarm: Color;
  barkGrey: Color;
  moss: Color;
  leafDeep: Color;
  leaf: Color;
  leafBright: Color;
}

/** Les couleurs de l'arbre validé (vert forêt). */
export const TREE_PALETTE: TreePalette = {
  barkDark: [0.33, 0.19, 0.1],
  bark: [0.55, 0.33, 0.17],
  barkLight: [0.72, 0.47, 0.26],
  barkWarm: [0.62, 0.36, 0.17],
  barkGrey: [0.47, 0.4, 0.33],
  moss: [0.42, 0.55, 0.16],
  leafDeep: [0.13, 0.42, 0.1],
  leaf: [0.3, 0.64, 0.14],
  leafBright: [0.66, 0.86, 0.2],
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** Courbe de Catmull-Rom passant par les points de contrôle, échantillonnée régulièrement. */
export function spline(points: readonly Vec3[], samples: number): Vec3[] {
  const out: Vec3[] = [];
  const n = points.length - 1;
  for (let i = 0; i <= samples; i += 1) {
    const u = (i / samples) * n;
    const k = Math.min(n - 1, Math.floor(u));
    const t = u - k;
    const p0 = points[Math.max(0, k - 1)];
    const p1 = points[k];
    const p2 = points[k + 1];
    const p3 = points[Math.min(n, k + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as Vec3);
  }
  return out;
}

/**
 * Tube d'écorce le long d'un chemin : rayon qui s'affine, côtes irrégulières qui s'enroulent (le tronc semble tressé),
 * petites bosses (nœuds), écorce en plusieurs bruns — sombre dans les sillons, chaude sur les reliefs, parfois grisée —
 * et mousse vers le bas. Le relief est dans la géométrie et les couleurs : aucune texture.
 */
export function barkTube(target: MeshData, pal: TreePalette, path: readonly Vec3[], radius: (t: number) => number, sides: number, seed: number, twist = 2.2, ridges = 5, knots = 0): void {
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const triangles: number[] = [];
  const bumps = Array.from({ length: knots }, (_, i) => ({ t: 0.15 + 0.7 * valueNoise(seed, i * 3.1, 7), a: valueNoise(i * 2.3, seed, 9) * Math.PI * 2 }));
  let normal: Vec3 = norm(cross(norm(sub(path[1], path[0])), [1, 0, 0]));
  path.forEach((point, i) => {
    const t = i / (path.length - 1);
    const tangent = norm(sub(path[Math.min(path.length - 1, i + 1)], path[Math.max(0, i - 1)]));
    normal = norm(sub(normal, scale(tangent, dot(normal, tangent))));
    const binormal = cross(tangent, normal);
    for (let k = 0; k <= sides; k += 1) {
      const a = (k / sides) * Math.PI * 2;
      const wobble = valueNoise(Math.cos(a) * 1.7 + seed, t * 9 + Math.sin(a) * 1.7, 11);
      const phase = a * ridges + t * twist * Math.PI * 2 + wobble * 1.6;
      const groove = Math.cos(phase) * (0.6 + 0.6 * valueNoise(a * 2 + seed, t * 5, 13));
      let knot = 0;
      for (const b of bumps) {
        const da = Math.atan2(Math.sin(a - b.a), Math.cos(a - b.a));
        knot += Math.exp(-((t - b.t) ** 2) / 0.002 - (da * da) / 0.25) * 0.22;
      }
      const r = radius(t) * (1 + 0.1 * groove + 0.06 * (wobble - 0.5) + knot);
      vertices.push(add(point, add(scale(normal, Math.cos(a) * r), scale(binormal, Math.sin(a) * r))));
      const relief = Math.min(1, Math.max(0, 0.5 + 0.55 * groove + knot * 2));
      const tone = valueNoise(k * 1.3 + seed * 2, t * 14, 17);
      let color = mixColor(mixColor(pal.barkDark, [0.2, 0.11, 0.06], 0.5), pal.bark, Math.min(1, relief * 1.5));
      color = mixColor(color, pal.barkLight, Math.max(0, relief - 0.55) * 1.6);
      color = mixColor(color, tone > 0.62 ? pal.barkGrey : pal.barkWarm, Math.abs(tone - 0.5) * 0.7);
      const moss = Math.max(0, valueNoise(k * 0.9 + seed, t * 6 + seed, 31) - 0.55) * 2.2 * (1 - t) * (point[1] < 1.4 ? 1 : 0.3) * (1 - relief * 0.5);
      color = mixColor(color, pal.moss, Math.min(0.8, moss));
      colors.push(color);
    }
  });
  const row = sides + 1;
  for (let i = 0; i < path.length - 1; i += 1) {
    for (let k = 0; k < sides; k += 1) {
      const a = i * row + k;
      triangles.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  addShape(target, vertices, triangles, colors);
}

/**
 * Une feuille : ovale pointu, légèrement pliée le long de sa nervure (8 triangles), ou simple losange (2 triangles)
 * pour les versions allégées. Posée en `at`, la pointe vers `out`, inclinée de `droop` vers le bas.
 */
export function leaf(target: MeshData, pal: TreePalette, at: Vec3, out: Vec3, length: number, droop: number, color: Color, simple = false): void {
  const forward = norm([out[0], 0, out[2]]);
  const side = norm(cross([0, 1, 0], forward));
  const dir = norm(add(scale(forward, Math.cos(droop)), [0, -Math.sin(droop), 0]));
  const up = norm(cross(dir, side));
  const w = length * 0.34;
  const fold = length * 0.06;
  const p = (along: number, across: number, lift: number): Vec3 => add(at, add(add(scale(dir, along * length), scale(side, across)), scale(up, lift)));
  if (simple) {
    addShape(target, [p(0, 0, 0), p(0.45, -w, -fold), p(1, 0, 0), p(0.45, w, -fold)], [0, 1, 2, 0, 2, 3], [mixColor(color, pal.leafDeep, 0.3), color, mixColor(color, pal.leafBright, 0.15), color]);
    return;
  }
  const vertices: Vec3[] = [p(0, 0, 0), p(0.22, -w * 0.8, -fold * 0.4), p(0.5, -w, -fold), p(0.8, -w * 0.55, -fold * 0.5), p(1, 0, 0), p(0.8, w * 0.55, -fold * 0.5), p(0.5, w, -fold), p(0.22, w * 0.8, -fold * 0.4), p(0.5, 0, fold * 0.3)];
  const vein = mixColor(color, pal.leafBright, 0.25);
  const colors: Color[] = [mixColor(color, pal.leafDeep, 0.35), color, color, color, mixColor(color, pal.leafBright, 0.15), color, color, color, vein];
  const triangles = [0, 1, 8, 1, 2, 8, 2, 3, 8, 3, 4, 8, 4, 5, 8, 5, 6, 8, 6, 7, 8, 7, 0, 8];
  addShape(target, vertices, triangles, colors);
}

/** Niveau de détail : 0 au premier plan, 1 à moyenne distance, 2 au lointain, 3 au très lointain (forêt dense). */
export type TreeDetail = 0 | 1 | 2 | 3;

const DETAIL: Record<TreeDetail, { density: number; leafSize: number; simple: boolean; trunkSides: number; trunkSamples: number; branchSides: number; twigs: boolean; roots: number; knots: number }> = {
  0: { density: 26, leafSize: 1.0, simple: false, trunkSides: 16, trunkSamples: 24, branchSides: 7, twigs: true, roots: 5, knots: 6 },
  1: { density: 7, leafSize: 1.75, simple: true, trunkSides: 8, trunkSamples: 12, branchSides: 5, twigs: true, roots: 3, knots: 3 },
  2: { density: 2.2, leafSize: 2.8, simple: true, trunkSides: 5, trunkSamples: 6, branchSides: 3, twigs: false, roots: 0, knots: 0 },
  3: { density: 1.5, leafSize: 3.2, simple: true, trunkSides: 3, trunkSamples: 3, branchSides: 3, twigs: false, roots: 0, knots: 0 },
};

/**
 * Très lointain : le tronc en trois facettes, puis les cinq plus grandes masses, chacune en un volume anguleux et
 * bosselé, bordé de grandes feuilles pointues qui en découpent le contour, dans le dégradé de verts de la palette.
 * Environ 230 triangles : au-delà de
 * 60 m, dans la brume, la silhouette et les couleurs suffisent.
 */
function distantTree(mesh: MeshData, palette: TreePalette, trunk: readonly Vec3[], rng: Rng): void {
  barkTube(mesh, palette, trunk, (t) => 0.62 * (1 - t * 0.6), 3, 3, 0, 1);
  const masses = [...MASSES].sort((a, b) => b.radius - a.radius).slice(0, 5);
  masses.forEach((mass, i) => {
    const r = mass.radius * 1.12;
    lathe(
      mesh,
      [[0.02, -0.42 * r], [r, -0.05 * r], [0.72 * r, 0.42 * r], [0.02, 0.72 * r]],
      5,
      (h) => (h > 0.3 * r ? mixColor(palette.leaf, palette.leafBright, 0.5) : h > -0.15 * r ? palette.leaf : mixColor(palette.leafDeep, palette.leaf, 0.3)),
      { x: mass.at[0], y: mass.at[1], z: mass.at[2], yaw: i * 1.3 },
      (ring, angle) => (ring === 1 || ring === 2 ? 0.74 + 0.5 * valueNoise(angle * 1.9 + i + ring * 5, i * 2.7, 29) : 1),
    );
    // De grandes feuilles pointues débordent du volume : le contour reste découpé, jamais une boule lisse.
    leafLobe(mesh, palette, [mass.at[0], mass.at[1] + 0.1 * r, mass.at[2]], r * 1.05, 3, rng, 0.05);
  });
}

/**
 * Un lobe de feuillage : les feuilles couvrent la surface d'un ellipsoïde aplati comme des écailles, la pointe vers
 * l'extérieur ; elles se couchent au sommet et pendent sur les flancs. Claires en haut et au-dehors, sombres
 * dessous et au cœur.
 */
function leafLobe(target: MeshData, pal: TreePalette, center: Vec3, radius: number, detail: TreeDetail, rng: Rng, hue: number): void {
  const settings = DETAIL[detail];
  const count = Math.max(4, Math.round(settings.density * radius * radius));
  for (let i = 0; i < count; i += 1) {
    // Spirale de Fibonacci sur la sphère, en gardant le dessus et un peu du dessous.
    const y = 1 - ((i + 0.5) / count) * 1.45;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.39996 + rng() * 0.5;
    const n: Vec3 = [Math.cos(a) * ring, y, Math.sin(a) * ring];
    // La base de la feuille est un peu enfoncée dans le lobe : les pointes débordent et recouvrent les voisines.
    const r = radius * (0.68 + rng() * 0.18);
    const at = add(center, [n[0] * r, n[1] * r * 0.82, n[2] * r]);
    const yaw = a + (rng() - 0.5) * 1.1;
    const out: Vec3 = ring < 0.2 ? [Math.cos(yaw), 0, Math.sin(yaw)] : [Math.cos(yaw) * 0.5 + n[0], 0, Math.sin(yaw) * 0.5 + n[2]];
    const droop = 0.12 + (1 - n[1]) * 0.5 + (rng() - 0.5) * 0.3;
    const light = Math.min(1, Math.max(0, 0.5 + n[1] * 0.42 + (ring * 0.15) + hue + (rng() - 0.5) * 0.22));
    const color = light > 0.55 ? mixColor(pal.leaf, pal.leafBright, (light - 0.55) / 0.45) : mixColor(pal.leafDeep, pal.leaf, light / 0.55);
    leaf(target, pal, at, out, settings.leafSize * (0.85 + rng() * 0.3), droop, color, settings.simple);
  }
}

export interface TreeStats {
  vertices: number;
  triangles: number;
}

/** Masses de feuillage : position, rayon. Volontairement inégales et décentrées, comme sur la maquette. */
const MASSES: readonly { at: Vec3; radius: number; from: number }[] = [
  { at: [0.35, 6.0, 0.25], radius: 1.95, from: 0.97 },
  { at: [-2.35, 5.05, 0.7], radius: 1.45, from: 0.72 },
  { at: [-3.0, 3.6, -0.55], radius: 1.05, from: 0.5 },
  { at: [2.95, 4.15, 0.75], radius: 1.2, from: 0.58 },
  { at: [1.85, 5.35, -1.0], radius: 1.3, from: 0.84 },
  { at: [0.8, 4.75, 2.15], radius: 1.0, from: 0.78 },
  { at: [-0.7, 4.55, -2.05], radius: 1.1, from: 0.68 },
];

/**
 * L'arbre de la maquette, environ 7,5 m de haut, centré sur son pied. Les trois niveaux de détail partagent le même
 * tronc, les mêmes branches et les mêmes masses : seul le nombre de feuilles et de facettes change. La palette ne
 * change que les couleurs : avec le même tirage, la forme est identique d'une palette à l'autre.
 */
export function stylizedTree(rng: Rng, detail: TreeDetail = 0, palette: TreePalette = TREE_PALETTE): MeshData {
  const settings = DETAIL[detail];
  const mesh = emptyMesh();
  // Tronc en S, penché puis redressé, épais et évasé au pied.
  const trunk = spline([[0, -0.2, 0], [0.2, 0.7, 0.05], [0.85, 1.8, 0.12], [0.45, 2.9, -0.05], [-0.35, 3.9, 0], [-0.15, 4.8, 0.05]], settings.trunkSamples);
  if (detail === 3) {
    distantTree(mesh, palette, trunk, rng);
    return mesh;
  }
  barkTube(mesh, palette, trunk, (t) => 0.78 * (1 - t * 0.66) + 0.5 * Math.max(0, 0.16 - t) * 4, settings.trunkSides, 3, 2.2, detail === 0 ? 7 : 5, settings.knots);
  // Racines qui plongent dans le sol, et deuxième tige torsadée autour du tronc (l'effet « tressé » de la maquette).
  for (let i = 0; i < settings.roots; i += 1) {
    const a = (i / settings.roots) * Math.PI * 2 + 0.4 + (rng() - 0.5) * 0.5;
    const reach = 1.0 + rng() * 0.6;
    barkTube(mesh, palette, spline([[Math.cos(a) * reach, -0.25, Math.sin(a) * reach], [Math.cos(a) * reach * 0.6, 0.05, Math.sin(a) * reach * 0.6], [Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.25]], detail === 0 ? 6 : 3), (t) => 0.1 + 0.26 * t * t, detail === 0 ? 7 : 4, i + 10, 0.5, 3);
  }
  if (detail < 2) barkTube(mesh, palette, spline([[0.35, 0, -0.25], [0.6, 0.9, 0.3], [0.65, 1.7, -0.15], [0.3, 2.5, -0.3]], detail === 0 ? 14 : 6), (t) => 0.36 * (1 - t * 0.93), detail === 0 ? 8 : 5, 20, 1.6, 4, settings.knots > 0 ? 2 : 0);

  MASSES.forEach((mass, i) => {
    const start = trunk[Math.round(mass.from * (trunk.length - 1))];
    // Branche coudée : un premier élan, un coude, puis la remontée vers la masse de feuilles.
    const kink: Vec3 = [start[0] + (mass.at[0] - start[0]) * 0.45 + (rng() - 0.5) * 0.5, start[1] + (mass.at[1] - start[1]) * 0.25 + 0.15, start[2] + (mass.at[2] - start[2]) * 0.45 + (rng() - 0.5) * 0.5];
    const branch = spline([start, kink, [mass.at[0] * 0.9 + start[0] * 0.1, mass.at[1] - mass.radius * 0.45, mass.at[2] * 0.9 + start[2] * 0.1]], detail === 2 ? 3 : 8);
    barkTube(mesh, palette, branch, (t) => (0.24 - i * 0.012) * (1 - t * 0.7), settings.branchSides, 40 + i, 0.6, 3);
    // Lobes : la masse se compose de plusieurs grappes qui débordent les unes sur les autres.
    const lobes = detail === 2 ? 1 : 2 + Math.round(mass.radius * 1.6);
    for (let l = 0; l < lobes; l += 1) {
      const a = l * 2.39996 + i;
      const spread = l === 0 ? 0 : mass.radius * (0.45 + rng() * 0.25);
      const lobe: Vec3 = [mass.at[0] + Math.cos(a) * spread, mass.at[1] + (rng() - 0.45) * mass.radius * 0.6, mass.at[2] + Math.sin(a) * spread];
      const lobeRadius = mass.radius * (l === 0 ? 0.72 : 0.5 + rng() * 0.15);
      // Au lointain, un cœur de feuillage plein (une boule bosselée, en dégradé de verts) porte quelques grandes
      // feuilles qui gardent un contour découpé : la masse reste pleine avec très peu de triangles.
      if (detail === 2) {
        const core = mass.radius * 0.8;
        sphere(mesh, core, (h) => mixColor(palette.leafDeep, palette.leaf, Math.min(1, Math.max(0, 0.5 + h / core))), { x: lobe[0], y: lobe[1], z: lobe[2], scale: [1, 0.78, 1] }, 3, (ring, angle) => 0.85 + 0.3 * valueNoise(ring * 2.1 + i, angle * 1.3, 23));
      }
      leafLobe(mesh, palette, lobe, detail === 2 ? mass.radius * 0.95 : lobeRadius, detail, rng, (rng() - 0.5) * 0.12);
      if (settings.twigs && l > 0) {
        const from = branch[branch.length - 2];
        barkTube(mesh, palette, spline([from, [(from[0] + lobe[0]) / 2, (from[1] + lobe[1]) / 2 - 0.15, (from[2] + lobe[2]) / 2], [lobe[0], lobe[1] - lobeRadius * 0.4, lobe[2]]], detail === 0 ? 4 : 2), (t) => 0.075 * (1 - t * 0.6), detail === 0 ? 5 : 3, 60 + i * 5 + l, 0.3, 3);
      }
    }
  });
  return mesh;
}

export function treeStats(mesh: MeshData): TreeStats {
  return { vertices: mesh.positions.length / 3, triangles: mesh.indices.length / 3 };
}
