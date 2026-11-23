// Atelier de géométrie en TypeScript pur : des formes simples (boîte, cylindre, sphère, tour, coque…), colorées par
// sommet, posées avec une transformation, puis fusionnées en un seul maillage par morceau de paysage. Les modèles se
// réutilisent sans rien télécharger, et le nombre d'appels de dessin reste bas.

export type Color = readonly [number, number, number];

export interface Transform {
  x?: number;
  y?: number;
  z?: number;
  /** Rotation autour de l'axe vertical (radians). */
  yaw?: number;
  /** Inclinaison autour de l'axe x local (radians), appliquée avant le cap. */
  pitch?: number;
  /** Roulis autour de l'axe z local (radians), appliqué avant le cap. */
  roll?: number;
  scale?: number | readonly [number, number, number];
}

export interface MeshData {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

export function emptyMesh(): MeshData {
  return { positions: [], normals: [], colors: [], indices: [] };
}

type Vec3 = [number, number, number];

function applyTransform(point: Vec3, t: Transform): Vec3 {
  const scale = t.scale ?? 1;
  const [sx, sy, sz] = typeof scale === "number" ? [scale, scale, scale] : scale;
  let x = point[0] * sx;
  let y = point[1] * sy;
  let z = point[2] * sz;
  if (t.roll) {
    const c = Math.cos(t.roll);
    const s = Math.sin(t.roll);
    [x, y] = [x * c - y * s, x * s + y * c];
  }
  if (t.pitch) {
    const c = Math.cos(t.pitch);
    const s = Math.sin(t.pitch);
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  if (t.yaw) {
    const c = Math.cos(t.yaw);
    const s = Math.sin(t.yaw);
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  return [x + (t.x ?? 0), y + (t.y ?? 0), z + (t.z ?? 0)];
}

/** Normales lissées à l'intérieur de la forme ajoutée (les formes ne partagent pas leurs sommets). */
function computeNormals(positions: readonly number[], indices: readonly number[], from: number, to: number, firstIndex: number): number[] {
  const normals = new Array((to - from) * 3).fill(0);
  for (let i = firstIndex; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2];
    const e1 = [positions[b * 3] - ax, positions[b * 3 + 1] - ay, positions[b * 3 + 2] - az];
    const e2 = [positions[c * 3] - ax, positions[c * 3 + 1] - ay, positions[c * 3 + 2] - az];
    // Repère main gauche (Babylon) : ordre des sommets dans le sens des aiguilles vu de face.
    const nx = e1[2] * e2[1] - e1[1] * e2[2];
    const ny = e1[0] * e2[2] - e1[2] * e2[0];
    const nz = e1[1] * e2[0] - e1[0] * e2[1];
    for (const v of [a, b, c]) {
      const o = (v - from) * 3;
      normals[o] += nx;
      normals[o + 1] += ny;
      normals[o + 2] += nz;
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

/**
 * Ajoute une forme décrite par des sommets locaux et des triangles, avec sa couleur (une par sommet, ou une pour
 * toute la forme) et sa transformation.
 */
export function addShape(target: MeshData, vertices: readonly Vec3[], triangles: readonly number[], color: Color | readonly Color[], transform: Transform = {}): void {
  const base = target.positions.length / 3;
  const firstIndex = target.indices.length;
  vertices.forEach((vertex, i) => {
    const [x, y, z] = applyTransform(vertex, transform);
    target.positions.push(x, y, z);
    const c = Array.isArray(color[0]) ? (color as readonly Color[])[i] : (color as Color);
    target.colors.push(c[0], c[1], c[2], 1);
  });
  for (const index of triangles) target.indices.push(base + index);
  target.normals.push(...computeNormals(target.positions, target.indices, base, base + vertices.length, firstIndex));
}

/** Pose un modèle déjà construit (en coordonnées locales) avec une transformation : position, cap, échelle. */
export function place(target: MeshData, source: MeshData, transform: Transform, tint?: Color): void {
  const base = target.positions.length / 3;
  const rotation: Transform = { yaw: transform.yaw, pitch: transform.pitch, roll: transform.roll };
  for (let i = 0; i < source.positions.length; i += 3) {
    const [x, y, z] = applyTransform([source.positions[i], source.positions[i + 1], source.positions[i + 2]], transform);
    target.positions.push(x, y, z);
    const [nx, ny, nz] = applyTransform([source.normals[i], source.normals[i + 1], source.normals[i + 2]], rotation);
    target.normals.push(nx, ny, nz);
  }
  const [tr, tg, tb] = tint ?? [1, 1, 1];
  for (let i = 0; i < source.colors.length; i += 4) {
    target.colors.push(Math.min(1, source.colors[i] * tr), Math.min(1, source.colors[i + 1] * tg), Math.min(1, source.colors[i + 2] * tb), 1);
  }
  for (const index of source.indices) target.indices.push(base + index);
}

export function merge(target: MeshData, source: MeshData): void {
  const base = target.positions.length / 3;
  target.positions.push(...source.positions);
  target.normals.push(...source.normals);
  target.colors.push(...source.colors);
  for (const index of source.indices) target.indices.push(base + index);
}

/** Boîte centrée sur l'origine en x/z, posée sur y = 0. */
export function box(target: MeshData, width: number, height: number, depth: number, color: Color, transform?: Transform): void {
  const w = width / 2;
  const d = depth / 2;
  const faces: [Vec3, Vec3, Vec3, Vec3][] = [
    [[-w, 0, -d], [-w, height, -d], [w, height, -d], [w, 0, -d]],
    [[w, 0, d], [w, height, d], [-w, height, d], [-w, 0, d]],
    [[-w, 0, d], [-w, height, d], [-w, height, -d], [-w, 0, -d]],
    [[w, 0, -d], [w, height, -d], [w, height, d], [w, 0, d]],
    [[-w, height, -d], [-w, height, d], [w, height, d], [w, height, -d]],
    [[-w, 0, d], [-w, 0, -d], [w, 0, -d], [w, 0, d]],
  ];
  for (const face of faces) addShape(target, face, [0, 1, 2, 0, 2, 3], color, transform);
}

/** Tronc de cône (ou cylindre) vertical, de y = 0 à y = height. */
export function cylinder(target: MeshData, radiusBottom: number, radiusTop: number, height: number, segments: number, color: Color, transform?: Transform, caps = true): void {
  const vertices: Vec3[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push([Math.cos(a) * radiusBottom, 0, Math.sin(a) * radiusBottom], [Math.cos(a) * radiusTop, height, Math.sin(a) * radiusTop]);
  }
  for (let i = 0; i < segments; i += 1) {
    const b = i * 2;
    triangles.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  addShape(target, vertices, triangles, color, transform);
  if (caps && radiusTop > 0) {
    const cap: Vec3[] = [[0, height, 0]];
    const capTriangles: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      cap.push([Math.cos(a) * radiusTop, height, Math.sin(a) * radiusTop]);
      if (i > 0) capTriangles.push(0, i + 1, i);
    }
    addShape(target, cap, capTriangles, color, transform);
  }
}

/**
 * Forme de révolution autour de l'axe vertical : profil [rayon, hauteur] de bas en haut. `wobble` déforme chaque
 * sommet (relief des montagnes, feuillage irrégulier).
 */
export function lathe(target: MeshData, profile: readonly (readonly [number, number])[], segments: number, color: Color | ((height: number, ring: number, angle: number) => Color), transform?: Transform, wobble?: (ring: number, angle: number) => number): void {
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const triangles: number[] = [];
  profile.forEach(([radius, height], ring) => {
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius * (wobble ? wobble(ring, i % segments) : 1);
      vertices.push([Math.cos(angle) * r, height, Math.sin(angle) * r]);
      colors.push(typeof color === "function" ? color(height, ring, angle) : color);
    }
  });
  const row = segments + 1;
  for (let ring = 0; ring < profile.length - 1; ring += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = ring * row + i;
      triangles.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  addShape(target, vertices, triangles, colors, transform);
}

/** Sphère basse définition (feuillage, têtes, lanternes). */
export function sphere(target: MeshData, radius: number, color: Color | ((height: number, ring: number, angle: number) => Color), transform?: Transform, detail = 6, wobble?: (ring: number, angle: number) => number): void {
  const profile: [number, number][] = [];
  for (let i = 0; i <= detail; i += 1) {
    const a = (i / detail) * Math.PI - Math.PI / 2;
    profile.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  lathe(target, profile, detail * 2, color, transform, wobble);
}

/**
 * Quadrilatère plat, défini par ses quatre coins. Les matériaux du jeu dessinent les deux faces et tournent la
 * normale vers la caméra : l'ordre des sommets n'a pas d'importance, seule sa cohérence dans une forme compte.
 */
export function quad(target: MeshData, corners: readonly [Vec3, Vec3, Vec3, Vec3], color: Color, transform?: Transform): void {
  addShape(target, corners, [0, 1, 2, 0, 2, 3], color, transform);
}

/**
 * Coque de bateau : sections en U le long de la longueur (axe z), pointues à la proue, arrondies à la poupe.
 * `plank` alterne deux teintes de bois par rangée de planches.
 */
export function hull(target: MeshData, length: number, beam: number, depth: number, wood: Color, plank: Color, transform?: Transform): void {
  const sections = 12;
  const around = 6;
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= sections; i += 1) {
    const t = i / sections;
    const z = (t - 0.5) * length;
    // Proue fine (t → 1), poupe large et carrée (t → 0).
    const width = (beam / 2) * Math.sqrt(Math.max(0, Math.sin(Math.PI * (0.14 + 0.86 * t))));
    const keel = depth * (0.75 + 0.25 * Math.sin(Math.PI * t));
    const lift = t > 0.8 ? (t - 0.8) * depth * 1.8 : 0;
    for (let j = 0; j <= around; j += 1) {
      const a = (j / around) * Math.PI; // de bâbord à tribord en passant par la quille
      const x = -Math.cos(a) * Math.max(width, 0.02);
      const y = -Math.sin(a) * keel + depth * 0.15 + lift * (1 - Math.sin(a));
      vertices.push([x, y + depth * 0.85, z]);
      colors.push(j % 2 === 0 ? wood : plank);
    }
  }
  const row = around + 1;
  for (let i = 0; i < sections; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const a = i * row + j;
      triangles.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  addShape(target, vertices, triangles, colors, transform);
}

/** Nombre de sommets d'un maillage (pour mesurer et tester les budgets). */
export function vertexCount(mesh: MeshData): number {
  return mesh.positions.length / 3;
}

export function scaleColor(color: Color, factor: number): Color {
  return [Math.min(1, color[0] * factor), Math.min(1, color[1] * factor), Math.min(1, color[2] * factor)];
}

export function mixColor(a: Color, b: Color, t: number): Color {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
