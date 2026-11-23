// Atelier de l'arbre stylisé (outil de développement, hors du jeu) : un seul arbre, éclairé comme la rivière (soleil,
// ciel, ombres, brume, étalonnage), vu sous plusieurs angles ; `compare` ajoute l'arbre actuel du jeu à côté.
//   tree-showroom.html?view=front|side|back|top|game|mid|far&detail=0|1|2&compare, ou ?view=lods&lods
//   ?view=palettes&palettes : les huit teintes de la forêt ; ?view=sizes&sizes : les trois étages et le sous-bois
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Scene } from "@babylonjs/core/scene";

import { emptyMesh, lathe, type MeshData } from "../src/engine/geometry/kit";
import { broadleafTree } from "../src/engine/geometry/models";
import { createSeeded } from "../src/engine/navigation/seeded";
import { FOREST_PALETTES } from "../src/engine/geometry/trees/forest";
import { stylizedTree, treeStats, TREE_PALETTE } from "../src/engine/geometry/trees/stylizedTree";
import { fern, grassTuft, shrub } from "../src/engine/geometry/trees/undergrowth";
import { createLighting, LIGHTING } from "../src/engine/scene/lighting";

const params = new URLSearchParams(location.search);
const view = params.get("view") ?? "front";
const canvas = document.getElementById("view") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(LIGHTING.skyHorizon.x, LIGHTING.skyHorizon.y, LIGHTING.skyHorizon.z, 1);
const lighting = createLighting(scene);

const toMesh = (name: string, data: MeshData, x = 0) => {
  const mesh = new Mesh(name, scene);
  const v = new VertexData();
  v.positions = data.positions; v.normals = data.normals; v.colors = data.colors; v.indices = data.indices;
  v.applyToMesh(mesh);
  mesh.material = lighting.landscape;
  mesh.receiveShadows = true;
  mesh.position.x = x;
  return mesh;
};
const ground = emptyMesh();
lathe(ground, [[0, 0], [30, -0.05], [60, -0.6]], 32, [0.36, 0.58, 0.2]);
toMesh("ground", ground);
const detail = Number(params.get("detail") ?? "0") as 0 | 1 | 2 | 3;
const lods = params.has("lods");
const data = stylizedTree(createSeeded(7), detail);
const casters: Mesh[] = [];
const all: Record<string, unknown> = {};
if (params.has("palettes")) {
  // Les huit teintes, même arbre, même tirage : seule la couleur change.
  FOREST_PALETTES.forEach((entry, i) => {
    const mesh = toMesh(`tree-${i}`, stylizedTree(createSeeded(7), 0, entry.palette), (i - 3.5) * 7.2);
    mesh.position.z = (i % 2) * 5;
    mesh.rotation.y = i * 0.7;
    casters.push(mesh);
  });
  all.palettes = FOREST_PALETTES.map((entry) => entry.name);
} else if (params.has("sizes")) {
  // Les trois étages (jeune arbre, étage moyen, canopée), avec leurs largeurs, puis le sous-bois.
  const layers: [number, number, number][] = [[0.5, 0.95, -9], [0.82, 1.12, -3.5], [1.25, 0.9, 4.5]];
  layers.forEach(([scale, width, x], i) => {
    const mesh = toMesh(`tree-${i}`, stylizedTree(createSeeded(7), 0, FOREST_PALETTES[[3, 1, 0][i]].palette), x);
    mesh.scaling.set(scale * width, scale, scale * width);
    mesh.rotation.y = i * 1.4;
    casters.push(mesh);
  });
  const plants: [MeshData, number][] = [[shrub(createSeeded(11), FOREST_PALETTES[0].palette), 10.2], [fern(createSeeded(13), FOREST_PALETTES[2].palette), 12.4], [grassTuft(createSeeded(17), TREE_PALETTE), 14]];
  plants.forEach(([plant, x], i) => {
    const mesh = toMesh(`plant-${i}`, plant, x);
    mesh.scaling.setAll(1.3);
    casters.push(mesh);
  });
  all.sizes = "jeune 0,5 · moyen 0,82 · canopée 1,25 · arbuste · plante · herbes";
} else if (lods) {
  ([0, 1, 2, 3] as const).forEach((level) => {
    const lod = stylizedTree(createSeeded(7), level);
    casters.push(toMesh(`tree-${level}`, lod, (level - 1.5) * 8.5));
    all[`detail${level}`] = treeStats(lod);
  });
} else {
  casters.push(toMesh("tree", data, params.has("compare") ? -3.5 : 0));
}
if (params.has("compare")) {
  const old = toMesh("old-tree", broadleafTree(createSeeded(7)).lit, 3.5);
  casters.push(old);
}
lighting.setShadowRegion(new Vector3(0, 0, 0), casters);

const cameras: Record<string, [Vector3, Vector3, number]> = {
  front: [new Vector3(0, 3.6, -14), new Vector3(0, 3.3, 0), 0.8],
  side: [new Vector3(-14, 3.6, 0), new Vector3(0, 3.3, 0), 0.8],
  back: [new Vector3(2, 4, 14), new Vector3(0, 3.3, 0), 0.8],
  top: [new Vector3(-7, 11, -7), new Vector3(0, 3, 0), 0.75],
  game: [new Vector3(-6, 3.7, -26), new Vector3(0, 2.5, 0), 0.9],
  lods: [new Vector3(0, 4.5, -28), new Vector3(0, 3.6, 0), 0.8],
  palettes: [new Vector3(0, 6.5, -40), new Vector3(0, 3.4, 2), 0.82],
  sizes: [new Vector3(2.5, 4.5, -27), new Vector3(2.5, 3.6, 0), 0.82],
  mid: [new Vector3(-10, 4.5, -45), new Vector3(0, 3, 0), 0.9],
  far: [new Vector3(-15, 6, -110), new Vector3(0, 3, 0), 0.9],
};
const [eye, target, fov] = cameras[view] ?? cameras.front;
const camera = new TargetCamera("camera", eye, scene);
camera.setTarget(target);
camera.fov = fov;
camera.minZ = 0.1;
scene.activeCamera = camera;

const stats = lods || params.has("palettes") || params.has("sizes") ? all : treeStats(data);
(window as unknown as { treeStats: unknown }).treeStats = stats;
(document.getElementById("stats") as HTMLElement).textContent = `${view} · ${JSON.stringify(stats)}`;
engine.runRenderLoop(() => scene.render());
scene.executeWhenReady(() => setTimeout(() => ((window as unknown as { treeReady: boolean }).treeReady = true), 500));
