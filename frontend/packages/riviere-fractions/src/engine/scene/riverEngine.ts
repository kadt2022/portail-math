import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Material } from "@babylonjs/core/Materials/material";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";

import { emptyMesh, place, sphere, type MeshData } from "../geometry/kit";
import { buildLandscape, SIGN_HEIGHT, SIGN_WIDTH, type Anchor } from "../geometry/landscape";
import { createLevelOneLayout, type Lane, type RiverLayout } from "../geometry/layout";
import { cargoBoat, fishingBoat, passengerBoat, skyLantern, type ModelParts } from "../geometry/models";
import { CALM_WATER, waterHeight, type WaterSettings } from "../geometry/water";
import { boatYaw, initialBoat, stepBoat, stopBeforeBarrier, type BoatState, type Obstacle } from "../navigation/boat";
import { createSeeded } from "../navigation/seeded";
import { createTraffic, trafficPose, type TrafficBoat } from "../navigation/traffic";
import { createForest, type ForestStats } from "./forest";
import { createPlayerBoat } from "./playerBoat";
import { BOAT_LIGHT, createLighting, SHADER_LIGHT, type LightingOptions } from "./lighting";
import { GLOW_FRAGMENT, LIT_VERTEX, SHADOW_FRAGMENT, SIGN_FRAGMENT, SIGN_VERTEX, SKY_FRAGMENT, SKY_VERTEX, WATER_FRAGMENT, WATER_VERTEX } from "./shaders";
import { drawSign, SIGN_CANVAS_HEIGHT, SIGN_CANVAS_WIDTH, type SignMark, type SignText } from "./signDrawing";

// Scène 3D de la Rivière des Fractions. Elle dessine la rivière, conduit le bateau et rapporte la voie franchie à
// chaque embranchement. Elle ne connaît ni les questions ni les règles : elle affiche les panneaux qu'on lui donne et
// les verdicts qu'on lui dicte. Elle ne connaît pas non plus le portail : on lui donne un élément où dessiner.

export interface RiverEngineStats {
  fps: number;
  activeMeshes: number;
  triangles: number;
  /** Préparation de la scène (ms), du début de la construction à la première image prête. */
  buildMs: number;
  /** Triangles du dernier tracé de la carte d'ombre, et nombre de tracés depuis l'ouverture (elle n'est pas refaite à chaque image). */
  shadowTriangles: number;
  shadowRenders: number;
  /** Position du bateau en coordonnées de rivière (mesures et tests de bout en bout). */
  boatS: number;
  boatD: number;
  /** Appels de dessin de la dernière image. */
  drawCalls: number;
  /** La forêt d'essai, si elle est plantée. */
  forest: ForestStats | null;
}

export interface RiverEngineOptions {
  /** Élément dans lequel la scène crée son canevas. */
  host: HTMLElement;
  /** La proue a franchi la ligne de décision d'un embranchement dans une voie. */
  onLaneCrossed: (fork: number, lane: Lane) => void;
  /** Avancement de la construction de la scène, de 0 à 1. */
  onBuildProgress?: (fraction: number) => void;
  /** Densité de pixels maximale du rendu (les écrans très denses coûtent cher pour peu de gain). */
  maxPixelRatio?: number;
  /** Fabrique du moteur : par défaut WebGL ; les tests passent un moteur sans rendu. */
  createEngine?: (canvas: HTMLCanvasElement) => AbstractEngine;
  water?: WaterSettings;
  /** Attente maximale de la compilation des shaders avant de lancer quand même la boucle (ms). */
  readyTimeoutMs?: number;
  /**
   * Prises de vue reproductibles (outil de développement, jamais utilisé par le jeu) : le bateau reste amarré à
   * l'abscisse s, à l'écart d du centre, et le temps de la scène est figé. La caméra est alors toujours au même endroit.
   */
  inspection?: { s: number; d?: number; time?: number; camera?: readonly [number, number, number, number, number, number] };
  /** Ombres et étalonnage des couleurs (tous deux actifs par défaut). */
  lighting?: LightingOptions;
  /** Essai de la forêt d'arbres stylisés entre deux abscisses (outil de développement : le jeu ne la plante pas encore). */
  forest?: { from: number; to: number; farLevel?: boolean; undergrowth?: boolean };
}

export interface RiverEngine {
  setSigns(signs: readonly (readonly [SignText, SignText, SignText])[]): void;
  showVerdict(fork: number, chosenLane: Lane, correct: boolean): void;
  resetCrossing(): void;
  celebrate(): void;
  /** Le bateau quitte le ponton : la traversée commence. */
  castOff(): void;
  /** Direction voulue, de -1 (gauche) à 1 (droite). */
  setSteer(value: number): void;
  setPaused(paused: boolean): void;
  resize(): void;
  getStats(): RiverEngineStats;
  dispose(): void;
}

/** WebGL indisponible : le jeu affiche un message plutôt qu'un écran noir. */
export class RiverEngineUnsupportedError extends Error {
  constructor(cause?: unknown) {
    super("WebGL n'est pas disponible.", { cause });
    this.name = "RiverEngineUnsupportedError";
  }
}

/** Lumière partagée par les matériaux écrits à la main (eau, ciel, lanternes, bateau) et le paysage. */
const LIGHT = SHADER_LIGHT;

/** Morceaux de paysage dessinés : un peu derrière le bateau, et jusque dans la brume devant lui. */
const VISIBLE_BEHIND = 70;
const VISIBLE_AHEAD = 380;

const PHYSICS_STEP = 1 / 60;
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function toVertexData(data: MeshData): VertexData {
  const vertexData = new VertexData();
  vertexData.positions = new Float32Array(data.positions);
  vertexData.normals = new Float32Array(data.normals);
  vertexData.colors = new Float32Array(data.colors);
  vertexData.indices = data.positions.length / 3 > 65535 ? new Uint32Array(data.indices) : new Uint16Array(data.indices);
  return vertexData;
}

function makeMesh(name: string, data: MeshData, material: Material, scene: Scene, frozen = true): Mesh | null {
  if (data.positions.length === 0) return null;
  const mesh = new Mesh(name, scene);
  toVertexData(data).applyToMesh(mesh, false);
  mesh.material = material;
  mesh.isPickable = false;
  // Seul le matériau du paysage reçoit les ombres ; les matériaux écrits à la main ignorent ce réglage.
  mesh.receiveShadows = true;
  if (frozen) {
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
  }
  return mesh;
}

function quadData(width: number, height: number): VertexData {
  const data = new VertexData();
  const w = width / 2;
  const h = height / 2;
  data.positions = [-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0];
  data.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  data.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
  data.indices = [0, 1, 2, 0, 2, 3];
  return data;
}

interface BoatVisual {
  node: TransformNode;
  shadow: Mesh;
  length: number;
}

export async function createRiverEngine(options: RiverEngineOptions): Promise<RiverEngine> {
  const started = performance.now();
  const progress = options.onBuildProgress ?? (() => undefined);
  const water = options.water ?? CALM_WATER;
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  canvas.setAttribute("aria-hidden", "true");
  options.host.appendChild(canvas);

  let engine: AbstractEngine;
  try {
    engine = options.createEngine
      ? options.createEngine(canvas)
      : new Engine(canvas, true, { stencil: false, preserveDrawingBuffer: false, premultipliedAlpha: false, failIfMajorPerformanceCaveat: false }, false);
  } catch (error) {
    canvas.remove();
    throw new RiverEngineUnsupportedError(error);
  }
  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  engine.setHardwareScalingLevel(1 / Math.min(ratio, options.maxPixelRatio ?? 1.5));

  const scene = new Scene(engine);
  scene.clearColor = new Color4(LIGHT.fogColor.x, LIGHT.fogColor.y, LIGHT.fogColor.z, 1);
  scene.skipPointerMovePicking = true;
  scene.detachControl();

  const shader = (name: string, vertex: string, fragment: string, attributes: string[], uniforms: string[], samplers: string[] = [], alpha = false) => {
    const material = new ShaderMaterial(name, scene, { vertexSource: vertex, fragmentSource: fragment }, { attributes, uniforms: [...uniforms, "grading"], samplers, needAlphaBlending: alpha });
    material.setVector3("grading", lighting.grading);
    material.backFaceCulling = false;
    material.setVector3("fogColor", LIGHT.fogColor);
    material.setFloat("fogDensity", LIGHT.fogDensity);
    return material;
  };
  // Caméra derrière le bateau, légèrement surélevée ; la lumière (soleil, ciel, ombres, étalonnage) en dépend.
  const camera = new TargetCamera("camera", new Vector3(0, 5, -10), scene);
  camera.minZ = 0.3;
  camera.maxZ = 3200;
  camera.fov = 0.9;
  scene.activeCamera = camera;
  const lighting = createLighting(scene, options.lighting);
  const lit = lighting.landscape;
  const glow = shader("glow", LIT_VERTEX, GLOW_FRAGMENT, ["position", "normal", "color"], ["world", "viewProjection", "eyePosition", "glow", "fogColor", "fogDensity"]);
  glow.setFloat("glow", 1.25);
  const waterMaterial = shader("water", WATER_VERTEX, WATER_FRAGMENT, ["position", "river", "shore"], [
    "world", "viewProjection", "time", "amplitude", "frequency", "eyePosition", "sunDirection", "sunColor", "skyZenith", "skyHorizon",
    "current", "turbulence", "reflection", "boat", "boatSpeed", "fogColor", "fogDensity",
  ]);
  waterMaterial.setFloat("amplitude", water.amplitude);
  waterMaterial.setFloat("frequency", water.frequency);
  waterMaterial.setFloat("current", water.current);
  waterMaterial.setFloat("turbulence", water.turbulence);
  waterMaterial.setFloat("reflection", water.reflection);
  waterMaterial.setVector3("sunDirection", LIGHT.sunDirection);
  waterMaterial.setVector3("sunColor", LIGHT.sunColor);
  waterMaterial.setVector3("skyZenith", LIGHT.skyZenith);
  waterMaterial.setVector3("skyHorizon", LIGHT.skyHorizon);
  const skyMaterial = shader("sky", SKY_VERTEX, SKY_FRAGMENT, ["position"], ["worldViewProjection", "sunDirection", "sunColor", "skyZenith", "skyHorizon", "time"]);
  skyMaterial.setVector3("sunDirection", LIGHT.sunDirection);
  skyMaterial.setVector3("sunColor", LIGHT.sunColor);
  skyMaterial.setVector3("skyZenith", LIGHT.skyZenith);
  skyMaterial.setVector3("skyHorizon", LIGHT.skyHorizon);
  skyMaterial.disableDepthWrite = true;
  const shadowMaterial = shader("shadow", SIGN_VERTEX, SHADOW_FRAGMENT, ["position", "uv"], ["world", "viewProjection", "opacity"], [], true);
  shadowMaterial.setFloat("opacity", 0.38);
  shadowMaterial.disableDepthWrite = true;
  progress(0.05);
  await nextTask();

  // Ciel, paysage, montagnes.
  const layout: RiverLayout = createLevelOneLayout();
  const landscape = buildLandscape(layout, (fraction) => progress(0.05 + fraction * 0.6), { forest: options.forest ? { from: options.forest.from, to: options.forest.to } : undefined });
  await nextTask();
  const skyData = emptyMesh();
  sphere(skyData, 1, [1, 1, 1], {}, 14);
  const sky = makeMesh("sky", skyData, skyMaterial, scene, false);
  if (sky) {
    sky.scaling.setAll(2400);
    sky.infiniteDistance = true;
    sky.renderingGroupId = 0;
  }
  const chunkMeshes: { s0: number; s1: number; meshes: Mesh[]; casters: Mesh[]; enabled: boolean }[] = [];
  landscape.chunks.forEach((chunk, index) => {
    const meshes: Mesh[] = [];
    const terrainMesh = makeMesh(`terrain-${index}`, chunk.terrain, lit, scene);
    if (terrainMesh) meshes.push(terrainMesh);
    const waterMesh = new Mesh(`water-${index}`, scene);
    const data = new VertexData();
    data.positions = new Float32Array(chunk.water.positions);
    data.indices = new Uint16Array(chunk.water.indices);
    data.applyToMesh(waterMesh, false);
    waterMesh.setVerticesData("river", new Float32Array(chunk.water.river), false, 2);
    waterMesh.setVerticesData("shore", new Float32Array(chunk.water.shore), false, 2);
    waterMesh.material = waterMaterial;
    waterMesh.isPickable = false;
    waterMesh.freezeWorldMatrix();
    meshes.push(waterMesh);
    const propsMesh = makeMesh(`props-${index}`, chunk.props.lit, lit, scene);
    const lanternMesh = makeMesh(`lanterns-${index}`, chunk.props.glow, glow, scene);
    if (propsMesh) meshes.push(propsMesh);
    if (lanternMesh) meshes.push(lanternMesh);
    // Les décors projettent une ombre ; le terrain la reçoit (son relief est déjà modelé par le soleil, et ses pentes
    // rasantes donneraient des moirures).
    const casters = propsMesh ? [propsMesh] : [];
    chunkMeshes.push({ s0: chunk.s0, s1: chunk.s1, meshes, casters, enabled: true });
  });
  const cullChunks = (s: number) => {
    for (const chunk of chunkMeshes) {
      const visible = chunk.s1 > s - VISIBLE_BEHIND && chunk.s0 < s + VISIBLE_AHEAD;
      if (visible === chunk.enabled) continue;
      chunk.enabled = visible;
      for (const mesh of chunk.meshes) mesh.setEnabled(visible);
    }
  };
  // La forêt est dessinée en instances, indépendamment des morceaux : chaque arbre choisit son niveau de détail.
  const forest = createForest(scene, lit, landscape.forest, options.forest);
  landscape.mountains.forEach((group, index) => makeMesh(`mountains-${index}`, group.lit, lit, scene));
  makeMesh("plain", landscape.plain, lit, scene);
  // Seuls les points d'ancrage restent en mémoire : la géométrie, désormais sur la carte graphique, est libérée.
  const signAnchors = landscape.signs;
  const barrierAnchors = landscape.barriers;
  const celebrationAnchor = landscape.celebration;
  const barrierModel = landscape.barrierModel;
  progress(0.72);
  await nextTask();

  // Panneaux des réponses : un canevas par voie, redessiné quand les réponses ou les verdicts changent.
  const signTextures: DynamicTexture[][] = [];
  const signMaterials: ShaderMaterial[][] = [];
  const signLabels: (SignText | null)[][] = signAnchors.map(() => [null, null, null]);
  const signMarks: SignMark[][] = signAnchors.map(() => ["none", "none", "none"]);
  const signGlow: number[][] = signAnchors.map(() => [0, 0, 0]);
  const quad = quadData(SIGN_WIDTH, SIGN_HEIGHT);
  const placeMesh = (mesh: Mesh | TransformNode, anchor: Anchor, yOffset = 0) => {
    mesh.position.set(anchor.x, anchor.y + yOffset, anchor.z);
    mesh.rotation.y = anchor.yaw;
  };
  signAnchors.forEach((fork, forkIndex) => {
    signTextures.push([]);
    signMaterials.push([]);
    fork.forEach((anchor, lane) => {
      const texture = new DynamicTexture(`sign-${forkIndex}-${lane}`, { width: SIGN_CANVAS_WIDTH, height: SIGN_CANVAS_HEIGHT }, scene, true);
      texture.hasAlpha = false;
      const material = shader(`sign-${forkIndex}-${lane}`, SIGN_VERTEX, SIGN_FRAGMENT, ["position", "uv"], ["world", "viewProjection", "eyePosition", "highlight", "fogColor", "fogDensity"], ["signTexture"]);
      material.setTexture("signTexture", texture);
      material.setFloat("highlight", 0);
      const mesh = new Mesh(`sign-${forkIndex}-${lane}`, scene);
      quad.applyToMesh(mesh, false);
      mesh.material = material;
      mesh.isPickable = false;
      placeMesh(mesh, anchor);
      signTextures[forkIndex].push(texture);
      signMaterials[forkIndex].push(material);
    });
  });
  const redrawSign = (fork: number, lane: number) => {
    const texture = signTextures[fork]?.[lane];
    if (!texture) return;
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    drawSign(context, signLabels[fork][lane], signMarks[fork][lane]);
    texture.update(true);
  };
  signAnchors.forEach((fork, f) => fork.forEach((_, lane) => redrawSign(f, lane)));

  // Barrages des mauvaises voies, cachés jusqu'au verdict.
  const barrierTemplate = makeMesh("barrier", barrierModel.lit, lit, scene, false);
  const barriers: (Mesh | null)[][] = barrierAnchors.map((fork, f) =>
    fork.map((anchor, lane) => {
      if (!barrierTemplate) return null;
      const mesh = barrierTemplate.clone(`barrier-${f}-${lane}`);
      placeMesh(mesh, anchor, -1.6);
      mesh.setEnabled(false);
      return mesh;
    }),
  );
  barrierTemplate?.setEnabled(false);
  const raising: { mesh: Mesh; t: number; base: number }[] = [];

  // Bateaux : celui du joueur, et les autres sur leurs trajets.
  const shadowQuad = quadData(1, 1);
  const makeBoat = (name: string, parts: ModelParts, length: number, width: number): BoatVisual => {
    const node = new TransformNode(name, scene);
    const body = makeMesh(`${name}-body`, parts.lit, lit, scene, false);
    const lights = makeMesh(`${name}-lights`, parts.glow, glow, scene, false);
    if (body) body.parent = node;
    if (lights) lights.parent = node;
    const shadow = new Mesh(`${name}-shadow`, scene);
    shadowQuad.applyToMesh(shadow, false);
    shadow.material = shadowMaterial;
    shadow.isPickable = false;
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.set(width * 1.5, length * 1.25, 1);
    return { node, shadow, length };
  };
  const player = createPlayerBoat(scene, BOAT_LIGHT, shadowMaterial, lighting.grading);
  const traffic: TrafficBoat[] = createTraffic(layout);
  const random = createSeeded(77);
  const models = { fishing: fishingBoat(random), cargo: cargoBoat(random), passenger: passengerBoat(random) };
  const sizes = { fishing: [6, 1.4], cargo: [8, 2.4], passenger: [7, 2.2] } as const;
  const others = traffic.map((boat) => makeBoat(`boat-${boat.id}`, models[boat.kind], sizes[boat.kind][0], sizes[boat.kind][1]));

  // Lanternes célestes de la fête d'arrivée.
  const lanternParts = skyLantern();
  const lanternData = emptyMesh();
  place(lanternData, lanternParts.glow, {});
  const lanternTemplate = makeMesh("sky-lantern", lanternData, glow, scene, false);
  const skyLanterns = Array.from({ length: 26 }, (_, i) => {
    const mesh = lanternTemplate ? lanternTemplate.clone(`sky-lantern-${i}`) : null;
    mesh?.setEnabled(false);
    return { mesh, angle: random() * Math.PI * 2, radius: 4 + random() * 22, speed: 0.9 + random() * 0.9, delay: random() * 6, sway: random() * 6 };
  });
  lanternTemplate?.setEnabled(false);
  let celebration = -1;


  const inspection = options.inspection;
  let boat: BoatState = inspection ? { ...initialBoat(layout), s: inspection.s, d: inspection.d ?? 0 } : initialBoat(layout);
  let steer = 0;
  let time = inspection?.time ?? 0;
  let accumulator = 0;
  let paused = false;
  let disposed = false;
  const eye = new Vector3();
  const look = new Vector3();
  const boatUniform = new Vector4();

  const portrait = () => engine.getRenderWidth() < engine.getRenderHeight();
  const frameCamera = (jump: boolean, dt: number) => {
    const p = layout.toWorld(boat.s, boat.d);
    const ahead = layout.pointAt(boat.s + 10).heading;
    const tall = portrait();
    const back = tall ? 11 : 8.2;
    const height = tall ? 5.6 : 3.7;
    const lead = tall ? 16 : 13;
    const fx = Math.sin(ahead);
    const fz = Math.cos(ahead);
    const wantEye = new Vector3(p.x - fx * back, height, p.z - fz * back);
    const wantLook = new Vector3(p.x + fx * lead, tall ? 0.6 : 1.3, p.z + fz * lead);
    if (jump) {
      eye.copyFrom(wantEye);
      look.copyFrom(wantLook);
    } else {
      Vector3.LerpToRef(eye, wantEye, 1 - Math.exp(-dt * 3), eye);
      Vector3.LerpToRef(look, wantLook, 1 - Math.exp(-dt * 4.5), look);
    }
    const fixed = inspection?.camera;
    if (fixed) {
      eye.set(fixed[0], fixed[1], fixed[2]);
      look.set(fixed[3], fixed[4], fixed[5]);
    }
    camera.position.copyFrom(eye);
    camera.setTarget(look);
    camera.fovMode = tall ? 1 : 0;
    camera.fov = tall ? 1.3 : 0.9;
  };

  const poseBoat = (visual: BoatVisual, s: number, d: number, yawOffset: number, lateral: number) => {
    const { x, z } = layout.toWorld(s, d);
    const heading = layout.pointAt(s).heading + yawOffset;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const half = visual.length * 0.4;
    const front = waterHeight(x + fx * half, z + fz * half, time, water);
    const rear = waterHeight(x - fx * half, z - fz * half, time, water);
    const side = waterHeight(x + fz * 0.7, z - fx * 0.7, time, water) - waterHeight(x - fz * 0.7, z + fx * 0.7, time, water);
    visual.node.position.set(x, (front + rear) / 2 - 0.24, z);
    visual.node.rotation.set(-Math.atan2(front - rear, visual.length * 0.8) * 0.8, heading, -side * 0.6 - lateral * 0.05);
    visual.shadow.position.set(x, 0.03, z);
    visual.shadow.rotation.y = heading;
  };

  const waterAt = (x: number, z: number) => waterHeight(x, z, time, water);
  const posePlayer = (dt: number) => {
    const heading = layout.pointAt(boat.s).heading + boatYaw(boat);
    const position = layout.toWorld(boat.s, boat.d);
    player.update({ x: position.x, z: position.z, heading, speed: boat.speed, lateral: boat.lateral, steer, moored: boat.moored, dt, time, waterAt });
    return { heading, position };
  };

  // Ombres portées du paysage (arbres, maisons, ponts, collines) : une carte régionale centrée devant le bateau,
  // redessinée seulement quand il a progressé de 40 m. Les bateaux, au-dessus de l'eau, gardent leur ombre douce.
  const SHADOW_STEP = 40;
  const SHADOW_LEAD = 60;
  const SHADOW_REACH = 110;
  let shadowCenter = Number.NaN;
  const shadowFocus = new Vector3();
  const updateShadows = () => {
    const centre = Math.round((boat.s + SHADOW_LEAD) / SHADOW_STEP) * SHADOW_STEP;
    if (centre === shadowCenter) return;
    shadowCenter = centre;
    const casters = chunkMeshes.filter((chunk) => chunk.s1 > centre - SHADOW_REACH && chunk.s0 < centre + SHADOW_REACH).flatMap((chunk) => chunk.casters);
    if (forest) casters.push(...forest.casters);
    const focus = layout.toWorld(centre, 0);
    shadowFocus.set(focus.x, 0, focus.z);
    lighting.setShadowRegion(shadowFocus, casters);
  };

  const update = (dt: number) => {
    if (!inspection) time += dt;
    accumulator += dt;
    const crossings: { fork: number; lane: Lane }[] = [];
    const obstacles: Obstacle[] = [];
    traffic.forEach((other, i) => {
      const pose = trafficPose(other, time);
      if (Math.abs(pose.s - boat.s) < 30) obstacles.push({ s: pose.s, d: pose.d, radius: sizes[other.kind][1] / 2 + 0.6 });
      const visible = pose.s > boat.s - VISIBLE_BEHIND && pose.s < boat.s + VISIBLE_AHEAD;
      others[i].node.setEnabled(visible);
      others[i].shadow.setEnabled(visible);
      if (visible) poseBoat(others[i], pose.s, pose.d, pose.direction > 0 ? 0 : Math.PI, 0);
    });
    while (accumulator >= PHYSICS_STEP) {
      const step = stepBoat(boat, steer, PHYSICS_STEP, layout, obstacles);
      boat = step.state;
      if (step.crossing) crossings.push(step.crossing);
      accumulator -= PHYSICS_STEP;
    }
    const { heading, position } = posePlayer(dt);
    frameCamera(false, dt);
    cullChunks(boat.s);
    forest?.update(camera.position, look.subtract(eye));
    updateShadows();

    boatUniform.set(position.x, position.z, Math.sin(heading), Math.cos(heading));
    waterMaterial.setVector4("boat", boatUniform);
    waterMaterial.setFloat("boatSpeed", boat.speed);
    waterMaterial.setFloat("time", time);
    skyMaterial.setFloat("time", time);
    for (const material of [glow, waterMaterial, player.material]) material.setVector3("eyePosition", camera.position);
    signMaterials.forEach((fork, f) =>
      fork.forEach((material, lane) => {
        material.setVector3("eyePosition", camera.position);
        signGlow[f][lane] = Math.max(0, signGlow[f][lane] - dt * 0.6);
        material.setFloat("highlight", signGlow[f][lane]);
      }),
    );
    glow.setFloat("glow", 1.2 + 0.08 * Math.sin(time * 2.3));

    for (let i = raising.length - 1; i >= 0; i -= 1) {
      const item = raising[i];
      item.t = Math.min(1, item.t + dt * 1.4);
      item.mesh.position.y = item.base - 1.6 * (1 - item.t) * (1 - item.t);
      if (item.t >= 1) raising.splice(i, 1);
    }
    if (celebration >= 0) {
      celebration += dt;
      skyLanterns.forEach((lantern) => {
        if (!lantern.mesh) return;
        const t = celebration - lantern.delay;
        lantern.mesh.setEnabled(t > 0);
        if (t <= 0) return;
        const base = celebrationAnchor;
        lantern.mesh.position.set(
          base.x + Math.cos(lantern.angle) * lantern.radius + Math.sin(t * 0.7 + lantern.sway) * 0.8,
          base.y + 1 + t * lantern.speed,
          base.z + Math.sin(lantern.angle) * lantern.radius,
        );
      });
    }
    for (const crossing of crossings) options.onLaneCrossed(crossing.fork, crossing.lane);
  };

  frameCamera(true, 0);
  posePlayer(0);
  cullChunks(boat.s);
  forest?.update(camera.position, look.subtract(eye));
  updateShadows();
  progress(0.85);
  // Les shaders se compilent avant la première image ; un pilote graphique capricieux ne bloque jamais le chargement.
  await Promise.race([scene.whenReadyAsync(), new Promise((resolve) => setTimeout(resolve, options.readyTimeoutMs ?? 10_000))]);
  const buildMs = performance.now() - started;
  progress(1);

  let lastDrawCalls = 0;
  const loop = () => {
    update(Math.min(engine.getDeltaTime() / 1000, 0.1));
    const before = engine._drawCalls.current;
    scene.render();
    lastDrawCalls = engine._drawCalls.current - before;
  };
  engine.runRenderLoop(loop);
  engine.onContextRestoredObservable.add(() => signAnchors.forEach((fork, f) => fork.forEach((_, lane) => redrawSign(f, lane))));

  return {
    setSigns(signs) {
      signs.forEach((labels, fork) =>
        labels.forEach((label, lane) => {
          if (!signLabels[fork]) return;
          signLabels[fork][lane] = label;
          signMarks[fork][lane] = "none";
          redrawSign(fork, lane);
        }),
      );
    },
    showVerdict(fork, chosenLane, correct) {
      if (!signMarks[fork]) return;
      signMarks[fork][chosenLane] = correct ? "correct" : "wrong";
      signGlow[fork][chosenLane] = 1;
      redrawSign(fork, chosenLane);
      if (!correct) {
        const mesh = barriers[fork]?.[chosenLane];
        if (mesh) {
          mesh.setEnabled(true);
          raising.push({ mesh, t: 0, base: barrierAnchors[fork][chosenLane].y });
        }
        boat = { ...boat, stopAt: stopBeforeBarrier(layout.forks[fork]) };
      }
    },
    resetCrossing() {
      boat = { ...initialBoat(layout), moored: false };
      player.reset();
      posePlayer(0);
      barriers.forEach((fork) => fork.forEach((mesh) => mesh?.setEnabled(false)));
      raising.length = 0;
      celebration = -1;
      skyLanterns.forEach((lantern) => lantern.mesh?.setEnabled(false));
      signMarks.forEach((fork) => fork.fill("none"));
      frameCamera(true, 0);
      cullChunks(boat.s);
      updateShadows();
    },
    celebrate() {
      celebration = 0;
    },
    castOff() {
      boat = { ...boat, moored: false };
    },
    setSteer(value) {
      steer = Math.max(-1, Math.min(1, value));
    },
    setPaused(next) {
      if (disposed || next === paused) return;
      paused = next;
      if (paused) engine.stopRenderLoop(loop);
      else engine.runRenderLoop(loop);
    },
    resize() {
      if (!disposed) engine.resize();
    },
    getStats() {
      return {
        fps: Math.round(engine.getFps()),
        activeMeshes: scene.getActiveMeshes().length,
        triangles: Math.round(scene.getActiveIndices() / 3),
        buildMs: Math.round(buildMs),
        shadowTriangles: lighting.shadowStats().triangles,
        shadowRenders: lighting.shadowStats().renders,
        boatS: Math.round(boat.s * 10) / 10,
        boatD: Math.round(boat.d * 10) / 10,
        drawCalls: lastDrawCalls,
        forest: forest?.stats() ?? null,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}
