import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

import { ORB_COLORS, type Orb } from "./flightModel";

// Les boules : de vrais objets 3D, brillants et lumineux. Cinq couleurs = cinq modèles (un maillage + un matériau chacun) ; chaque boule
// du tas est une « instance » d'un de ces modèles : la géométrie et le matériau sont partagés, seules la place et la taille changent.
// Aucune boule n'est créée ni détruite pendant le jeu : on allume, déplace et éteint les mêmes.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : PBRMaterial (vernis, émissif), instances de maillage.
//
// Écrit pour Yamba.

export const ORB_PALETTE = ["#ff4d6d", "#ffb02e", "#38e0a0", "#35b8ff", "#b66bff"] as const;

/** Distance (unités) sur laquelle une boule grossit à partir de rien en apparaissant. */
const FADE_IN = 30;

export interface Orbs {
  /** Place les boules du tas selon leur état ; `spawnZ` est la distance de naissance (pour l'apparition en fondu). */
  sync(orbs: readonly Orb[], spawnZ: number): void;
  dispose(): void;
}

function orbMaterial(scene: Scene, hex: string): PBRMaterial {
  const color = Color3.FromHexString(hex);
  const m = new PBRMaterial(`orb-material-${hex}`, scene);
  m.albedoColor = color;
  m.metallic = 0.1;
  m.roughness = 0.14;
  m.emissiveColor = color.scale(0.28);
  m.clearCoat.isEnabled = true;
  m.clearCoat.intensity = 1;
  m.clearCoat.roughness = 0.02;
  m.environmentIntensity = 0.85;
  return m;
}

export function createOrbs(scene: Scene, count: number, segments: number): Orbs & { materials: PBRMaterial[] } {
  const materials = ORB_PALETTE.map((hex) => orbMaterial(scene, hex));
  const sources: Mesh[] = materials.map((material, c) => {
    const source = CreateSphere(`orb-source-${c}`, { diameter: 1, segments }, scene);
    source.material = material;
    source.isVisible = false;
    source.isPickable = false;
    return source;
  });
  const instances: InstancedMesh[] = Array.from({ length: count }, (_, i) => {
    const instance = sources[i % ORB_COLORS].createInstance(`orb-${i}`);
    instance.isPickable = false;
    instance.setEnabled(false);
    return instance;
  });
  return {
    materials,
    sync(orbs, spawnZ) {
      for (const orb of orbs) {
        const instance = instances[orb.slot];
        if (!orb.active) {
          if (instance.isEnabled()) instance.setEnabled(false);
          continue;
        }
        if (!instance.isEnabled()) instance.setEnabled(true);
        const grow = Math.min(1, Math.max(0, (spawnZ + 20 - orb.z) / FADE_IN));
        const size = orb.radius * 2 * (grow * grow * (3 - 2 * grow));
        instance.position.set(orb.x, orb.y, orb.z);
        instance.scaling.setAll(Math.max(0.001, size));
        instance.rotation.y = orb.spin * 0.8;
      }
    },
    dispose() {
      for (const mesh of [...instances, ...sources]) mesh.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
