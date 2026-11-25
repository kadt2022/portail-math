import type { Material } from "@babylonjs/core/Materials/material";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import type { Scene } from "@babylonjs/core/scene";

import type { MeshData } from "../geometry/kit";
import { MATERIAL_COUNT, type MaterialClass } from "../geometry/palette";
import { OUTDOOR } from "./lighting";
import type { MaterialSet } from "./materials";

// Passage de la géométrie procédurale (MeshData, TypeScript pur) aux maillages de Babylon.js. Avec un jeu de
// matériaux PBR, les triangles sont regroupés par famille de matériau (portée par chaque sommet) : un sous-maillage
// par famille présente, donc un appel de dessin par famille, et les couleurs passent en espace linéaire comme le veut
// le rendu physique.
//
// Écrit pour Yamba.

const toLinear = (c: number) => Math.pow(c, 2.2);

export function toVertexData(data: MeshData, linear = false): VertexData {
  const vertexData = new VertexData();
  vertexData.positions = new Float32Array(data.positions);
  vertexData.normals = new Float32Array(data.normals);
  const colors = new Float32Array(data.colors.length);
  for (let i = 0; i < colors.length; i += 4) {
    colors[i] = linear ? toLinear(data.colors[i]) : data.colors[i];
    colors[i + 1] = linear ? toLinear(data.colors[i + 1]) : data.colors[i + 1];
    colors[i + 2] = linear ? toLinear(data.colors[i + 2]) : data.colors[i + 2];
    // Le quatrième canal porte la famille de matériau, pas une transparence.
    colors[i + 3] = 1;
  }
  vertexData.colors = colors;
  vertexData.indices = data.positions.length / 3 > 65535 ? new Uint32Array(data.indices) : new Uint16Array(data.indices);
  return vertexData;
}

export interface MeshOptions {
  layer?: number;
  receiveShadows?: boolean;
  pickable?: boolean;
  /** Tout le maillage dans une seule famille (versions lointaines : un seul appel de dessin). */
  single?: MaterialClass;
  /** Garder la géométrie source (pour fusionner plus tard le décor par zones). */
  keep?: boolean;
}

/** Familles présentes, triangles regroupés par famille : indices réordonnés et plages [famille, début, nombre]. */
export function groupByFamily(data: MeshData, single?: MaterialClass): { indices: number[]; ranges: [number, number, number][] } {
  const count = data.indices.length / 3;
  const family = (t: number) => (single ?? Math.round(data.colors[data.indices[t * 3] * 4 + 3] ?? 0)) % MATERIAL_COUNT;
  const buckets: number[][] = Array.from({ length: MATERIAL_COUNT }, () => []);
  for (let t = 0; t < count; t += 1) buckets[family(t)].push(t);
  const indices: number[] = [];
  const ranges: [number, number, number][] = [];
  buckets.forEach((triangles, k) => {
    if (!triangles.length) return;
    ranges.push([k, indices.length, triangles.length * 3]);
    for (const t of triangles) indices.push(data.indices[t * 3], data.indices[t * 3 + 1], data.indices[t * 3 + 2]);
  });
  return { indices, ranges };
}

const isSet = (m: Material | MaterialSet): m is MaterialSet => "multi" in m && "parts" in m;

/** Maillage figé (décor, ouvrages) ou modèle à instancier : couleurs par sommet, matériau partagé, calque d'éclairage. */
export function makeMesh(scene: Scene, name: string, data: MeshData, material: Material | MaterialSet, options: MeshOptions = {}): Mesh {
  const mesh = new Mesh(name, scene);
  if (isSet(material)) {
    const { indices, ranges } = groupByFamily(data, options.single);
    const vertexData = toVertexData({ ...data, indices }, true);
    vertexData.applyToMesh(mesh, false);
    mesh.material = material.multi;
    const vertices = data.positions.length / 3;
    mesh.subMeshes = [];
    for (const [k, start, length] of ranges) new SubMesh(k, 0, vertices, start, length, mesh);
    if (options.keep) mesh.metadata = { source: data };
  } else {
    toVertexData(data).applyToMesh(mesh, false);
    mesh.material = material;
  }
  mesh.layerMask = options.layer ?? OUTDOOR;
  mesh.receiveShadows = options.receiveShadows ?? true;
  mesh.isPickable = options.pickable ?? false;
  return mesh;
}
