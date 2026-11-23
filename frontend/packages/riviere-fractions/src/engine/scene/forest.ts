import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Material } from "@babylonjs/core/Materials/material";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import type { MeshData } from "../geometry/kit";
import { createSeeded } from "../navigation/seeded";
import { FOREST_PALETTES, plantMatrix, UNDERGROWTH_PALETTES, type Forest } from "../geometry/trees/forest";
import { stylizedTree, type TreeDetail } from "../geometry/trees/stylizedTree";
import { fern, grassTuft, shrub, type UndergrowthKind } from "../geometry/trees/undergrowth";

// La forêt à l'écran. Chaque modèle (l'arbre dans une teinte, un arbuste, une plante, une touffe d'herbe) est construit
// une fois par niveau de détail ; chaque plante de la forêt n'est qu'une matrice et une couleur dans le tampon
// d'instances du maillage qui lui correspond. Quand la caméra a bougé de quelques mètres ou tourné, chaque plante est
// rangée selon sa distance : un niveau de détail, ou rien (trop loin, ou hors du champ de la caméra).
//
// L'instanciation économise la mémoire et les appels de dessin, pas les triangles : c'est la répartition par distance
// qui les limite. Le nombre d'appels de dessin ne dépend pas du nombre de plantes.
//
// Écrit pour Yamba, avec les instances légères (« thin instances ») de Babylon.js.

/** Distances maximales (m) de chaque niveau de détail de l'arbre : premier plan, moyen, lointain, très lointain. */
export const TREE_RANGES = [15, 32, 62, 420] as const;
/** Sans le niveau très lointain (pour comparer) : le lointain va jusqu'au bout. */
export const TREE_RANGES_THREE = [15, 32, 420] as const;
/** Distances maximales du sous-bois. */
export const UNDERGROWTH_RANGES: Readonly<Record<UndergrowthKind, readonly number[]>> = { shrub: [22, 70], fern: [40], grass: [28] };
const MARGIN = 3;
const REFRESH_STEP = 2.5;
const REFRESH_TURN = 0.06;
/**
 * Les plantes hors du champ ne sont pas dessinées, sauf tout près (ombres et bords de l'image). La caméra du jeu voit
 * au plus 46° de part et d'autre du regard (paysage) ; on garde jusqu'à 72°, la marge couvrant les couronnes qui
 * débordent dans l'image.
 */
const BEHIND_KEEP = 16;
const VIEW_COS = 0.3;

export interface ForestOptions {
  /** Niveau très lointain de l'arbre au-delà de 90 m (activé par défaut). */
  farLevel?: boolean;
  /** Sous-bois (activé par défaut). */
  undergrowth?: boolean;
}

export interface ForestStats {
  trees: number;
  plants: number;
  /** Arbres dessinés à chaque niveau de détail. */
  treesPerLevel: number[];
  /** Plantes du sous-bois dessinées. */
  plantsDrawn: number;
  /** Triangles dans l'image : arbres, sous-bois. */
  treeTriangles: number;
  plantTriangles: number;
  /** Maillages de la forêt dessinés (un appel de dessin chacun, plus un par passe d'ombre). */
  drawCalls: number;
  /** Mémoire graphique (octets) : géométrie de tous les modèles, et tampons d'instances. */
  geometryBytes: number;
  instanceBytes: number;
}

export interface SceneForest {
  /** Les maillages qui projettent une ombre (arbres et arbustes). */
  casters: Mesh[];
  meshes: Mesh[];
  update(eye: Vector3, forward: Vector3): void;
  stats(): ForestStats;
}

interface Group {
  mesh: Mesh;
  matrices: Float32Array;
  colors: Float32Array;
  count: number;
  triangles: number;
}

interface Item {
  x: number;
  z: number;
  matrix: Float32Array;
  color: readonly [number, number, number];
  /** Un groupe par niveau de détail. */
  groups: (Group | null)[];
  ranges: readonly number[];
  tree: boolean;
  level: number;
  /** Mètres ajoutés à la distance pour choisir le niveau : un arbre de l'intérieur, caché par le premier rang, passe plus tôt aux versions légères. */
  bias: number;
}

function toVertexData(data: MeshData): VertexData {
  const vertexData = new VertexData();
  vertexData.positions = new Float32Array(data.positions);
  vertexData.normals = new Float32Array(data.normals);
  vertexData.colors = new Float32Array(data.colors);
  vertexData.indices = data.positions.length / 3 > 65535 ? new Uint32Array(data.indices) : new Uint16Array(data.indices);
  return vertexData;
}

export function createForest(scene: Scene, material: Material, forest: Forest, options: ForestOptions = {}): SceneForest | null {
  const plants = options.undergrowth === false ? [] : forest.undergrowth;
  if (forest.trees.length === 0 && plants.length === 0) return null;
  const treeRanges: readonly number[] = options.farLevel === false ? TREE_RANGES_THREE : TREE_RANGES;
  const treeLevels: TreeDetail[] = options.farLevel === false ? [0, 1, 2] : [0, 1, 2, 3];
  let geometryBytes = 0;
  let instanceBytes = 0;
  const groups: Group[] = [];
  const casters: Mesh[] = [];

  const makeGroup = (name: string, data: MeshData, capacity: number, caster: boolean): Group => {
    const vertices = data.positions.length / 3;
    geometryBytes += vertices * 40 + data.indices.length * (vertices > 65535 ? 4 : 2);
    instanceBytes += capacity * 80;
    const mesh = new Mesh(name, scene);
    toVertexData(data).applyToMesh(mesh, false);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    const matrices = new Float32Array(Math.max(1, capacity) * 16);
    const colors = new Float32Array(Math.max(1, capacity) * 4);
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
    mesh.thinInstanceSetBuffer("color", colors, 4, false);
    mesh.thinInstanceCount = 0;
    mesh.setEnabled(false);
    const group = { mesh, matrices, colors, count: 0, triangles: data.indices.length / 3 };
    groups.push(group);
    if (caster) casters.push(mesh);
    return group;
  };

  // L'arbre : une série de maillages par teinte utilisée, même tirage (forme identique) pour toutes.
  const treeGroups = FOREST_PALETTES.map((entry, p) => {
    const capacity = forest.trees.filter((tree) => tree.palette === p).length;
    if (capacity === 0) return null;
    return treeLevels.map((level) => makeGroup(`forest-tree-${p}-${level}`, stylizedTree(createSeeded(7), level, entry.palette), capacity, true));
  });
  // Le sous-bois : chaque espèce, chaque teinte.
  const makers: Record<UndergrowthKind, (palette: (typeof FOREST_PALETTES)[number]["palette"], level: number) => MeshData> = {
    shrub: (palette, level) => shrub(createSeeded(11), palette, level === 1),
    fern: (palette) => fern(createSeeded(13), palette),
    grass: (palette) => grassTuft(createSeeded(17), palette),
  };
  const plantGroups = {} as Record<UndergrowthKind, Group[][]>;
  for (const kind of ["shrub", "fern", "grass"] as const) {
    plantGroups[kind] = UNDERGROWTH_PALETTES[kind].map((p, variant) => {
      const capacity = plants.filter((plant) => plant.kind === kind && plant.variant === variant).length;
      if (capacity === 0) return [];
      return UNDERGROWTH_RANGES[kind].map((_, level) => makeGroup(`forest-${kind}-${variant}-${level}`, makers[kind](FOREST_PALETTES[p].palette, level), capacity, kind === "shrub"));
    });
  }

  const items: Item[] = [
    ...forest.trees.map((tree) => ({ x: tree.x, z: tree.z, matrix: plantMatrix(tree), color: tree.tint, groups: treeGroups[tree.palette] ?? [], ranges: treeRanges, tree: true, level: -1, bias: Math.min(20, Math.max(0, tree.inland - 18)) })),
    ...plants.map((plant) => ({ x: plant.x, z: plant.z, matrix: plantMatrix(plant), color: plant.tint, groups: plantGroups[plant.kind][plant.variant], ranges: UNDERGROWTH_RANGES[plant.kind], tree: false, level: -1, bias: 0 })),
  ];

  const pickLevel = (distance: number, current: number, ranges: readonly number[]) => {
    // Une plante ne change de niveau qu'une fois la marge franchie : pas de va-et-vient à la limite.
    for (let l = 0; l < ranges.length; l += 1) {
      const limit = current < 0 ? ranges[l] : current <= l ? ranges[l] + MARGIN : ranges[l] - MARGIN;
      if (distance < limit) return l;
    }
    return -1;
  };

  const last = { x: Number.NaN, z: Number.NaN, fx: 0, fz: 0 };
  const treesPerLevel = treeLevels.map(() => 0);
  let plantsDrawn = 0;

  return {
    casters,
    meshes: groups.map((group) => group.mesh),
    update(eye, forward) {
      const flat = Math.hypot(forward.x, forward.z) || 1;
      const fx = forward.x / flat;
      const fz = forward.z / flat;
      const turned = Math.acos(Math.min(1, fx * last.fx + fz * last.fz));
      if (Math.hypot(eye.x - last.x, eye.z - last.z) < REFRESH_STEP && turned < REFRESH_TURN) return;
      Object.assign(last, { x: eye.x, z: eye.z, fx, fz });
      for (const group of groups) group.count = 0;
      treesPerLevel.fill(0);
      plantsDrawn = 0;
      for (const item of items) {
        const dx = item.x - eye.x;
        const dz = item.z - eye.z;
        const distance = Math.hypot(dx, dz);
        const inView = distance < BEHIND_KEEP || (dx * fx + dz * fz) / distance > VIEW_COS;
        item.level = inView ? pickLevel(distance + item.bias, item.level, item.ranges) : -1;
        const group = item.level >= 0 ? item.groups[item.level] : null;
        if (!group) continue;
        group.matrices.set(item.matrix, group.count * 16);
        group.colors[group.count * 4] = item.color[0];
        group.colors[group.count * 4 + 1] = item.color[1];
        group.colors[group.count * 4 + 2] = item.color[2];
        group.colors[group.count * 4 + 3] = 1;
        group.count += 1;
        if (item.tree) treesPerLevel[item.level] += 1;
        else plantsDrawn += 1;
      }
      for (const group of groups) {
        group.mesh.thinInstanceCount = group.count;
        group.mesh.setEnabled(group.count > 0);
        if (group.count === 0) continue;
        group.mesh.thinInstanceBufferUpdated("matrix");
        group.mesh.thinInstanceBufferUpdated("color");
        group.mesh.thinInstanceRefreshBoundingInfo(false);
      }
    },
    stats() {
      let treeTriangles = 0;
      let plantTriangles = 0;
      let drawCalls = 0;
      for (const group of groups) {
        if (group.count === 0) continue;
        drawCalls += 1;
        if (group.mesh.name.startsWith("forest-tree")) treeTriangles += group.count * group.triangles;
        else plantTriangles += group.count * group.triangles;
      }
      return {
        trees: forest.trees.length,
        plants: plants.length,
        treesPerLevel: [...treesPerLevel],
        plantsDrawn,
        treeTriangles,
        plantTriangles,
        drawCalls,
        geometryBytes,
        instanceBytes,
      };
    },
  };
}
