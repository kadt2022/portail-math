import { addShape, lathe, sweep, type Color, type Frame, type MeshData, type Vec3 } from "./kit";

// Formes mécaniques réutilisables : barres orientées (bielles, mains courantes, treillis), anneaux et disques
// couchés (roues, couvercles de cylindres), arcs (garde-roues, voûtes), planches. Toutes en coordonnées locales.
//
// Écrit pour Yamba.

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Repère d'une barre de a vers b : une perpendiculaire choisie loin de la direction. */
function barFrames(a: Vec3, b: Vec3, hint: Vec3): Frame[] {
  const d = norm(sub(b, a));
  const ref: Vec3 = Math.abs(d[0] * hint[0] + d[1] * hint[1] + d[2] * hint[2]) > 0.95 ? [1, 0, 0] : hint;
  const right = norm(cross(ref, d));
  const up = norm(cross(d, right));
  return [
    { p: a, right, up },
    { p: b, right, up },
  ];
}

/** Barre de section rectangulaire (largeur × hauteur) de a à b, bouts fermés. */
export function bar(target: MeshData, a: Vec3, b: Vec3, width: number, height: number, color: Color, hint: Vec3 = [0, 1, 0]): void {
  const w = width / 2;
  const h = height / 2;
  const profile: [number, number][] = [[-w, -h], [w, -h], [w, h], [-w, h]];
  const frames = barFrames(a, b, hint);
  sweep(target, profile, frames, color, true);
  for (const [frame, flip] of [[frames[0], true], [frames[1], false]] as const) {
    const corners = profile.map(([x, y]) => [frame.p[0] + frame.right[0] * x + frame.up[0] * y, frame.p[1] + frame.right[1] * x + frame.up[1] * y, frame.p[2] + frame.right[2] * x + frame.up[2] * y] as Vec3);
    addShape(target, corners, flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3], color);
  }
}

/** Tige ronde de a à b (mains courantes, tiges de piston, tubes). */
export function rod(target: MeshData, a: Vec3, b: Vec3, radius: number, color: Color, segments = 6): void {
  const profile: [number, number][] = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    profile.push([Math.cos(t) * radius, Math.sin(t) * radius]);
  }
  sweep(target, profile, barFrames(a, b, [0, 1, 0]), color, true);
}

/**
 * Anneau couché, d'axe x (jante, bandage de roue, cerclage de chaudière d'axe z si `axis` = "z") : rayon intérieur,
 * rayon extérieur, épaisseur, centré sur `at`.
 */
export function ring(target: MeshData, inner: number, outer: number, thickness: number, segments: number, color: Color, at: Vec3 = [0, 0, 0], axis: "x" | "z" = "x"): void {
  const t = thickness / 2;
  const profile: [number, number][] = [[inner, -t], [outer, -t], [outer, t], [inner, t]];
  const vertices: Vec3[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const [r, w] of profile) vertices.push(axis === "x" ? [at[0] + w, at[1] + c * r, at[2] + s * r] : [at[0] + c * r, at[1] + s * r, at[2] + w]);
  }
  const n = profile.length;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const a = i * n + j;
      const b = i * n + ((j + 1) % n);
      triangles.push(a, b, a + n, b, b + n, a + n);
    }
  }
  addShape(target, vertices, triangles, color);
}

/** Disque plein couché d'axe x (moyeu, contrepoids, couvercle), d'épaisseur donnée. */
export function disc(target: MeshData, radius: number, thickness: number, segments: number, color: Color, at: Vec3 = [0, 0, 0], axis: "x" | "z" = "x"): void {
  const t = thickness / 2;
  const point = (r: number, a: number, w: number): Vec3 => (axis === "x" ? [at[0] + w, at[1] + Math.cos(a) * r, at[2] + Math.sin(a) * r] : [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2] + w]);
  const vertices: Vec3[] = [];
  const triangles: number[] = [];
  vertices.push(point(0, 0, -t), point(0, 0, t));
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(point(radius, a, -t), point(radius, a, t));
  }
  for (let i = 0; i < segments; i += 1) {
    const b = 2 + i * 2;
    triangles.push(0, b + 2, b, 1, b + 1, b + 3, b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  addShape(target, vertices, triangles, color);
}

/**
 * Bandeau en arc dans le plan (y, z), d'axe x : garde-roues au-dessus des roues, intrados de voûte. Angles en
 * radians depuis l'avant (+z), dans le sens de la montée.
 */
export function arcBand(target: MeshData, radius: number, width: number, thickness: number, from: number, to: number, segments: number, color: Color | ((ring: number) => Color), at: Vec3 = [0, 0, 0]): void {
  const frames: Frame[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = from + ((to - from) * i) / segments;
    const radial: Vec3 = [0, Math.sin(a), Math.cos(a)];
    frames.push({ p: [at[0], at[1] + radial[1] * radius, at[2] + radial[2] * radius], right: [1, 0, 0], up: radial });
  }
  const w = width / 2;
  sweep(target, [[-w, 0], [w, 0], [w, thickness], [-w, thickness]], frames, typeof color === "function" ? (_v, ring) => color(ring) : color, true);
}

/** Dôme ou cloche de révolution d'axe vertical, posé en `at` (dômes de vapeur, cloche, cheminée). */
export function turned(target: MeshData, profile: readonly (readonly [number, number])[], segments: number, color: Color | ((height: number) => Color), at: Vec3): void {
  lathe(target, profile, segments, typeof color === "function" ? (h) => color(h) : color, { x: at[0], y: at[1], z: at[2] });
}
