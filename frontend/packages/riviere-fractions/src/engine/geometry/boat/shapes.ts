import { addShape, emptyMesh, type Color, type MeshData, type Transform } from "../kit";
import type { Vec3 } from "./dimensions";

// Formes du bateau à moteur, en plus de celles de l'atelier commun : surfaces en grille, tubes, tores, coussins
// arrondis, disques, étoiles et prismes. Chaque sommet porte aussi une finition (dans l'alpha de sa couleur) et, pour
// la coque, les coordonnées de sa décoration peinte.

/**
 * Finitions lues par le matériau du bateau dans la composante alpha de la couleur des sommets :
 * de 0 à 1, brillance d'une surface peinte ; 1,5 métal poli ; de 2 à 4, lumière (intensité alpha − 1) ;
 * au-delà de 4, lumière qui pulse (intensité alpha − 3).
 */
export const FINISH = {
  matte: 0,
  fabric: 0.08,
  wood: 0.2,
  satin: 0.38,
  vinyl: 0.5,
  gloss: 0.82,
  glass: 0.98,
  chrome: 1.5,
  glowSoft: 2.3,
  glow: 2.7,
  glowBright: 3.2,
  pulse: 4.4,
} as const;

/**
 * Maillage du bateau : un maillage ordinaire, plus quatre nombres de peinture par sommet (distance au tableau arrière,
 * profondeur sous le plat-bord, hauteur au-dessus du bouchain, hauteur du flanc). Une distance négative veut dire
 * « pas de décoration peinte » : la couleur du sommet s'applique.
 */
export interface BoatMesh extends MeshData {
  paint: number[];
}

export function emptyBoatMesh(): BoatMesh {
  return { ...emptyMesh(), paint: [] };
}

export const vertexMark = (mesh: MeshData) => mesh.positions.length / 3;

/** Complète la peinture des sommets ajoutés par les formes de l'atelier commun (sans décoration). */
export function padPaint(mesh: BoatMesh): void {
  for (let i = mesh.paint.length / 4; i < vertexMark(mesh); i += 1) mesh.paint.push(-1, 0, 0, 0);
}

/** Dessine avec une finition : les sommets ajoutés par `draw` la reçoivent. */
export function withFinish(mesh: MeshData, finish: number, draw: () => void): void {
  const from = vertexMark(mesh);
  draw();
  for (let i = from; i < vertexMark(mesh); i += 1) mesh.colors[i * 4 + 3] = finish;
}

export function mergeBoat(target: BoatMesh, source: BoatMesh): void {
  padPaint(target);
  padPaint(source);
  const base = vertexMark(target);
  target.positions.push(...source.positions);
  target.normals.push(...source.normals);
  target.colors.push(...source.colors);
  target.paint.push(...source.paint);
  for (const index of source.indices) target.indices.push(base + index);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type ColorOf = Color | ((row: number, column: number) => Color);

/**
 * Surface en grille : `rows[i][j]`, une couleur par sommet. `flip` inverse l'orientation (moitié en miroir).
 * `paint` donne la décoration peinte d'un sommet (coque).
 */
export function surface(target: BoatMesh, rows: readonly (readonly Vec3[])[], color: ColorOf, flip = false, paint?: (point: Vec3, row: number, column: number) => readonly [number, number, number, number]): void {
  padPaint(target);
  const columns = rows[0].length;
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  rows.forEach((row, i) =>
    row.forEach((point, j) => {
      vertices.push(point);
      colors.push(typeof color === "function" ? color(i, j) : color);
    }),
  );
  const triangles: number[] = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    for (let j = 0; j < columns - 1; j += 1) {
      const a = i * columns + j;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      if (flip) triangles.push(a, b, c, b, d, c);
      else triangles.push(a, c, b, b, c, d);
    }
  }
  addShape(target, vertices, triangles, colors);
  rows.forEach((row, i) =>
    row.forEach((point, j) => {
      if (paint) target.paint.push(...paint(point, i, j));
      else target.paint.push(-1, 0, 0, 0);
    }),
  );
}

function perpendicular(t: Vec3): Vec3 {
  return normalize(Math.abs(t[1]) < 0.9 ? cross(t, [0, 1, 0]) : cross(t, [1, 0, 0]));
}

/**
 * Tube le long d'un chemin (mains courantes, montants, liston chromé). Le cercle suit le chemin sans vriller.
 * `radius` peut varier d'un point à l'autre.
 */
export function pipe(target: BoatMesh, path: readonly Vec3[], radius: number | readonly number[], color: Color, sides = 8, closed = false): void {
  const n = path.length;
  const at = (i: number) => path[closed ? (i + n) % n : clampIndex(i, n)];
  let normal = perpendicular(normalize(sub(at(1), at(0))));
  const rings: Vec3[][] = [];
  for (let i = 0; i < n; i += 1) {
    const tangent = normalize(sub(at(i + 1), at(i - 1)));
    normal = normalize(sub(normal, scale(tangent, dot(normal, tangent))));
    const binormal = cross(tangent, normal);
    const r = typeof radius === "number" ? radius : radius[i];
    const ring: Vec3[] = [];
    for (let k = 0; k <= sides; k += 1) {
      const a = (k / sides) * Math.PI * 2;
      ring.push(add(path[i], add(scale(normal, Math.cos(a) * r), scale(binormal, Math.sin(a) * r))));
    }
    rings.push(ring);
  }
  if (closed) rings.push(rings[0]);
  surface(target, rings, color);
}

const clampIndex = (i: number, n: number) => Math.max(0, Math.min(n - 1, i));

/** Tube droit d'un point à un autre (rayon de départ et d'arrivée). */
export function tube(target: BoatMesh, from: Vec3, to: Vec3, radius: number, color: Color, sides = 8, radiusEnd = radius): void {
  pipe(target, [from, to], [radius, radiusEnd], color, sides);
}

/**
 * Tore horizontal (axe y) : bouée, volant, rouleau de cordage. `color(u)` colore chaque tronçon (u de 0 à 1) ;
 * `sections` découpe l'anneau en tronçons nets pour des couleurs franches.
 */
export function torus(target: BoatMesh, major: number, minor: number, color: Color | ((u: number) => Color), transform: Transform = {}, segments = 20, sides = 8, sections = 1): void {
  padPaint(target);
  const perSection = Math.max(1, Math.round(segments / sections));
  for (let s = 0; s < sections; s += 1) {
    const vertices: Vec3[] = [];
    const colors: Color[] = [];
    const triangles: number[] = [];
    const u0 = s / sections;
    const shade = typeof color === "function" ? color((s + 0.5) / sections) : color;
    for (let i = 0; i <= perSection; i += 1) {
      const u = (u0 + i / (perSection * sections)) * Math.PI * 2;
      for (let k = 0; k <= sides; k += 1) {
        const v = (k / sides) * Math.PI * 2;
        const r = major + Math.cos(v) * minor;
        vertices.push([Math.cos(u) * r, Math.sin(v) * minor, Math.sin(u) * r]);
        colors.push(shade);
      }
    }
    const row = sides + 1;
    for (let i = 0; i < perSection; i += 1) {
      for (let k = 0; k < sides; k += 1) {
        const a = i * row + k;
        triangles.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
    }
    addShape(target, vertices, triangles, colors, transform);
  }
  padPaint(target);
}

const signedPow = (value: number, exponent: number) => Math.sign(value) * Math.abs(value) ** exponent;

/**
 * Coussin arrondi (superellipsoïde) centré sur l'origine : sièges, capot du moteur, glacière. `roundness` va de
 * 0,15 (presque une boîte) à 1 (ellipsoïde). `shape` déforme chaque point local avant la transformation.
 */
export function roundedBox(target: BoatMesh, width: number, height: number, depth: number, color: Color, transform: Transform = {}, roundness = 0.3, detail = 3, shape?: (point: Vec3) => Vec3): void {
  padPaint(target);
  const rings = detail * 2;
  const segments = detail * 4;
  const vertices: Vec3[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= rings; i += 1) {
    const v = -Math.PI / 2 + (Math.PI * i) / rings;
    for (let j = 0; j <= segments; j += 1) {
      const u = -Math.PI + (2 * Math.PI * j) / segments;
      const ring = signedPow(Math.cos(v), roundness);
      const point: Vec3 = [ring * signedPow(Math.cos(u), roundness) * (width / 2), signedPow(Math.sin(v), roundness) * (height / 2), ring * signedPow(Math.sin(u), roundness) * (depth / 2)];
      vertices.push(shape ? shape(point) : point);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * row + j;
      triangles.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  addShape(target, vertices, triangles, color, transform);
  padPaint(target);
}

/** Disque plat dans le plan xy (verres de phares, cadrans), vu le long de z. */
export function disc(target: BoatMesh, radius: number, color: Color | ((ring: number) => Color), transform: Transform = {}, segments = 12, rings = 1): void {
  padPaint(target);
  const vertices: Vec3[] = [[0, 0, 0]];
  const colors: Color[] = [typeof color === "function" ? color(0) : color];
  const triangles: number[] = [];
  for (let r = 1; r <= rings; r += 1) {
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      vertices.push([Math.cos(a) * radius * (r / rings), Math.sin(a) * radius * (r / rings), 0]);
      colors.push(typeof color === "function" ? color(r / rings) : color);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < segments; i += 1) triangles.push(0, 1 + i, 2 + i);
  for (let r = 1; r < rings; r += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = 1 + (r - 1) * row + i;
      triangles.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  addShape(target, vertices, triangles, colors, transform);
  padPaint(target);
}

/** Étoile plate à cinq branches dans le plan xy, pointe vers le haut. */
export function star(target: BoatMesh, outer: number, inner: number, color: Color, transform: Transform = {}): void {
  padPaint(target);
  const vertices: Vec3[] = [[0, 0, 0]];
  for (let i = 0; i <= 10; i += 1) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? outer : inner;
    vertices.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  const triangles: number[] = [];
  for (let i = 0; i < 10; i += 1) triangles.push(0, 1 + i, 2 + i);
  addShape(target, vertices, triangles, color, transform);
  padPaint(target);
}

/**
 * Prisme : un profil convexe (z, y) extrudé de x0 à x1 (consoles, cloisons). Chaque face du pourtour a sa propre
 * couleur (`color(edge)`) et ses arêtes restent nettes.
 */
export function prism(target: BoatMesh, profile: readonly (readonly [number, number])[], x0: number, x1: number, color: Color | ((edge: number) => Color), capColor?: Color): void {
  padPaint(target);
  const n = profile.length;
  for (let e = 0; e < n; e += 1) {
    const [za, ya] = profile[e];
    const [zb, yb] = profile[(e + 1) % n];
    const shade = typeof color === "function" ? color(e) : color;
    addShape(target, [[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]], [0, 1, 2, 0, 2, 3], shade);
  }
  const cap = capColor ?? (typeof color === "function" ? color(0) : color);
  for (const x of [x0, x1]) {
    const vertices: Vec3[] = profile.map(([z, y]) => [x, y, z]);
    const triangles: number[] = [];
    for (let i = 1; i < n - 1; i += 1) triangles.push(0, i, i + 1);
    addShape(target, vertices, triangles, cap);
  }
  padPaint(target);
}
