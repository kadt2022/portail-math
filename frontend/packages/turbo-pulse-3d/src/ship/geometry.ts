// Géométrie pure du vaisseau : aucun Babylon.js, aucun DOM. On fabrique des listes de sommets et de triangles, que la scène transforme
// ensuite en maillages. Convention : les triangles tournent dans le sens inverse des aiguilles d'une montre vu de l'extérieur
// (repère main droite) ; la scène corrige le sens une seule fois, à la création du maillage.
//
// Trois outils suffisent à un vaisseau de jouet : le solide de révolution (coque, nez, moteurs, bagues), le prisme (ailes, dérives,
// pieds, voyants) et l'étoile. Les bords des prismes sont biseautés d'un cran : c'est ce qui donne l'air « plastique moulé ».

export type Pt = readonly [number, number];
export type V3 = readonly [number, number, number];

export interface MeshData {
  /** x, y, z à la suite. */
  positions: number[];
  /** Trois indices par triangle. */
  indices: number[];
}

export const emptyMesh = (): MeshData => ({ positions: [], indices: [] });

export function merge(parts: readonly MeshData[]): MeshData {
  const out = emptyMesh();
  for (const part of parts) {
    const base = out.positions.length / 3;
    for (const value of part.positions) out.positions.push(value);
    for (const index of part.indices) out.indices.push(index + base);
  }
  return out;
}

export const triangleCount = (mesh: MeshData) => mesh.indices.length / 3;

/** Aire signée d'un polygone (positive : sens inverse des aiguilles d'une montre). */
export function signedArea(points: readonly Pt[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

const cross2 = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function insideTriangle(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  return cross2(a, b, p) >= 0 && cross2(b, c, p) >= 0 && cross2(c, a, p) >= 0;
}

/** Triangulation d'un polygone simple par découpe d'oreilles. Renvoie des indices (sens inverse des aiguilles d'une montre). */
export function triangulate(points: readonly Pt[]): number[] {
  const order = points.map((_, index) => index);
  if (signedArea(points) < 0) order.reverse();
  const triangles: number[] = [];
  let guard = order.length * order.length;
  while (order.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < order.length; i += 1) {
      const prev = order[(i + order.length - 1) % order.length];
      const here = order[i];
      const next = order[(i + 1) % order.length];
      if (cross2(points[prev], points[here], points[next]) <= 1e-12) continue;
      const blocked = order.some((other) => other !== prev && other !== here && other !== next && insideTriangle(points[other], points[prev], points[here], points[next]));
      if (blocked) continue;
      triangles.push(prev, here, next);
      order.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (order.length === 3) triangles.push(order[0], order[1], order[2]);
  return triangles;
}

/**
 * Solide de révolution autour de l'axe z. `contour` est la coupe (rayon, z), un polygone fermé ; le solide en est le tour complet,
 * ou seulement l'arc `arc` (radians) : dans ce cas les deux bouts sont fermés. `flatten` écrase la section (x, y) : une coque
 * ovale, pas ronde.
 */
export function revolve(contour: readonly Pt[], options: { segments?: number; arc?: readonly [number, number]; flatten?: Pt } = {}): MeshData {
  const segments = options.segments ?? 24;
  const [a0, a1] = options.arc ?? [0, Math.PI * 2];
  const full = !options.arc;
  const [sx, sy] = options.flatten ?? [1, 1];
  const rings = full ? segments : segments + 1;
  const positions: number[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const angle = a0 + ((a1 - a0) * ring) / segments;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const [radius, z] of contour) positions.push(radius * cos * sx, radius * sin * sy, z);
  }
  const indices: number[] = [];
  const count = contour.length;
  // Contour dans le sens des aiguilles d'une montre (rayon en abscisse, z en ordonnée) : l'extérieur est à gauche du tracé.
  const ccw = signedArea(contour) > 0;
  const columns = full ? segments : segments;
  for (let ring = 0; ring < columns; ring += 1) {
    const next = (ring + 1) % rings;
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      const a = ring * count + i;
      const b = ring * count + j;
      const c = next * count + j;
      const d = next * count + i;
      if (ccw) indices.push(a, c, b, a, d, c);
      else indices.push(a, b, c, a, c, d);
    }
  }
  const mesh: MeshData = { positions, indices };
  if (!full) {
    // Les deux bouts de l'arc : la coupe elle-même, tournée vers l'extérieur de l'arc.
    const caps = triangulate(contour);
    for (const [ring, outward] of [[0, -1], [segments, 1]] as const) {
      for (let t = 0; t < caps.length; t += 3) {
        const [i0, i1, i2] = [caps[t], caps[t + 1], caps[t + 2]].map((i) => ring * count + i);
        const angle = a0 + ((a1 - a0) * ring) / segments;
        const tangent: V3 = [-Math.sin(angle) * outward, Math.cos(angle) * outward, 0];
        const flip = faceDot(positions, i0, i1, i2, tangent) < 0;
        indices.push(i0, flip ? i2 : i1, flip ? i1 : i2);
      }
    }
  }
  return mesh;
}

function faceDot(positions: readonly number[], i0: number, i1: number, i2: number, direction: V3): number {
  const p = (i: number) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
  const [a, b, c] = [p(i0), p(i1), p(i2)];
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return normal[0] * direction[0] + normal[1] * direction[1] + normal[2] * direction[2];
}

export type Axis = "y" | "x";

/**
 * Prisme : un contour plat (vu de dessus, ou de profil) épaissi. `bevel` rétrécit le dessus (0 à 0,3) : bord biseauté, aspect jouet.
 * « y » : contour dans le plan (x, z), épaisseur selon y ; « x » : contour dans le plan (z, y), épaisseur selon x.
 */
export function prism(outline: readonly Pt[], options: { from: number; to: number; bevel?: number; axis?: Axis }): MeshData {
  const points = signedArea(outline) < 0 ? [...outline].reverse() : [...outline];
  const bevel = options.bevel ?? 0.08;
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const top: Pt[] = points.map(([x, y]) => [cx + (x - cx) * (1 - bevel), cy + (y - cy) * (1 - bevel)]);
  const place = (point: Pt, w: number): V3 => (options.axis === "x" ? [w, point[1], point[0]] : [point[0], w, point[1]]);
  const mesh = emptyMesh();
  const push = (p: V3) => mesh.positions.push(p[0], p[1], p[2]) && mesh.positions.length / 3 - 1;
  // Une facette = ses propres sommets : arêtes vives, ombrage plat.
  const quad = (a: V3, b: V3, c: V3, d: V3) => {
    const [ia, ib, ic, id] = [push(a), push(b), push(c), push(d)];
    mesh.indices.push(ia, ib, ic, ia, ic, id);
  };
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    quad(place(points[i], options.from), place(points[j], options.from), place(top[j], options.to), place(top[i], options.to));
  }
  const cap = triangulate(points);
  for (let t = 0; t < cap.length; t += 3) {
    const face = [cap[t], cap[t + 1], cap[t + 2]];
    const upper = face.map((i) => push(place(top[i], options.to)));
    const lower = face.map((i) => push(place(points[i], options.from)));
    mesh.indices.push(upper[0], upper[1], upper[2], lower[0], lower[2], lower[1]);
  }
  // Le passage du repère local (u, v, w) à (x, y, z) échange deux axes : le sens des triangles s'inverse. On le rétablit.
  for (let t = 0; t < mesh.indices.length; t += 3) [mesh.indices[t + 1], mesh.indices[t + 2]] = [mesh.indices[t + 2], mesh.indices[t + 1]];
  return mesh;
}

/** Étoile à `points` branches, vue de dessus (plan x, z), pointe vers +z. Étoilée par rapport à son centre : la fan suffit. */
export function starOutline(outer: number, inner: number, points = 5): Pt[] {
  const outline: Pt[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points;
    outline.push([Math.sin(angle) * radius, Math.cos(angle) * radius]);
  }
  return outline;
}

export const ellipseOutline = (rx: number, rz: number, segments = 24): Pt[] =>
  Array.from({ length: segments }, (_, i) => [Math.sin((Math.PI * 2 * i) / segments) * rx, Math.cos((Math.PI * 2 * i) / segments) * rz] as Pt);

/** Applique une transformation à chaque sommet. */
export function mapPoints(mesh: MeshData, fn: (p: V3) => V3): MeshData {
  const positions: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) positions.push(...fn([mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]]));
  return { positions, indices: [...mesh.indices] };
}

export const translate = (mesh: MeshData, [dx, dy, dz]: V3) => mapPoints(mesh, ([x, y, z]) => [x + dx, y + dy, z + dz]);
export const scale = (mesh: MeshData, [sx, sy, sz]: V3) => mapPoints(mesh, ([x, y, z]) => [x * sx, y * sy, z * sz]);

export function rotateX(mesh: MeshData, angle: number): MeshData {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return mapPoints(mesh, ([x, y, z]) => [x, y * c - z * s, y * s + z * c]);
}
export function rotateY(mesh: MeshData, angle: number): MeshData {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return mapPoints(mesh, ([x, y, z]) => [x * c + z * s, y, -x * s + z * c]);
}
export function rotateZ(mesh: MeshData, angle: number): MeshData {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return mapPoints(mesh, ([x, y, z]) => [x * c - y * s, x * s + y * c, z]);
}

/** Symétrie gauche-droite (x → −x) : le sens des triangles est rétabli. */
export function mirrorX(mesh: MeshData): MeshData {
  const out = mapPoints(mesh, ([x, y, z]) => [-x, y, z]);
  for (let t = 0; t < out.indices.length; t += 3) [out.indices[t + 1], out.indices[t + 2]] = [out.indices[t + 2], out.indices[t + 1]];
  return out;
}

/** Normales lissées (somme des normales des triangles voisins, pondérées par leur aire). */
export function computeNormals(mesh: MeshData): number[] {
  const normals = new Array<number>(mesh.positions.length).fill(0);
  const { positions, indices } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    const [i0, i1, i2] = [indices[t], indices[t + 1], indices[t + 2]];
    const ux = positions[i1 * 3] - positions[i0 * 3];
    const uy = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
    const uz = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];
    const vx = positions[i2 * 3] - positions[i0 * 3];
    const vy = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
    const vz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [i0, i1, i2]) {
      normals[i * 3] += nx;
      normals[i * 3 + 1] += ny;
      normals[i * 3 + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  return normals;
}

/** Une coupe du vaisseau : à la position z, demi-largeur w, demi-hauteurs dessus (up) et dessous (down) autour de la hauteur y. */
export interface Section {
  z: number;
  w: number;
  up: number;
  down: number;
  y: number;
  /** Forme de la coupe : 2 = ellipse, plus grand = plus carrée aux coins arrondis. */
  n?: number;
  /** Décalage latéral du centre de la coupe. */
  x?: number;
}

/**
 * Surface « en tranches » le long de z, de la première à la dernière coupe (z croissant) : fuselages, verrières, nez. Chaque coupe est
 * une super-ellipse ; les deux bouts sont fermés par un couvercle aux sommets propres (arête franche entre le couvercle et le flanc).
 */
export function loft(sections: readonly Section[], options: { around?: number } = {}): MeshData {
  const around = options.around ?? 28;
  const mesh = emptyMesh();
  const ring = (s: Section): V3[] =>
    Array.from({ length: around }, (_, j) => {
      const theta = (Math.PI * 2 * j) / around;
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      const e = 2 / (s.n ?? 2.6);
      return [(s.x ?? 0) + s.w * Math.sign(c) * Math.abs(c) ** e, s.y + (sn >= 0 ? s.up : s.down) * Math.sign(sn) * Math.abs(sn) ** e, s.z];
    });
  const rings = sections.map(ring);
  const base = (index: number) => index * around;
  for (const r of rings) for (const p of r) mesh.positions.push(p[0], p[1], p[2]);
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const k = (j + 1) % around;
      const [a, b, c, d] = [base(i) + j, base(i) + k, base(i + 1) + k, base(i + 1) + j];
      mesh.indices.push(a, b, c, a, c, d);
    }
  }
  const cap = (index: number, front: boolean) => {
    const s = sections[index];
    const centre = mesh.positions.length / 3;
    mesh.positions.push(s.x ?? 0, s.y, s.z);
    const start = mesh.positions.length / 3;
    for (const p of rings[index]) mesh.positions.push(p[0], p[1], p[2]);
    for (let j = 0; j < around; j += 1) {
      const k = (j + 1) % around;
      if (front) mesh.indices.push(centre, start + j, start + k);
      else mesh.indices.push(centre, start + k, start + j);
    }
  };
  cap(rings.length - 1, true);
  cap(0, false);
  return mesh;
}
