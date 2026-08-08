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
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Étape 2 du spike : le barrage et l'eau apparaissent, mais tout reste
// statique — aucune animation encore. L'eau qui défile et les turbines qui
// tournent viennent à l'étape suivante, une fois cette composition validée.
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
  createReservoir(scene);
  createControlBuilding(scene);

  return scene;
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
// sans bassin creusé — volontairement simplifié pour cette étape statique.
function createReservoir(scene: Scene): void {
  const water = MeshBuilder.CreateGround("water", { width: 22, height: 12 }, scene);
  water.position.set(0, 4, -7);

  const waterMaterial = new StandardMaterial("waterMaterial", scene);
  waterMaterial.diffuseColor = new Color3(0.16, 0.42, 0.66);
  waterMaterial.alpha = 0.88;
  water.material = waterMaterial;
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
