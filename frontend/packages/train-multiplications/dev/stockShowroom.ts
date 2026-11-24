// Atelier du matériel roulant (outil de développement, hors du jeu) : la locomotive, son tender et des wagons chargés,
// sur un bout de voie droite, sous la lumière du jeu.
//   stock-showroom.html?view=front|side|rear|cab|crates|wheels&angle=0.6
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";

import { createConsist, poseVehicle, vehicleFronts } from "../src/domain/consist";
import { buildTrack } from "../src/domain/track";
import { emptyMesh, lathe } from "../src/engine/geometry/kit";
import { LOCO_ANCHORS } from "../src/engine/geometry/rollingStock";
import { bufferStop, trackMesh } from "../src/engine/geometry/trackGeometry";
import { createLighting, LIGHTING } from "../src/engine/scene/lighting";
import { createMaterialSet } from "../src/engine/scene/materials";
import { makeMesh } from "../src/engine/scene/meshes";
import { createTrainView } from "../src/engine/scene/trainView";

const params = new URLSearchParams(location.search);
const view = params.get("view") ?? "front";
const canvas = document.getElementById("view") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(LIGHTING.skyHorizon.x, LIGHTING.skyHorizon.y, LIGHTING.skyHorizon.z, 1);
const lighting = createLighting(scene);

const track = buildTrack({ x: 0, y: 0, z: -60, heading: 0 }, [{ length: 120, curvature: 0 }], [{ length: 120, grade: 0 }]);
const ground = emptyMesh();
lathe(ground, [[0, -0.78], [40, -0.8], [90, -1.2]], 32, [0.66, 0.62, 0.5]);
const set = createMaterialSet(scene, "showroom");
makeMesh(scene, "ground", ground, set);
makeMesh(scene, "track", trackMesh(track, 0, 120), set);
makeMesh(scene, "stop", bufferStop(track, 118, 1), set);
const consist = createConsist(3, 6);
const train = createTrainView(scene, set, consist);
const head = 72;
const poses = vehicleFronts(consist, head).map((front, i) => poseVehicle(track, consist.vehicles[i].spec, front));
train.update(poses, Number(params.get("angle") ?? "0.6"), poses.map(() => 1));
lighting.setShadowCasters(train.casters());
lighting.setShadowFocus(new Vector3(0, 0, 0));

const lp = poses[0].position;
const views: Record<string, [Vector3, Vector3, number]> = {
  front: [new Vector3(lp[0] + 7.5, 3.4, lp[2] + 13), new Vector3(lp[0], 1.9, lp[2] + 1), 0.75],
  side: [new Vector3(lp[0] + 16, 2.6, lp[2] - 9), new Vector3(lp[0], 1.8, lp[2] - 9), 0.85],
  rear: [new Vector3(lp[0] - 8, 5.5, lp[2] - 34), new Vector3(lp[0], 1.6, lp[2] - 14), 0.8],
  crates: [new Vector3(lp[0] + 4, 7, lp[2] - 14), new Vector3(lp[0], 1.4, lp[2] - 19), 0.85],
  wheels: [new Vector3(lp[0] + 4.6, 1.4, lp[2] + 1.2), new Vector3(lp[0] + 1, 0.9, lp[2] - 1.0), 0.8],
};
const camera = new TargetCamera("camera", new Vector3(), scene);
camera.minZ = 0.05;
if (view === "cab") {
  const eye = Vector3.TransformCoordinates(Vector3.FromArray(LOCO_ANCHORS.cabEye), train.locomotive.computeWorldMatrix(true));
  const at = Vector3.TransformCoordinates(Vector3.FromArray(LOCO_ANCHORS.cabLook), train.locomotive.computeWorldMatrix(true));
  camera.position.copyFrom(eye);
  camera.setTarget(at);
  camera.fov = 1.05;
} else {
  const [eye, target, fov] = views[view] ?? views.front;
  camera.position.copyFrom(eye);
  camera.setTarget(target);
  camera.fov = fov;
}
let frames = 0;
engine.runRenderLoop(() => {
  scene.render();
  frames += 1;
  if (frames === 4) {
    const meshes = train.meshes();
    const triangles = meshes.reduce((sum, m) => sum + (m.getTotalIndices() / 3) * Math.max(1, m.thinInstanceCount || 1), 0);
    (window as unknown as { stockStats: unknown }).stockStats = { triangles: Math.round(triangles), meshes: meshes.length, active: scene.getActiveMeshes().length };
    document.getElementById("stats")!.textContent = `${Math.round(triangles)} triangles · ${meshes.length} maillages`;
    (window as unknown as { stockReady: boolean }).stockReady = true;
  }
});
