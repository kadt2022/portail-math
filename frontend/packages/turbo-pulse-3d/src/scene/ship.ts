import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

import { computeNormals, type MeshData } from "../ship/geometry";
import { ALL_PARTS, buildPart, type MaterialRole } from "../ship/shipParts";
import { PALETTES, type PartId, type ShipSpec } from "../ship/shipSpec";
import type { ShipMaterials } from "./materials";

// Le vaisseau dans la scène : un nœud racine, un sous-nœud par grande partie, et dans chaque partie un seul maillage par matériau.
// Changer de palette ne reconstruit rien ; changer de variante (ailes, moteurs) reconstruit seulement cette partie ; le bouclier
// s'allume et s'éteint.
//
// Les triangles de la géométrie pure tournent « sens inverse des aiguilles d'une montre vu de l'extérieur » ; Babylon.js attend l'inverse
// dans son repère : on les retourne ici, une seule fois, et les normales (déjà calculées vers l'extérieur) ne bougent pas.

export interface Ship {
  readonly root: TransformNode;
  readonly parts: ReadonlyMap<PartId, TransformNode>;
  /** Applique la fiche : palette, variantes, bouclier. */
  apply(spec: ShipSpec): void;
  /** Nombre de triangles et de maillages visibles. */
  stats(): { triangles: number; meshes: number };
  dispose(): void;
}

export function toBabylonMesh(scene: Scene, name: string, data: MeshData): Mesh {
  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = data.positions;
  vertexData.normals = computeNormals(data);
  const indices = [...data.indices];
  for (let t = 0; t < indices.length; t += 3) [indices[t + 1], indices[t + 2]] = [indices[t + 2], indices[t + 1]];
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh);
  return mesh;
}

export function createShip(scene: Scene, materials: ShipMaterials, initial: ShipSpec): Ship {
  const root = new TransformNode("ship", scene);
  const parts = new Map<PartId, TransformNode>();
  let spec = initial;

  const build = (part: PartId) => {
    parts.get(part)?.dispose(false, false);
    const node = new TransformNode(`ship-${part}`, scene);
    node.parent = root;
    parts.set(part, node);
    const geometry = buildPart(part, spec);
    for (const [role, data] of Object.entries(geometry) as [MaterialRole, MeshData][]) {
      const mesh = toBabylonMesh(scene, `ship-${part}-${role}`, data);
      mesh.material = part === "shield" ? materials.shield : materials.roles[role];
      mesh.parent = node;
      mesh.isPickable = false;
      if (part !== "shield") mesh.metadata = { caster: true };
    }
    node.setEnabled(part !== "shield" || spec.shield);
  };

  materials.applyPalette(PALETTES[spec.palette]);
  for (const part of ALL_PARTS) build(part);

  return {
    root,
    parts,
    apply(next) {
      const before = spec;
      spec = next;
      if (next.palette !== before.palette) materials.applyPalette(PALETTES[next.palette]);
      if (next.wings !== before.wings) build("wings");
      if (next.engines !== before.engines) build("engines");
      parts.get("shield")?.setEnabled(next.shield);
    },
    stats() {
      let meshes = 0;
      let count = 0;
      for (const [part, node] of parts) {
        if (part === "shield" && !spec.shield) continue;
        for (const mesh of node.getChildMeshes()) {
          meshes += 1;
          count += mesh.getTotalIndices() / 3;
        }
      }
      return { triangles: count, meshes };
    },
    dispose() {
      root.dispose(false, false);
    },
  };
}
