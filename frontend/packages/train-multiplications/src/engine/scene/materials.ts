import { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

import { MATERIAL, MATERIAL_COUNT } from "../geometry/palette";

// Les matériaux physiques (PBR) du monde ferroviaire. La géométrie garde ses couleurs par sommet (l'albédo) et
// chaque sommet porte sa famille de matériau ; ici, chaque famille reçoit son matériau PBR : rugosité et caractère
// métallique propres. L'acier nu et le laiton reflètent le ciel, la peinture de la locomotive et du pont brille d'un
// reflet doux, le bois et le béton restent mats, le verre est lisse.
//
// Un « jeu de matériaux » est un MultiMaterial de Babylon.js : un maillage y désigne chaque famille par un
// sous-maillage. On en crée un pour les ouvrages au grand air, un pour l'intérieur des tunnels (le ciel ne s'y reflète
// presque pas) et un par véhicule (qui s'assombrit à son tour dans un tunnel).
//
// Composants éprouvés de Babylon.js (Apache 2.0) : PBRMaterial, MultiMaterial.
//
// Écrit pour Yamba.

interface Finish {
  metallic: number;
  roughness: number;
}

/** Finition de chaque famille, dans l'ordre de `MATERIAL`. */
export const FINISHES: Record<keyof typeof MATERIAL, Finish> = {
  mineral: { metallic: 0, roughness: 0.9 },
  paint: { metallic: 0, roughness: 0.45 },
  metal: { metallic: 0.9, roughness: 0.42 },
  brass: { metallic: 1, roughness: 0.26 },
  wood: { metallic: 0, roughness: 0.74 },
  glass: { metallic: 0, roughness: 0.06 },
  matte: { metallic: 0, roughness: 1 },
  fruit: { metallic: 0, roughness: 0.5 },
};

const NAMES = Object.keys(MATERIAL) as (keyof typeof MATERIAL)[];

export interface MaterialSet {
  readonly multi: MultiMaterial;
  readonly parts: readonly PBRMaterial[];
  /** Éclairement (1 au grand air) : assombrit l'albédo et le reflet du ciel. */
  setLight(k: number): void;
  clone(name: string): MaterialSet;
  dispose(): void;
}

export interface MaterialSetOptions {
  /** Part du reflet de l'environnement (le ciel) : 1 au grand air, faible sous terre. */
  environment?: number;
  /** Lumières simultanées par matériau (soleil, ciel, voûte, projecteur, lampes groupées). */
  maxLights?: number;
}

export function createMaterialSet(scene: Scene, name: string, options: MaterialSetOptions = {}): MaterialSet {
  const environment = options.environment ?? 1;
  const parts = NAMES.map((family) => {
    const m = new PBRMaterial(`${name}-${family}`, scene);
    const finish = FINISHES[family];
    m.albedoColor = Color3.White();
    m.metallic = finish.metallic;
    m.roughness = finish.roughness;
    m.environmentIntensity = environment;
    m.backFaceCulling = false;
    m.twoSidedLighting = true;
    m.maxSimultaneousLights = options.maxLights ?? 6;
    return m;
  });
  return wrap(scene, name, parts, environment);
}

function wrap(scene: Scene, name: string, parts: PBRMaterial[], environment: number): MaterialSet {
  const multi = new MultiMaterial(name, scene);
  multi.subMaterials = parts;
  let light = 1;
  return {
    multi,
    parts,
    setLight(k) {
      if (Math.abs(k - light) < 0.004) return;
      light = k;
      for (const m of parts) {
        m.albedoColor.set(k, k, k);
        m.environmentIntensity = environment * k;
      }
    },
    clone(next) {
      return wrap(scene, next, parts.map((m, i) => m.clone(`${next}-${NAMES[i]}`)), environment);
    },
    dispose() {
      for (const m of parts) m.dispose();
      multi.dispose();
    },
  };
}

export { MATERIAL_COUNT };
