// Imports ciblés, pas le barrel "@babylonjs/core" : celui-ci embarque le
// PBR, le chargeur GLTF, la physique... rien de tout ça n'est utilisé par
// cette scène, et ça alourdissait le bundle de plusieurs mégaoctets pour
// rien. Chaque import ici correspond à une brique réellement utilisée —
// c'est aussi ce qui compte le plus pour la question posée par ce spike :
// est-ce que Babylon reste léger sur un téléphone d'entrée de gamme ?
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Space } from "@babylonjs/core/Maths/math.axis";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Étape 3 du spike : l'eau ondule et les turbines tournent. Volontairement
// sans texture ni matériau d'eau dédié (pas de @babylonjs/materials) : les
// vagues sont un déplacement de sommets calculé à la main, l'option la plus
// légère pour répondre à la question de ce spike — le poids sur un
// téléphone d'entrée de gamme.
//
// Repères du monde : le mur du barrage longe l'axe X, à Z = 0. L'eau retenue
// est du côté Z négatif (amont), le terrain sec du côté Z positif (aval).

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);

function createScene(): Scene {
  const scene = new Scene(engine);
  scene.clearColor.set(0.53, 0.73, 0.87, 1);

  const camera = new ArcRotateCamera(
    "camera",
    -Math.PI / 2.4,
    Math.PI / 2.6,
    30,
    new Vector3(0, 3, 0),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 50;

  const light = new HemisphericLight("light", new Vector3(0, 1, 0.3), scene);
  light.intensity = 0.9;

  const ground = MeshBuilder.CreateGround("ground", { width: 34, height: 24 }, scene);
  const groundMaterial = new StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseColor = new Color3(0.36, 0.55, 0.32);
  ground.material = groundMaterial;

  createDam(scene);
  const water = createReservoir(scene);
  createControlBuilding(scene);
  const turbines = createTurbines(scene);

  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    elapsed += deltaSeconds;
    animateWater(water, elapsed);
    for (const turbine of turbines) {
      // Space.WORLD : l'axe (0,0,1) est pris tel quel dans le repère du
      // monde, indépendamment de la rotation initiale (rotation.x = 90°)
      // qui a couché le cylindre — évite les surprises de mélanger une
      // rotation Euler posée une fois et des rotations par quaternion
      // appliquées ensuite à chaque image.
      turbine.mesh.rotate(turbine.axis, turbine.speed * deltaSeconds, Space.WORLD);
    }
  });

  return scene;
}

interface SpinningTurbine {
  mesh: Mesh;
  axis: Vector3;
  speed: number;
}

// Un mur simple : une boîte. Pas encore de vannes ni de turbines visibles —
// ça viendra habiller cette même boîte aux étapes suivantes.
function createDam(scene: Scene): void {
  const dam = MeshBuilder.CreateBox("dam", { width: 24, height: 6, depth: 2 }, scene);
  dam.position.set(0, 3, 0);

  const damMaterial = new StandardMaterial("damMaterial", scene);
  damMaterial.diffuseColor = new Color3(0.62, 0.62, 0.6);
  dam.material = damMaterial;
}

// Un plan surélevé, calé contre la face amont du mur : une eau "retenue",
// sans bassin creusé — simplification qui reste assumée à cette étape.
// Suffisamment subdivisé pour que le déplacement de sommets (animateWater)
// produise une vraie ondulation, pas un motif grossier.
function createReservoir(scene: Scene): Mesh {
  const water = MeshBuilder.CreateGround(
    "water",
    { width: 22, height: 12, subdivisions: 24 },
    scene,
  );
  water.position.set(0, 4, -7);

  const waterMaterial = new StandardMaterial("waterMaterial", scene);
  waterMaterial.diffuseColor = new Color3(0.16, 0.42, 0.66);
  waterMaterial.specularColor = new Color3(0.5, 0.6, 0.65);
  waterMaterial.alpha = 0.88;
  water.material = waterMaterial;

  return water;
}

// Vagues "à la main" : on décale chaque sommet en Y selon un sinus qui
// dépend de sa position (X, Z) et du temps. Pas de shader, pas de texture —
// juste une mise à jour de tampon à chaque image. Les normales sont
// recalculées pour que la lumière continue de bien accrocher le relief.
function animateWater(water: Mesh, elapsed: number): void {
  const positions = water.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) {
    return;
  }
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    positions[i + 1] = Math.sin(x * 0.6 + elapsed * 1.6) * 0.12 + Math.sin(z * 0.8 + elapsed * 1.1) * 0.08;
  }
  water.updateVerticesData(VertexBuffer.PositionKind, positions);
  water.createNormals(true);
}

// Trois roues montées sur la face aval du mur, orientées face à la caméra.
// L'axe de rotation correspond à leur profondeur locale (Z), après le
// redressement de 90° qui les fait passer d'un cylindre "debout" à une
// roue "à plat" tournée vers l'observateur.
function createTurbines(scene: Scene): SpinningTurbine[] {
  const turbineMaterial = new StandardMaterial("turbineMaterial", scene);
  turbineMaterial.diffuseColor = new Color3(0.22, 0.24, 0.26);
  turbineMaterial.specularColor = new Color3(0.4, 0.4, 0.42);

  const hubMaterial = new StandardMaterial("hubMaterial", scene);
  hubMaterial.diffuseColor = new Color3(0.78, 0.65, 0.2);

  const positionsX = [-6, 0, 6];
  return positionsX.map((x, index) => {
    const wheel = MeshBuilder.CreateCylinder(
      `turbine-${index}`,
      { diameter: 2.2, height: 0.5, tessellation: 20 },
      scene,
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 1.4, 1.25);
    wheel.material = turbineMaterial;

    const hub = MeshBuilder.CreateCylinder(
      `turbine-hub-${index}`,
      { diameter: 0.6, height: 0.7, tessellation: 12 },
      scene,
    );
    hub.parent = wheel;
    hub.position.set(0, 0, 0);

    hub.material = hubMaterial;

    return { mesh: wheel, axis: new Vector3(0, 0, 1), speed: 1.4 + index * 0.3 };
  });
}

// Petit bâtiment sur la crête, pour que la boîte du mur se lise comme un
// barrage équipé plutôt qu'un simple mur de pierre.
function createControlBuilding(scene: Scene): void {
  const building = MeshBuilder.CreateBox("controlBuilding", { width: 3, height: 2.4, depth: 2.6 }, scene);
  building.position.set(7, 6 + 1.2, -0.3);

  const buildingMaterial = new StandardMaterial("controlBuildingMaterial", scene);
  buildingMaterial.diffuseColor = new Color3(0.82, 0.74, 0.58);
  building.material = buildingMaterial;
}

const activeScene = createScene();

// Sans cet appel initial, le canvas garde sa résolution interne par défaut
// (300×150) même si le CSS l'étire visuellement à la taille de l'écran —
// l'écouteur "resize" ci-dessous ne couvre que les redimensionnements
// ultérieurs, jamais le premier rendu.
engine.resize();

engine.runRenderLoop(() => {
  activeScene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
