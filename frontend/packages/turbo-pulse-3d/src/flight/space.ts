import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import "@babylonjs/core/Meshes/instancedMesh";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";


// L'espace de vol : un ciel de nébuleuse, des étoiles lointaines, une planète, des traînées de poussière qui filent le long du vaisseau
// (c'est elles qui donnent la sensation de vitesse et de profondeur), et un éclairage spatial (soleil blanc, reflets bleu et magenta).
//
// Le ciel et les étoiles sont dessinés d'abord (groupe de rendu 0) et n'écrivent pas la profondeur : rien de lointain n'est jamais
// caché par eux, ni la planète ni la station. Tout le reste est dans le groupe 1.
//
// Écrit pour Yamba.

export interface Space {
  readonly sky: Mesh;
  /** Fait filer la poussière selon la vitesse du vaisseau. */
  update(dt: number, speed: number): void;
  dispose(): void;
}

const SKY_GROUP = 0;
const WORLD_GROUP = 1;

/** Taches de nébuleuse (direction, couleur, étendue) : l'avant (z+) est le plus lumineux, pour guider le regard vers la station. */
const GLOWS: ReadonlyArray<{ dir: [number, number, number]; color: [number, number, number]; spread: number }> = [
  { dir: [0.05, 0.12, 1], color: [0.5, 0.28, 0.95], spread: 3.5 },
  { dir: [0.75, 0.25, 0.65], color: [0.95, 0.25, 0.8], spread: 5 },
  { dir: [-0.8, 0.15, 0.55], color: [0.2, 0.7, 1.0], spread: 5 },
  { dir: [0, 1, 0.1], color: [0.35, 0.45, 1.0], spread: 6 },
  { dir: [0, 0.05, -1], color: [0.4, 0.2, 0.8], spread: 4 },
];

function skyColor(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  const [nx, ny, nz] = [x / length, y / length, z / length];
  // Fond bleu nuit, un peu plus clair vers l'horizon ; une bande lumineuse (voie lactée) en travers.
  const band = Math.exp(-((ny - 0.25 * nx) ** 2) * 18) * 0.1;
  let color: [number, number, number] = [0.035 + band * 0.8, 0.035 + band * 0.7, 0.14 + band];
  for (const glow of GLOWS) {
    const d = nx * glow.dir[0] + ny * glow.dir[1] + nz * glow.dir[2];
    const k = Math.max(0, d) ** (glow.spread * 2.2) * 0.5;
    color = [color[0] + glow.color[0] * k, color[1] + glow.color[1] * k, color[2] + glow.color[2] * k];
  }
  return color;
}

function createSky(scene: Scene): Mesh {
  const sky = CreateSphere("sky", { diameter: 300, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = sky.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) colors.push(...skyColor(positions[i], positions[i + 1], positions[i + 2]), 1);
  sky.setVerticesData(VertexBuffer.ColorKind, colors);
  const material = new StandardMaterial("sky-material", scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.White();
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.fogEnabled = false;
  sky.material = material;
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.alwaysSelectAsActiveMesh = true;
  sky.renderingGroupId = SKY_GROUP;
  return sky;
}

function createFarStars(scene: Scene, count: number): Mesh {
  const star = CreateIcoSphere("sky-star", { radius: 0.5, subdivisions: 1 }, scene);
  const material = new StandardMaterial("sky-star-material", scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.White();
  material.disableDepthWrite = true;
  star.material = material;
  star.isPickable = false;
  star.infiniteDistance = true;
  star.alwaysSelectAsActiveMesh = true;
  star.renderingGroupId = SKY_GROUP;
  const matrices = new Float32Array(count * 16);
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i += 1) {
    const u = random() * Math.PI * 2;
    const v = Math.acos(1 - random() * 2);
    const size = 0.5 + random() * random() * 2.2;
    Matrix.Compose(
      new Vector3(size, size, size),
      Quaternion.Identity(),
      new Vector3(Math.cos(u) * Math.sin(v) * 120, Math.cos(v) * 120, Math.sin(u) * Math.sin(v) * 120),
    ).copyToArray(matrices, i * 16);
  }
  star.thinInstanceSetBuffer("matrix", matrices, 16, true);
  return star;
}

/** Une planète lointaine, rayée de bandes de couleur, éclairée par le soleil. */
function createPlanet(scene: Scene): Mesh {
  const planet = CreateSphere("planet", { diameter: 340, segments: 32 }, scene);
  const positions = planet.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const lat = positions[i + 1] / 170;
    const band = 0.5 + 0.5 * Math.sin(lat * 9 + Math.sin(lat * 23) * 0.6);
    colors.push(0.28 + 0.4 * band, 0.2 + 0.25 * band, 0.5 + 0.3 * (1 - band), 1);
  }
  planet.setVerticesData(VertexBuffer.ColorKind, colors);
  const material = new StandardMaterial("planet-material", scene);
  material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(0.05, 0.04, 0.12);
  planet.material = material;
  planet.position.set(-330, 120, 1400);
  planet.isPickable = false;
  return planet;
}

function createLights(scene: Scene) {
  const hemisphere = new HemisphericLight("space-hemi", new Vector3(0, 1, 0), scene);
  hemisphere.diffuse = Color3.FromHexString("#9fb2ff");
  hemisphere.groundColor = Color3.FromHexString("#2c2060");
  hemisphere.intensity = 0.7;
  // Soleil : vient de derrière-dessus-gauche du vaisseau, il éclaire le dos et les flancs que la caméra voit.
  const sun = new DirectionalLight("space-sun", new Vector3(0.45, -0.7, 0.55), scene);
  sun.intensity = 3.4;
  sun.diffuse = Color3.FromHexString("#fff3e0");
  const blue = new PointLight("space-rim-blue", new Vector3(8, 3, 10), scene);
  blue.diffuse = Color3.FromHexString("#38c8ff");
  blue.intensity = 40;
  blue.range = 40;
  const pink = new PointLight("space-rim-pink", new Vector3(-8, 3, 10), scene);
  pink.diffuse = Color3.FromHexString("#ff4fd0");
  pink.intensity = 34;
  pink.range = 40;
  return [hemisphere, sun, blue, pink];
}

const STREAKS = 150;
const TUBE_NEAR = -14;
const TUBE_FAR = 150;

/** Traînées de poussière : un seul petit maillage copié 150 fois (instances), replacé à chaque image ; rien n'est créé pendant le jeu. */
function createStreaks(scene: Scene, count: number) {
  const source = CreateBox("streak-source", { size: 1 }, scene);
  const material = new StandardMaterial("streak-material", scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromHexString("#cfeaff");
  material.alpha = 0.7;
  material.alphaMode = 1;
  material.disableDepthWrite = true;
  source.material = material;
  source.isVisible = false;
  source.isPickable = false;
  const streaks = Array.from({ length: count }, (_, i) => {
    const instance = source.createInstance(`streak-${i}`);
    instance.isPickable = false;
    return instance;
  });
  let seed = 5;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (const streak of streaks) {
    const angle = random() * Math.PI * 2;
    const radius = 4 + random() ** 0.7 * 34;
    streak.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, TUBE_NEAR + random() * (TUBE_FAR - TUBE_NEAR));
  }
  return {
    mesh: source,
    update(dt: number, speed: number) {
      const length = 0.4 + speed * 0.2;
      for (const streak of streaks) {
        streak.position.z -= speed * dt;
        if (streak.position.z < TUBE_NEAR) streak.position.z += TUBE_FAR - TUBE_NEAR;
        streak.scaling.set(0.06, 0.06, length);
      }
    },
  };
}

export function createSpace(scene: Scene, options: { light: boolean }): Space {
  scene.clearColor = new Color4(0.02, 0.015, 0.07, 1);
  const sky = createSky(scene);
  const stars = createFarStars(scene, options.light ? 120 : 220);
  const planet = createPlanet(scene);
  const lights = createLights(scene);
  const streaks = createStreaks(scene, options.light ? 90 : STREAKS);
  // Tout objet créé ensuite va dans le groupe du monde ; le ciel et ses étoiles restent derrière.
  const observer = scene.onNewMeshAddedObservable.add((mesh) => {
    if (!mesh.name.startsWith("sky")) mesh.renderingGroupId = WORLD_GROUP;
  });
  for (const mesh of [planet, streaks.mesh]) mesh.renderingGroupId = WORLD_GROUP;
  return {
    sky,
    update: (dt, speed) => streaks.update(dt, speed),
    dispose() {
      scene.onNewMeshAddedObservable.remove(observer);
      for (const light of lights) light.dispose();
      stars.dispose();
    },
  };
}
