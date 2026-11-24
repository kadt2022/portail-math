// Atelier de géométrie en TypeScript pur : des formes simples (boîte, cylindre, sphère, tour…), colorées par sommet,
// posées avec une transformation, puis fusionnées en un seul maillage. Les modèles se construisent sans rien
// télécharger, et le nombre d'appels de dessin reste bas.
//
// Repris de la Rivière des fractions (même auteur, écrit pour Yamba), sans la coque de bateau ; ajout du balayage le
// long d'un chemin (rails, ballast, tunnels, voûtes), écrit pour le Train des multiplications.

/**
 * Couleur d'un sommet : rouge, vert, bleu (0 à 1), et, en option, la famille de matériau (voir `MATERIAL`, dans
 * `palette.ts`) : béton, peinture, acier, laiton, bois, verre… Le rendu en tire des sous-maillages, un matériau PBR par
 * famille ; la géométrie, elle, n'a pas à s'en soucier.
 */
export type Color = readonly [number, number, number, number?];

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

export type Vec3 = [number, number, number];

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
    target.colors.push(c[0], c[1], c[2], c[3] ?? 0);
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
    target.colors.push(Math.min(1, source.colors[i] * tr), Math.min(1, source.colors[i + 1] * tg), Math.min(1, source.colors[i + 2] * tb), source.colors[i + 3]);
  }
  for (const index of source.indices) target.indices.push(base + index);
}

export function merge(target: MeshData, source: MeshData): void {
  const base = target.positions.length / 3;
  // Boucles plutôt que push(...source) : un ouvrage entier dépasserait la pile d'appels.
  for (const v of source.positions) target.positions.push(v);
  for (const v of source.normals) target.normals.push(v);
  for (const v of source.colors) target.colors.push(v);
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

/** Nombre de sommets d'un maillage (pour mesurer et tester les budgets). */
export function vertexCount(mesh: MeshData): number {
  return mesh.positions.length / 3;
}

export function scaleColor(color: Color, factor: number): Color {
  return [Math.min(1, color[0] * factor), Math.min(1, color[1] * factor), Math.min(1, color[2] * factor), color[3]];
}

export function mixColor(a: Color, b: Color, t: number): Color {
  // La famille de matériau suit la couleur dominante du mélange.
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, t < 0.5 ? a[3] : b[3]];
}

/** Repère le long d'un chemin : point, direction latérale (droite) et haut. */
export interface Frame {
  p: Vec3;
  right: Vec3;
  up: Vec3;
}

/**
 * Balaye un profil 2D (x vers la droite, y vers le haut) le long d'une suite de repères : rails, ballast, voûte de
 * tunnel, parapets. `closed` referme le profil sur lui-même. La couleur peut dépendre du sommet du profil et du rang du
 * repère (bandes de pierre, joints, usure).
 */
export function sweep(target: MeshData, profile: readonly (readonly [number, number])[], frames: readonly Frame[], color: Color | ((vertex: number, ring: number) => Color), closed = false): void {
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const triangles: number[] = [];
  frames.forEach((f, ring) => {
    profile.forEach(([px, py], v) => {
      vertices.push([f.p[0] + f.right[0] * px + f.up[0] * py, f.p[1] + f.right[1] * px + f.up[1] * py, f.p[2] + f.right[2] * px + f.up[2] * py]);
      colors.push(typeof color === "function" ? color(v, ring) : color);
    });
  });
  const n = profile.length;
  const edges = closed ? n : n - 1;
  for (let ring = 0; ring < frames.length - 1; ring += 1) {
    for (let v = 0; v < edges; v += 1) {
      const a = ring * n + v;
      const b = ring * n + ((v + 1) % n);
      triangles.push(a, b, a + n, b, b + n, a + n);
    }
  }
  addShape(target, vertices, triangles, colors);
}

/** Triangle ou polygone convexe plat, en éventail depuis son premier sommet. */
export function polygon(target: MeshData, points: readonly Vec3[], color: Color, transform?: Transform): void {
  const triangles: number[] = [];
  for (let i = 1; i < points.length - 1; i += 1) triangles.push(0, i, i + 1);
  addShape(target, points, triangles, color, transform);
}

/** Cylindre couché le long de l'axe z (chaudière, tampons, essieux…), centré sur l'origine. */
export function cylinderZ(target: MeshData, radius: number, length: number, segments: number, color: Color, transform: Transform = {}, radiusEnd = radius): void {
  const vertices: Vec3[] = [];
  const triangles: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push([Math.cos(a) * radius, Math.sin(a) * radius, -length / 2], [Math.cos(a) * radiusEnd, Math.sin(a) * radiusEnd, length / 2]);
  }
  for (let i = 0; i < segments; i += 1) {
    const b = i * 2;
    triangles.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  addShape(target, vertices, triangles, color, transform);
  for (const [z, r, flip] of [[-length / 2, radius, true], [length / 2, radiusEnd, false]] as const) {
    const cap: Vec3[] = [[0, 0, z]];
    const capTriangles: number[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      cap.push([Math.cos(a) * r, Math.sin(a) * r, z]);
      if (i > 0) capTriangles.push(...(flip ? [0, i, i + 1] : [0, i + 1, i]));
    }
    addShape(target, cap, capTriangles, color, transform);
  }
}

/** Cylindre couché le long de l'axe x (essieux, roues), centré sur l'origine. */
export function cylinderX(target: MeshData, radius: number, length: number, segments: number, color: Color, transform: Transform = {}): void {
  const local = emptyMesh();
  cylinderZ(local, radius, length, segments, color);
  place(target, local, { ...transform, yaw: (transform.yaw ?? 0) + Math.PI / 2 });
}
