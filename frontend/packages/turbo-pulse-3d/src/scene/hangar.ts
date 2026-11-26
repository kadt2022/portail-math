import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Scene } from "@babylonjs/core/scene";

// Le hangar de présentation : un ciel de nébuleuse, un socle d'atelier cerclé de lumière, une arche d'hangar derrière. Le vaisseau reste
// le centre absolu : tout le reste est sombre et calme, les lumières colorées servent à le faire briller (reflets bleu et magenta sur la
// coque laquée). Peu d'objets : un ciel, quelques milliers d'étoiles en une seule instance, le socle, deux anneaux, l'arche.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : lumières, ombres directionnelles, instances légères.
//
// Écrit pour Yamba.

/** Quelques taches de lumière dans le ciel (direction, couleur, étendue) : elles se reflètent dans la coque et colorent l'arrière-plan. */
const GLOWS: ReadonlyArray<{ dir: [number, number, number]; color: [number, number, number]; spread: number }> = [
  { dir: [0.2, 0.9, 0.35], color: [0.95, 0.97, 1.0], spread: 7 },
  { dir: [-0.9, 0.25, 0.3], color: [0.95, 0.25, 0.85], spread: 4 },
  { dir: [0.9, 0.2, -0.3], color: [0.25, 0.8, 1.0], spread: 4 },
  { dir: [0, 0.1, -1], color: [0.55, 0.4, 1.0], spread: 3 },
];

export function skyColor(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  const [nx, ny, nz] = [x / length, y / length, z / length];
  const t = Math.min(1, Math.max(0, (ny + 0.2) / 1.2));
  // Dégradé : horizon violet profond, zénith bleu nuit.
  let color: [number, number, number] = [0.1 + 0.03 * (1 - t), 0.05 + 0.05 * t, 0.26 - 0.1 * t];
  for (const glow of GLOWS) {
    const d = nx * glow.dir[0] + ny * glow.dir[1] + nz * glow.dir[2];
    const k = Math.pow(Math.max(0, d), glow.spread * 3.2) * 1.15;
    color = [color[0] + glow.color[0] * k, color[1] + glow.color[1] * k, color[2] + glow.color[2] * k];
  }
  return color;
}

export interface Hangar {
  readonly sky: Mesh;
  /** Le vaisseau projette son ombre sur le socle. */
  castShadow(mesh: Mesh): void;
  /** Hauteur du dessus du socle, sous les pieds du vaisseau. */
  readonly floorY: number;
  dispose(): void;
}

export function createHangar(scene: Scene, options: { shadows: boolean }): Hangar {
  scene.clearColor = new Color4(0.04, 0.03, 0.12, 1);

  // Ciel : une sphère vue de l'intérieur, colorée sommet par sommet (aucune texture).
  const sky = CreateSphere("sky", { diameter: 300, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = sky.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) colors.push(...skyColor(positions[i], positions[i + 1], positions[i + 2]), 1);
  sky.setVerticesData(VertexBuffer.ColorKind, colors);
  const skyMaterial = new StandardMaterial("sky-material", scene);
  skyMaterial.disableLighting = true;
  skyMaterial.emissiveColor = Color3.White();
  skyMaterial.backFaceCulling = false;
  sky.material = skyMaterial;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.alwaysSelectAsActiveMesh = true;

  // Étoiles : un seul petit maillage, copié (instances légères) sur une sphère autour de la scène.
  const star = CreateIcoSphere("star", { radius: 0.5, subdivisions: 1 }, scene);
  const starMaterial = new StandardMaterial("star-material", scene);
  starMaterial.disableLighting = true;
  starMaterial.emissiveColor = Color3.White();
  star.material = starMaterial;
  star.isPickable = false;
  star.infiniteDistance = true;
  const count = 260;
  const matrices = new Float32Array(count * 16);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i += 1) {
    const u = random() * Math.PI * 2;
    const v = Math.acos(1 - random() * 1.7);
    const radius = 120;
    const size = 0.25 + random() * random() * 1.1;
    Matrix.Compose(new Vector3(size, size, size), Quaternion.Identity(), new Vector3(Math.cos(u) * Math.sin(v) * radius, Math.cos(v) * radius, Math.sin(u) * Math.sin(v) * radius)).copyToArray(matrices, i * 16);
  }
  star.thinInstanceSetBuffer("matrix", matrices, 16, true);
  star.alwaysSelectAsActiveMesh = true;

  // Socle d'atelier : un disque de métal sombre, deux anneaux lumineux.
  const floorY = -1.0;
  const metal = new PBRMaterial("platform-metal", scene);
  metal.albedoColor = Color3.FromHexString("#2b2f55");
  metal.metallic = 0.7;
  metal.roughness = 0.38;
  const platform = CreateCylinder("platform", { diameter: 9, height: 0.4, tessellation: 64 }, scene);
  platform.position.y = floorY - 0.2;
  platform.material = metal;
  platform.receiveShadows = true;
  const ringMaterial = (name: string, color: string) => {
    const m = new PBRMaterial(name, scene);
    m.albedoColor = Color3.Black();
    m.emissiveColor = Color3.FromHexString(color);
    m.disableLighting = true;
    return m;
  };
  const outer = CreateTorus("platform-ring-outer", { diameter: 8.5, thickness: 0.1, tessellation: 80 }, scene);
  outer.position.y = floorY + 0.01;
  outer.material = ringMaterial("ring-outer", "#43d6ff");
  const inner = CreateTorus("platform-ring-inner", { diameter: 5.4, thickness: 0.06, tessellation: 64 }, scene);
  inner.position.y = floorY + 0.005;
  inner.material = ringMaterial("ring-inner", "#a45cff");

  // Arche d'hangar : un grand anneau debout derrière le vaisseau, sur deux pieds.
  const archMetal = new PBRMaterial("arch-metal", scene);
  archMetal.albedoColor = Color3.FromHexString("#3a3f73");
  archMetal.metallic = 0.8;
  archMetal.roughness = 0.4;
  const arch = CreateTorus("arch", { diameter: 15, thickness: 0.7, tessellation: 80 }, scene);
  arch.rotation.x = Math.PI / 2;
  arch.position.set(0, 4.4, 11);
  arch.material = archMetal;
  const archLight = CreateTorus("arch-light", { diameter: 14.2, thickness: 0.12, tessellation: 80 }, scene);
  archLight.rotation.x = Math.PI / 2;
  archLight.position.set(0, 4.4, 10.62);
  archLight.material = ringMaterial("arch-light", "#8a5cff");
  for (const side of [-1, 1]) {
    const foot = CreateCylinder(`arch-foot-${side}`, { diameterTop: 0.9, diameterBottom: 1.3, height: 1.6, tessellation: 24 }, scene);
    foot.position.set(side * 7, floorY - 0.2, 11);
    foot.material = archMetal;
  }

  // Lumières : ciel froid, lumière principale blanche (ombres), contre-jours colorés qui dessinent la silhouette.
  const hemispheric = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemispheric.diffuse = Color3.FromHexString("#b8c4ff");
  hemispheric.groundColor = Color3.FromHexString("#3b2a7a");
  hemispheric.intensity = 0.55;
  const key = new DirectionalLight("key", new Vector3(-0.5, -1, 0.7), scene);
  key.position = new Vector3(5, 10, -7);
  key.intensity = 2.4;
  key.diffuse = Color3.FromHexString("#fff4e6");
  const rimBlue = new PointLight("rim-blue", new Vector3(5, 2.5, 5), scene);
  rimBlue.diffuse = Color3.FromHexString("#38c8ff");
  rimBlue.intensity = 25;
  rimBlue.range = 20;
  const rimPink = new PointLight("rim-pink", new Vector3(-5, 2.5, 5), scene);
  rimPink.diffuse = Color3.FromHexString("#ff4fd0");
  rimPink.intensity = 22;
  rimPink.range = 20;

  let shadows: ShadowGenerator | null = null;
  if (options.shadows) {
    shadows = new ShadowGenerator(1024, key);
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    shadows.bias = 0.0015;
    shadows.normalBias = 0.02;
  }

  return {
    sky,
    floorY,
    castShadow: (mesh) => shadows?.addShadowCaster(mesh),
    dispose() {
      shadows?.dispose();
    },
  };
}
