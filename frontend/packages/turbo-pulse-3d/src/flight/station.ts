import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

// La station « Orion » (provisoire) : un grand anneau-porte tourné vers le vaisseau, un moyeu derrière, des balises vertes qui
// clignotent en file vers l'entrée, et un halo qui la rend visible de très loin. Construite une fois, déplacée à la distance restante.
//
// Écrit pour Yamba.

export interface Station {
  readonly root: TransformNode;
  /** Place la station à `distance` devant le vaisseau et anime ses lumières. */
  update(distance: number, time: number): void;
  dispose(): void;
}

export function createStation(scene: Scene): Station {
  const root = new TransformNode("station", scene);
  const owned: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    owned.push(item);
    return item;
  };

  const metal = track(new PBRMaterial("station-metal", scene));
  metal.albedoColor = Color3.FromHexString("#dfe4f5");
  metal.metallic = 0.8;
  metal.roughness = 0.28;
  metal.environmentIntensity = 1.3;
  const dark = track(new PBRMaterial("station-dark", scene));
  dark.albedoColor = Color3.FromHexString("#262a4a");
  dark.metallic = 0.7;
  dark.roughness = 0.35;
  const lamp = (name: string, hex: string, power: number) => {
    const m = track(new StandardMaterial(name, scene));
    m.disableLighting = true;
    m.emissiveColor = Color3.FromHexString(hex).scale(power);
    return m;
  };
  const cyan = lamp("station-light-cyan", "#3fd0ff", 1);
  const green = lamp("station-light-green", "#46ff9a", 1);
  const amber = lamp("station-light-amber", "#ffb02e", 1);

  const part = <T extends Mesh>(mesh: T, material: PBRMaterial | StandardMaterial): T => {
    mesh.material = material;
    mesh.parent = root;
    mesh.isPickable = false;
    track(mesh);
    return mesh;
  };

  // Anneau-porte : tore couché pour que son axe soit z (face au vaisseau).
  const ring = part(CreateTorus("station-ring", { diameter: 30, thickness: 2.4, tessellation: 64 }, scene), metal);
  ring.rotation.x = Math.PI / 2;
  const ringInner = part(CreateTorus("station-light-ring", { diameter: 27.4, thickness: 0.9, tessellation: 64 }, scene), cyan);
  ringInner.rotation.x = Math.PI / 2;
  // Feux de position autour de l'anneau.
  const lightSource = part(CreateBox("station-light-source", { size: 1.6 }, scene), amber);
  lightSource.isVisible = false;
  const lights: InstancedMesh[] = [];
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    const box = lightSource.createInstance(`station-light-${i}`);
    box.parent = root;
    box.position.set(Math.cos(a) * 15.6, Math.sin(a) * 15.6, 0);
    box.rotation.z = a;
    lights.push(box);
  }
  // Moyeu et rayons, derrière l'anneau.
  const hub = part(CreateCylinder("station-hub", { diameter: 7, height: 12, tessellation: 32 }, scene), metal);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 16;
  const hubCap = part(CreateSphere("station-hub-cap", { diameter: 7, segments: 20 }, scene), dark);
  hubCap.position.z = 10;
  for (let i = 0; i < 4; i += 1) {
    const a = (Math.PI * i) / 2 + Math.PI / 4;
    const spoke = part(CreateBox(`station-spoke-${i}`, { width: 1, height: 9, depth: 1 }, scene), dark);
    spoke.position.set(Math.cos(a) * 9, Math.sin(a) * 9, 12);
    spoke.rotation.z = a - Math.PI / 2;
  }
  // Balises d'approche : six feux verts en file, devant la porte.
  const beaconSource = part(CreateSphere("station-light-beacon-source", { diameter: 1.4, segments: 8 }, scene), green);
  beaconSource.isVisible = false;
  const beacons: InstancedMesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const b = beaconSource.createInstance(`station-light-beacon-${i}`);
    b.parent = root;
    b.position.set(0, -7.5, -10 - i * 7);
    beacons.push(b);
  }
  // Cœur lumineux au centre de la porte : le halo de la scène le fait briller, on le voit de très loin.
  const core = part(CreateSphere("station-light-core", { diameter: 4, segments: 12 }, scene), lamp("station-core-material", "#7fe3ff", 1.6));
  core.position.z = 3;

  return {
    root,
    update(distance, time) {
      root.position.set(0, 0.4, distance);
      ring.rotation.y = time * 0.15;
      lights.forEach((light, i) => light.setEnabled(Math.sin(time * 3 + i) > -0.2));
      beacons.forEach((b, i) => b.scaling.setAll(0.6 + 0.6 * Math.max(0, Math.sin(time * 4 - i * 0.9))));
      core.scaling.setAll(1 + Math.sin(time * 2.2) * 0.15);
    },
    dispose() {
      for (const item of owned.reverse()) item.dispose();
      root.dispose();
    },
  };
}
