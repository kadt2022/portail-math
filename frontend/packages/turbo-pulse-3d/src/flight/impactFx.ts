import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

import { ORB_PALETTE } from "./orbs";

// L'effet d'un choc : une gerbe d'étincelles et un anneau de choc de la couleur de la boule. Trois gerbes réutilisées en tourniquet ;
// rien n'est créé pendant le jeu.
//
// Écrit pour Yamba.

const BURSTS = 3;
const SPARKS = 14;
const LIFE = 0.8;

interface Burst {
  root: TransformNode;
  sparks: InstancedMesh[];
  velocity: Float32Array;
  ring: Mesh;
  age: number;
  active: boolean;
}

export interface ImpactFx {
  /** Lance une gerbe à cet endroit, de la couleur (indice de palette) donnée. */
  play(x: number, y: number, z: number, color: number, size: number): void;
  update(dt: number): void;
  dispose(): void;
}

export function createImpactFx(scene: Scene): ImpactFx {
  const sparkMaterial = new StandardMaterial("fx-spark-material", scene);
  sparkMaterial.disableLighting = true;
  sparkMaterial.emissiveColor = Color3.FromHexString("#fff4d0");
  const sparkSource = CreateIcoSphere("fx-spark-source", { radius: 0.5, subdivisions: 1 }, scene);
  sparkSource.material = sparkMaterial;
  sparkSource.isVisible = false;
  const ringMaterials = ORB_PALETTE.map((hex, i) => {
    const m = new StandardMaterial(`fx-ring-material-${i}`, scene);
    m.disableLighting = true;
    m.emissiveColor = Color3.FromHexString(hex).scale(1.2);
    m.alpha = 0.9;
    m.alphaMode = 1;
    m.disableDepthWrite = true;
    return m;
  });
  const bursts: Burst[] = Array.from({ length: BURSTS }, (_, b) => {
    const root = new TransformNode(`fx-burst-${b}`, scene);
    root.setEnabled(false);
    const sparks = Array.from({ length: SPARKS }, (_, i) => {
      const spark = sparkSource.createInstance(`fx-spark-${b}-${i}`);
      spark.parent = root;
      spark.isPickable = false;
      return spark;
    });
    const ring = CreateTorus(`fx-ring-${b}`, { diameter: 1, thickness: 0.05, tessellation: 40 }, scene);
    ring.parent = root;
    ring.billboardMode = 7;
    ring.isPickable = false;
    ring.material = ringMaterials[0];
    return { root, sparks, velocity: new Float32Array(SPARKS * 3), ring, age: 0, active: false };
  });
  let next = 0;
  return {
    play(x, y, z, color, size) {
      const burst = bursts[next];
      next = (next + 1) % BURSTS;
      burst.root.position.set(x, y, z);
      burst.root.setEnabled(true);
      burst.ring.material = ringMaterials[color % ringMaterials.length];
      burst.age = 0;
      burst.active = true;
      for (let i = 0; i < SPARKS; i += 1) {
        // Directions réparties sur une sphère (spirale de Fibonacci), vitesse variable.
        const k = (i + 0.5) / SPARKS;
        const phi = Math.acos(1 - 2 * k);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const speed = (4 + (i % 4)) * (0.6 + size * 0.5);
        burst.velocity[i * 3] = Math.cos(theta) * Math.sin(phi) * speed;
        burst.velocity[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * speed;
        burst.velocity[i * 3 + 2] = Math.cos(phi) * speed;
        burst.sparks[i].position.set(0, 0, 0);
      }
      burst.root.scaling.setAll(1);
      burst.ring.metadata = { size };
    },
    update(dt) {
      for (const burst of bursts) {
        if (!burst.active) continue;
        burst.age += dt;
        const t = burst.age / LIFE;
        if (t >= 1) {
          burst.active = false;
          burst.root.setEnabled(false);
          continue;
        }
        const fade = 1 - t;
        for (let i = 0; i < SPARKS; i += 1) {
          burst.sparks[i].position.set(burst.velocity[i * 3] * burst.age, burst.velocity[i * 3 + 1] * burst.age, burst.velocity[i * 3 + 2] * burst.age);
          burst.sparks[i].scaling.setAll(0.22 * fade);
        }
        const size = (burst.ring.metadata as { size: number }).size;
        burst.ring.scaling.setAll((1 + t * 9) * (0.6 + size));
        burst.ring.visibility = fade * fade;
      }
    },
    dispose() {
      for (const burst of bursts) {
        for (const spark of burst.sparks) spark.dispose();
        burst.ring.dispose();
        burst.root.dispose();
      }
      sparkSource.dispose();
      sparkMaterial.dispose();
      for (const m of ringMaterials) m.dispose();
    },
  };
}
