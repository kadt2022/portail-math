// Atelier du bateau du joueur (outil de développement, hors du jeu) : le bateau seul, sur une eau calme, vu sous
// plusieurs angles. Sert aux captures et aux réglages de finition, élément par élément.
//   boat-showroom.html?view=front|side|rear|three-quarter|reference|front-quarter|top|high|game|cockpit|motor
//     &speed=6&steer=0.6&frames=240 (ou eye=x,y,z&target=x,y,z&fov=0.5 pour un cadrage libre)
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Scene } from "@babylonjs/core/scene";

import { createPlayerBoat } from "../src/engine/scene/playerBoat";
import { FOG, SHADOW_FRAGMENT, SIGN_VERTEX } from "../src/engine/scene/shaders";
import { CALM_WATER, waterHeight } from "../src/engine/geometry/water";
import { motorBoat } from "../src/engine/geometry/boat";

const params = new URLSearchParams(location.search);
const view = params.get("view") ?? "three-quarter";
const speed = Number(params.get("speed") ?? "0");
const steer = Number(params.get("steer") ?? "0");
const frames = Number(params.get("frames") ?? "180");

const LIGHT = {
  sunDirection: new Vector3(0.42, 0.82, -0.38).normalize(),
  sunColor: new Vector3(1, 0.95, 0.84),
  skyLight: new Vector3(0.52, 0.6, 0.7),
  groundLight: new Vector3(0.33, 0.31, 0.25),
  skyZenith: new Vector3(0.22, 0.52, 0.93),
  skyHorizon: new Vector3(0.8, 0.9, 0.97),
  fogColor: new Vector3(0.77, 0.87, 0.94),
  fogDensity: 0.0022,
};

const canvas = document.getElementById("view") as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.77, 0.87, 0.94, 1);

const water = new Mesh("water", scene);
const plane = new VertexData();
const size = 60;
plane.positions = [-size, 0, -size, size, 0, -size, size, 0, size, -size, 0, size];
plane.indices = [0, 1, 2, 0, 2, 3];
plane.applyToMesh(water);
const waterMaterial = new ShaderMaterial("water", scene, {
  vertexSource: `precision highp float; attribute vec3 position; uniform mat4 world; uniform mat4 viewProjection; varying vec3 vWorld;
    void main(void) { vec4 w = world * vec4(position, 1.0); vWorld = w.xyz; gl_Position = viewProjection * w; }`,
  fragmentSource: `precision highp float; varying vec3 vWorld; uniform vec3 eyePosition; ${FOG}
    void main(void) {
      vec3 v = normalize(eyePosition - vWorld);
      float fresnel = 0.04 + 0.96 * pow(1.0 - max(v.y, 0.0), 5.0);
      vec3 color = mix(vec3(0.06, 0.33, 0.44), vec3(0.78, 0.88, 0.96), clamp(fresnel * 0.8, 0.0, 0.85));
      float ring = length(vWorld.xz);
      color = mix(color, vec3(0.11, 0.42, 0.5), smoothstep(6.0, 30.0, ring) * 0.3);
      gl_FragColor = vec4(applyFog(color, length(eyePosition - vWorld), 1.0), 1.0);
    }`,
}, { attributes: ["position"], uniforms: ["world", "viewProjection", "eyePosition", "fogColor", "fogDensity"] });
waterMaterial.setVector3("fogColor", LIGHT.fogColor);
waterMaterial.setFloat("fogDensity", LIGHT.fogDensity);
water.material = waterMaterial;

const shadowMaterial = new ShaderMaterial("shadow", scene, { vertexSource: SIGN_VERTEX, fragmentSource: SHADOW_FRAGMENT }, { attributes: ["position", "uv"], uniforms: ["world", "viewProjection", "opacity"], needAlphaBlending: true });
shadowMaterial.setFloat("opacity", 0.38);
shadowMaterial.disableDepthWrite = true;
shadowMaterial.backFaceCulling = false;

const boat = createPlayerBoat(scene, LIGHT, shadowMaterial);

const cameras: Record<string, [Vector3, Vector3, number]> = {
  front: [new Vector3(1.6, 2.1, 8.2), new Vector3(0, 1.0, 0), 0.62],
  side: [new Vector3(9, 1.6, 0.1), new Vector3(0, 0.95, 0.1), 0.62],
  rear: [new Vector3(-0.8, 2.3, -8.5), new Vector3(0, 1.0, -0.3), 0.62],
  "three-quarter": [new Vector3(-5.6, 3.1, -6.4), new Vector3(0, 0.95, -0.2), 0.62],
  reference: [new Vector3(5.4, 2.7, -6.2), new Vector3(0, 0.95, -0.1), 0.6],
  "front-quarter": [new Vector3(5.8, 2.6, 6.0), new Vector3(0, 0.9, 0.2), 0.62],
  top: [new Vector3(0.01, 11, 0), new Vector3(0, 0, 0), 0.68],
  high: [new Vector3(-3.5, 5.6, -5.5), new Vector3(0, 0.6, 0), 0.62],
  game: [new Vector3(0, 3.7, -8.2), new Vector3(0, 1.3, 13), 0.9],
  cockpit: [new Vector3(-1.6, 2.6, -2.6), new Vector3(0.3, 0.8, 0.3), 0.8],
  motor: [new Vector3(-1.5, 1.2, -5.2), new Vector3(0, 0.45, -2.7), 0.55],
};
const custom = (name: string) => params.get(name)?.split(",").map(Number) as [number, number, number] | undefined;
const eyeParam = custom("eye");
const targetParam = custom("target");
const [eye, target, fov] = eyeParam && targetParam ? [new Vector3(...eyeParam), new Vector3(...targetParam), Number(params.get("fov") ?? "0.5")] : (cameras[view] ?? cameras["three-quarter"]);
const camera = new TargetCamera("camera", eye, scene);
camera.setTarget(target);
camera.fov = fov;
camera.minZ = 0.1;
scene.activeCamera = camera;
for (const material of [boat.material, waterMaterial]) material.setVector3("eyePosition", eye);

let time = 0;
const step = (dt: number) => {
  time += dt;
  boat.update({ x: 0, z: 0, heading: 0, speed, lateral: steer * 2.2, steer, moored: speed === 0, dt, time, waterAt: (x, z) => waterHeight(x, z, time, CALM_WATER) });
};
for (let i = 0; i < frames; i += 1) step(1 / 60);

const model = motorBoat();
const count = (mesh: { positions: number[]; indices: number[] }) => [mesh.positions.length / 3, mesh.indices.length / 3];
const [bv, bt] = count(model.body);
const [ov, ot] = count(model.outboard);
const [pv, pt] = count(model.propeller);
const summary = { vertices: bv + ov + pv, triangles: bt + ot + pt, body: [bv, bt], outboard: [ov, ot], propeller: [pv, pt] };
(document.getElementById("stats") as HTMLElement).textContent = `${view} · ${summary.vertices} sommets · ${summary.triangles} triangles`;
(window as unknown as { boatSummary: unknown }).boatSummary = summary;

const animate = params.has("animate");
engine.runRenderLoop(() => {
  if (animate) step(engine.getDeltaTime() / 1000);
  scene.render();
});
scene.executeWhenReady(() => setTimeout(() => ((window as unknown as { boatReady: boolean }).boatReady = true), 300));
window.addEventListener("resize", () => engine.resize());
