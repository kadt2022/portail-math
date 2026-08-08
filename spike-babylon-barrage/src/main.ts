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

// Étape 1 du spike : la scène la plus simple possible qui prouve que le
// moteur tourne — caméra, lumière, sol. Rien d'autre : le barrage, l'eau
// et les turbines arrivent aux étapes suivantes, une fois celle-ci validée.

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);

function createScene(): Scene {
  const scene = new Scene(engine);
  scene.clearColor.set(0.53, 0.73, 0.87, 1);

  const camera = new ArcRotateCamera(
    "camera",
    -Math.PI / 2.4,
    Math.PI / 2.6,
    22,
    Vector3.Zero(),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 40;

  const light = new HemisphericLight("light", new Vector3(0, 1, 0.3), scene);
  light.intensity = 0.9;

  const ground = MeshBuilder.CreateGround("ground", { width: 30, height: 20 }, scene);
  const groundMaterial = new StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseColor = new Color3(0.36, 0.55, 0.32);
  ground.material = groundMaterial;

  return scene;
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
