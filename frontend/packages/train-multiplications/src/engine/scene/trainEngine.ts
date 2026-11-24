import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { Scene } from "@babylonjs/core/scene";
import type { Material } from "@babylonjs/core/Materials/material";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { decorAnchors, inRailwayClearance, type DecorAnchor } from "../../world/anchors";

import { createConsist, poseVehicle, vehicleFronts, type Consist, type VehiclePose } from "../../domain/consist";
import { createNetwork, isUnderground, stationsOn, type Network, type RouteId, type StationStop } from "../../domain/network";
import { initialState, PHYSICS, reverse, stepTrain, type DriverInput, type TrainState } from "../../domain/physics";
import type { Track } from "../../domain/track";
import { createTrainAudio, type TrainAudio } from "../audio/trainAudio";
import { emptyMesh, lathe, merge, mixColor, place, type MeshData } from "../geometry/kit";
import { MATERIAL, PALETTE } from "../geometry/palette";
import { LOCO_ANCHORS } from "../geometry/rollingStock";
import { disc } from "../geometry/shapes";
import { signalModel, switchLever, switchStand, lampLens } from "../geometry/signals";
import { islandPlatform, PLATFORM, stationMesh, stationPlacement, stopBoard } from "../geometry/stations";
import { GALLERY, galleryPortal, plumbFrame, TUNNEL_CROWN, stoneViaduct, TRUSS, trussBridge, tunnelLampPoints, tunnelLamps, tunnelLining, tunnelPortal } from "../geometry/structures";
import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { createRelief, terrainTiles, type Relief } from "../geometry/terrain";
import { bufferStop, FORMATION_DEPTH, railMesh, trackMesh, turnoutFrog } from "../geometry/trackGeometry";
import { createCameraRig, depthInside, type CameraMode } from "./cameraRig";
import { createObstacles, type Box } from "./clearance";
import { createLighting, LIGHTING, OUTDOOR, UNDERGROUND } from "./lighting";
import { createSkyEnvironment } from "./environment";
import { createMaterialSet, type MaterialSet } from "./materials";
import { makeMesh } from "./meshes";
import { createRenderEngine, type Renderer, type RendererChoice } from "./renderEngine";
import { createBoardAtlas } from "./signage";
import { createSteam, type Steam } from "./steam";
import { createTrainView, type TrainView } from "./trainView";

// Le moteur du Train des multiplications : il construit le monde ferroviaire (relief nécessaire, voies, ouvrages,
// gares, signaux), le train, les caméras, la fumée et le son, puis fait tourner la boucle : physique à pas fixe,
// pose des véhicules, animation des roues, caméra, éclairage du tunnel, gares et aiguillage.
//
// Le décor naturel n'est pas construit ici. `decor` est le point d'accroche de l'habillage à venir (magasin de
// ressources de Yamba Studio) : le relief et le réseau, les points de placement (`world/anchors.ts`), le test du
// gabarit ferroviaire, des emplacements de matériaux remplaçables (terrain, maçonnerie et ferronnerie, lampes, ciel)
// et `addModel` pour poser un modèle 3D importé, sans rien changer au train ni au réseau.
//
// Écrit pour Yamba.

export class TrainEngineUnsupportedError extends Error {
  constructor() {
    super("WebGL indisponible");
    this.name = "TrainEngineUnsupportedError";
  }
}

export type Quality = "auto" | "low" | "high";

export interface TrainEngineOptions {
  host: HTMLElement;
  maxPixelRatio?: number;
  quality?: Quality;
  /** Nombre de wagons et de caisses par wagon (préparation des futures missions). */
  wagons?: number;
  cratesPerWagon?: number;
  onBuildProgress?: (fraction: number) => void;
  onEvent?: (event: TrainEvent) => void;
  /** Outil de développement : train posé à cette abscisse, caméra choisie, temps figé si `frozen`. */
  inspection?: { head: number; camera?: CameraMode; route?: RouteId; speed?: number; frozen?: boolean };
  /** Moteur de rendu : WebGPU si l'appareil le permet, sinon WebGL (par défaut « auto »). */
  renderer?: RendererChoice;
  /** Vraies lampes dans les tunnels (éclairage groupé), quand l'appareil le permet (par défaut oui). */
  clusteredLights?: boolean;
  /** Fumée et vapeur calculées par la carte graphique, quand l'appareil le permet (par défaut oui en qualité haute). */
  gpuParticles?: boolean;
  /** Outil de diagnostic (atelier) : familles de maillages à retirer pour mesurer leur coût. */
  diagnostics?: readonly ("shadows" | "smoke" | "terrain" | "track" | "decor" | "train")[];
}

export type TrainEvent =
  | { type: "arrived"; station: string; name: string; precision: number }
  | { type: "departed"; station: string }
  | { type: "bumped" }
  | { type: "switch"; route: RouteId }
  | { type: "entered"; structure: string }
  | { type: "camera"; mode: CameraMode };

export interface TrainSnapshot {
  /** Vitesse (km/h, positive en marche avant), sens de l'inverseur, régulateur et frein. */
  speedKmh: number;
  direction: 1 | -1;
  throttle: number;
  brake: number;
  emergency: boolean;
  camera: CameraMode;
  route: RouteId;
  /** Prochaine gare dans le sens de marche, distance au repère d'arrêt (m, positive devant). */
  nextStation: { id: string; name: string; distance: number } | null;
  /** Le train est arrêté en gare, au repère (à 6 m près). */
  atStation: { id: string; name: string } | null;
  underground: boolean;
  /** L'aiguillage peut encore être manœuvré (le train ne l'a pas atteint). */
  switchFree: boolean;
  structure: string | null;
}

export interface TrainEngineStats {
  fps: number;
  triangles: number;
  drawCalls: number;
  activeMeshes: number;
  particles: number;
  buildMs: number;
  /** Temps CPU moyen (ms) de la logique (physique, poses, caméra) et de la préparation du rendu, sur la dernière seconde. */
  logicMs: number;
  renderMs: number;
  head: number;
  pixelRatio: number;
  quality: "low" | "high";
  /** Moteur de rendu réellement utilisé, et état des fonctions modernes. */
  renderer: Renderer;
  environment: "prefiltered" | "realtime" | "none";
  clusteredLights: number;
  gpuParticles: boolean;
}

/** Emplacements de matériaux : chacun peut être remplacé (texture, PBR…) sans toucher aux géométries. */
export type MaterialSlot = "terrain" | "infrastructure" | "lamps" | "sky";

export interface DecorHandle {
  relief: Relief;
  network: Network;
  scene: Scene;
  /** Points de placement du futur décor (rivières, cascades, sommets, abords des gares et de la voie). */
  anchors: readonly DecorAnchor[];
  /** Le point (x, z) est-il trop près d'une voie pour y poser du décor ? */
  inClearance(x: number, z: number, y?: number): boolean;
  /** Matériau actuel d'un emplacement, et remplacement sur tous les maillages qui l'utilisent. */
  material(slot: MaterialSlot): Material;
  replaceMaterial(slot: MaterialSlot, material: Material): void;
  /**
   * Pose un modèle importé (maillage ou nœud) : à un point de placement, ou à une position donnée ; au grand air (par
   * défaut) ou sous terre ; il reçoit et projette les ombres du soleil si on le demande.
   */
  addModel(model: TransformNode, options: { anchor?: string; position?: Vector3; heading?: number; underground?: boolean; shadows?: boolean }): void;
}

export interface TrainEngineHandle {
  setInput(input: Partial<DriverInput>): void;
  reverse(): boolean;
  emergencyStop(): void;
  whistle(): void;
  setCamera(mode: CameraMode): void;
  /** Change l'itinéraire de l'aiguillage du village ; refusé si le train l'a déjà atteint. */
  toggleSwitch(): boolean;
  snapshot(): TrainSnapshot;
  stats(): TrainEngineStats;
  audio: TrainAudio;
  setPaused(paused: boolean): void;
  restart(): void;
  /** Point d'accroche du futur décor : le relief et le réseau. */
  decor: DecorHandle;
  dispose(): void;
}

/** Boîte orientée (cap `heading`) qui enveloppe les sommets d'un maillage situés au-dessus de `above`. */
function boxAround(data: { positions: number[] }, heading: number, above: number): Box {
  const c = Math.cos(heading);
  const sn = Math.sin(heading);
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < data.positions.length; i += 3) {
    const [x, y, z] = [data.positions[i], data.positions[i + 1], data.positions[i + 2]];
    if (y < above) continue;
    const across = x * c - z * sn;
    const along = x * sn + z * c;
    minA = Math.min(minA, across); maxA = Math.max(maxA, across);
    minB = Math.min(minB, along); maxB = Math.max(maxB, along);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const ca = (minA + maxA) / 2;
  const cb = (minB + maxB) / 2;
  // Retour au monde : across = x·cos − z·sin, along = x·sin + z·cos.
  return { x: ca * c + cb * sn, z: -ca * sn + cb * c, y: (minY + maxY) / 2, heading, half: [(maxA - minA) / 2 + 0.3, (maxY - minY) / 2 + 0.3, (maxB - minB) / 2 + 0.3] };
}

const yieldFrame = () => new Promise<void>((resolve) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));

function detectQuality(requested: Quality): "low" | "high" {
  if (requested !== "auto") return requested;
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const small = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 500;
  return cores <= 4 || memory <= 3 || small ? "low" : "high";
}

export async function createTrainEngine(options: TrainEngineOptions): Promise<TrainEngineHandle> {
  const started = performance.now();
  const progress = (f: number) => options.onBuildProgress?.(Math.min(1, f));
  const quality = detectQuality(options.quality ?? "auto");
  let canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  canvas.setAttribute("aria-hidden", "true");
  options.host.appendChild(canvas);
  let engine: AbstractEngine;
  let renderer: Renderer;
  try {
    ({ engine, renderer, canvas } = await createRenderEngine(canvas, quality === "high", options.renderer ?? "auto"));
  } catch {
    canvas.remove();
    throw new TrainEngineUnsupportedError();
  }
  const pixelRatio = Math.min(options.maxPixelRatio ?? (quality === "low" ? 1.25 : 1.75), typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  engine.setHardwareScalingLevel(1 / pixelRatio);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(LIGHTING.skyHorizon.x, LIGHTING.skyHorizon.y, LIGHTING.skyHorizon.z, 1);
  scene.skipPointerMovePicking = true;
  const lighting = createLighting(scene, { shadowMapSize: quality === "low" ? 1024 : 2048 });
  // Matériaux physiques : un jeu pour les ouvrages au grand air, un pour l'intérieur des tunnels (le ciel ne s'y
  // reflète presque pas), un pour le terrain (minéral, un seul appel de dessin par tuile).
  const material = createMaterialSet(scene, "infrastructure", { environment: 0.5 });
  const undergroundMaterial = createMaterialSet(scene, "underground", { environment: 0.06 });
  const terrainMaterial = createMaterialSet(scene, "terrain", { environment: 0.25 });
  progress(0.05);

  // ——— Réseau et relief
  const network = createNetwork();
  const relief = createRelief(network);
  const main = network.routes.main;
  const branch = network.routes.branch;
  await yieldFrame();

  // Ciel : dôme au dégradé du zénith à l'horizon, sans lumière ni brume, visible aussi depuis les tunnels.
  const skyMaterial = new StandardMaterial("sky", scene);
  skyMaterial.disableLighting = true;
  skyMaterial.emissiveColor = Color3.White();
  skyMaterial.diffuseColor = Color3.Black();
  skyMaterial.fogEnabled = false;
  skyMaterial.backFaceCulling = false;
  const skyData = emptyMesh();
  const zenith: [number, number, number] = [LIGHTING.skyZenith.x, LIGHTING.skyZenith.y, LIGHTING.skyZenith.z];
  const horizon: [number, number, number] = [LIGHTING.skyHorizon.x, LIGHTING.skyHorizon.y, LIGHTING.skyHorizon.z];
  const skyProfile: [number, number][] = [];
  for (let i = 0; i <= 10; i += 1) {
    const a = (i / 10) * (Math.PI / 2) - 0.08;
    skyProfile.push([Math.cos(a) * 1400, Math.sin(a) * 1400]);
  }
  skyProfile.push([0, 1400]);
  lathe(skyData, skyProfile, 24, (h) => mixColor(horizon, zenith, Math.min(1, Math.max(0, h / 900)) ** 0.7));
  const sky = makeMesh(scene, "sky", skyData, skyMaterial, { layer: OUTDOOR | UNDERGROUND, receiveShadows: false });
  // Le dôme suit la caméra (distance infinie) : sa matrice n'est jamais figée, et il est toujours dessiné.
  sky.infiniteDistance = true;
  sky.alwaysSelectAsActiveMesh = true;
  sky.applyFog = false;

  // Terrain neutre en tuiles.
  // Le terrain a son propre matériau (emplacement « terrain »), pour être habillé à part.
  const terrain = terrainTiles(relief).map((tile, i) => {
    const near = makeMesh(scene, `terrain-${i}`, tile.near, terrainMaterial, { single: MATERIAL.mineral });
    const far = makeMesh(scene, `terrain-${i}-far`, tile.far, terrainMaterial, { receiveShadows: false, single: MATERIAL.mineral });
    // La distance est comptée jusqu'au centre de la tuile (216 m de côté) : version fine dans un rayon d'environ 300 m.
    near.addLODLevel(330, far);
    far.freezeWorldMatrix();
    return near;
  });
  progress(0.3);
  await yieldFrame();

  // ——— Voies : morceaux de 60 m, coupés aux portails (un morceau est au grand air ou sous terre, jamais les deux).
  const cuts = (track: Track, from: number) => {
    const points = new Set<number>([from, track.length]);
    for (let s = Math.ceil(from / 120) * 120; s < track.length; s += 120) points.add(s);
    for (const st of network.structures) if (st.kind !== "stone-viaduct") [st.from, st.to].forEach((s) => s > from && points.add(s));
    return [...points].sort((a, b) => a - b);
  };
  const statics: Mesh[] = [];
  const casters: AbstractMesh[] = [];
  const bladeLength = 7;
  const addTrack = (name: string, track: Track, from: number, isBranch: boolean) => {
    const points = cuts(track, from);
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const c = points[i + 1];
      const underground = isUnderground(network, (a + c) / 2);
      // Sur le pont métallique, la voie est posée sur les longerons, sans ballast.
      const openDeck = network.structures.some((st) => st.kind === "truss-bridge" && (a + c) / 2 > st.from && (a + c) / 2 < st.to);
      const turnout = !isBranch && c > network.switchAt && a < network.switchAt + network.switchLength;
      const data = trackMesh(track, a, c, {
        sleepers: isBranch ? !(c > network.switchAt && a < network.switchAt + network.switchLength) : true,
        ballast: !openDeck && !(isBranch && a < network.switchAt + network.switchLength * 0.5),
        skipRail: isBranch ? [{ side: -1, from: network.switchAt, to: network.switchAt + bladeLength }] : [{ side: 1, from: network.switchAt, to: network.switchAt + bladeLength }],
        longSleepers: turnout ? { from: network.switchAt, to: network.switchAt + network.switchLength, extra: network.trackSpacing, side: 1 } : undefined,
      });
      const layer = underground ? UNDERGROUND : OUTDOOR;
      const near = makeMesh(scene, `${name}-${i}`, data, underground ? undergroundMaterial : material, { layer });
      const ballast = !openDeck && !(isBranch && a < network.switchAt + network.switchLength * 0.5);
      // Trois niveaux : de près, traverses, selles et rails au vrai profil ; à moyenne distance (au-delà de 110 m du
      // centre du morceau), traverses simples et rails simplifiés ; au loin (au-delà de 260 m), rails et ballast seuls.
      const mid = makeMesh(scene, `${name}-${i}-mid`, trackMesh(track, a, c, { sleepers: !isBranch || c <= network.switchAt || a >= network.switchAt + network.switchLength, plates: false, railStep: 3, ballast, ballastStep: 3 }), material, { layer, receiveShadows: false, single: MATERIAL.mineral });
      const far = makeMesh(scene, `${name}-${i}-far`, trackMesh(track, a, c, { sleepers: false, railStep: 8, ballast, ballastStep: 8 }), material, { layer, receiveShadows: false, single: MATERIAL.mineral });
      near.addLODLevel(110, mid);
      near.addLODLevel(260, far);
      statics.push(near);
    }
  };
  addTrack("main", main, 0, false);
  addTrack("branch", branch, network.switchAt, true);
  // Aiguilles mobiles : deux lames qui pivotent autour de leur talon.
  const blade = (name: string, track: Track, side: -1 | 1) => {
    const data = emptyMesh();
    railMesh(data, track, side, network.switchAt, network.switchAt + bladeLength);
    const mesh = makeMesh(scene, name, data, material);
    const heel = track.pointAt(network.switchAt + bladeLength);
    mesh.setPivotPoint(new Vector3(heel.x, heel.y, heel.z));
    return mesh;
  };
  const bladeStraight = blade("blade-straight", main, 1);
  const bladeDiverging = blade("blade-diverging", branch, -1);
  statics.push(makeMesh(scene, "turnout-frog", turnoutFrog(main, branch, network.switchAt, network.switchLength), material, { keep: true }));
  // Heurtoirs.
  statics.push(makeMesh(scene, "stop-start", bufferStop(main, 1.2, -1), material, { keep: true }));
  statics.push(makeMesh(scene, "stop-main", bufferStop(main, main.length - 0.6, 1), material, { keep: true }));
  statics.push(makeMesh(scene, "stop-branch", bufferStop(branch, branch.length - 0.6, 1), material, { keep: true }));
  progress(0.45);
  await yieldFrame();

  // Signalétique (un seul maillage) et petits objets du décor (poteaux, tableaux d'arrêt, signaux), fusionnés.
  const atlas = createBoardAtlas(scene, "boards");
  const small = emptyMesh();

  // ——— Ouvrages
  // Éclairage groupé (Clustered Lighting, Babylon.js 9) : chaque luminaire des tunnels devient une vraie lampe, qui
  // éclaire la voûte, la voie et le train qui passe. Pris en charge en WebGPU et en WebGL 2 (avec le mélange de
  // flottants) ; ailleurs, les flaques de lumière restent peintes sur la voûte, comme avant.
  const cluster = options.clusteredLights === false ? null : new ClusteredLightContainer("tunnel-lamps", [], scene);
  const clustered = cluster !== null && cluster.isSupported;
  if (cluster && !clustered) cluster.dispose();
  if (cluster && clustered) {
    cluster.includeOnlyWithLayerMask = OUTDOOR | UNDERGROUND;
    cluster.maxRange = 18;
  }
  // Avec de vraies lampes, la lumière de voûte uniforme n'a plus qu'à adoucir les ombres.
  const vault = scene.getLightByName("tunnel-vault");
  if (clustered && vault) vault.intensity *= 0.55;
  const lampMaterial = new StandardMaterial("tunnel-lamps", scene);
  lampMaterial.disableLighting = true;
  lampMaterial.emissiveColor = new Color3(1, 0.86, 0.55);
  lampMaterial.fogEnabled = false;
  for (const structure of network.structures) {
    if (structure.kind === "stone-viaduct" || structure.kind === "truss-bridge") {
      const stone = structure.kind === "stone-viaduct";
      const data = (stone ? stoneViaduct : trussBridge)(main, { from: structure.from, to: structure.to, ground: relief.height });
      const mesh = makeMesh(scene, structure.kind, data, material, { keep: true });
      statics.push(mesh);
      casters.push(mesh);
      // Plaque au nom de l'ouvrage : sur le portique d'entrée du pont métallique, sur le parapet du viaduc.
      for (const [s, facing] of [[structure.from, -1], [structure.to, 1]] as const) {
        const f = plumbFrame(main, stone ? s + facing * 6 : s - facing * 0.6);
        const heading = Math.atan2(f.forward[0], f.forward[2]) + (facing > 0 ? 0 : Math.PI);
        if (stone) {
          for (const side of [-1, 1]) {
            const x = side * 3.36;
            atlas.add(structure.name, 4.2, 0.5, { background: "#f2e6c8", border: "#7a5b34", color: "#4a3115" }, new Vector3(f.p[0] + f.right[0] * x, f.p[1] - 0.2, f.p[2] + f.right[2] * x), Math.atan2(f.forward[0], f.forward[2]) + Math.PI / 2);
          }
        } else {
          const out = new Vector3(f.forward[0], 0, f.forward[2]).scaleInPlace(facing * 0.35);
          atlas.add(structure.name, 4.6, 0.62, { background: "#2c2f36", border: "#c9a45b", color: "#f3e6c4" }, new Vector3(f.p[0] + out.x, f.p[1] - FORMATION_DEPTH - 0.55 + TRUSS.endHeight - 0.1, f.p[2] + out.z), heading);
        }
      }
      continue;
    }
    const rock = structure.kind === "rock-tunnel";
    const lamps: number[] = [];
    for (let s = structure.from + 8; s < structure.to - 6; s += rock ? 12 : 10) lamps.push(s);
    const fixtures = tunnelLamps(main, lamps, rock ? "rock" : "gallery");
    const lining = tunnelLining(main, structure.from, structure.to, { kind: rock ? "rock" : "gallery", lamps, pools: clustered ? 0.25 : 1 });
    if (cluster && clustered) {
      tunnelLampPoints(main, lamps, rock ? "rock" : "gallery").forEach((p, i) => {
        const light = new PointLight(`lamp-${structure.from}-${i}`, new Vector3(p[0], p[1], p[2]), scene, true);
        light.diffuse = new Color3(1, 0.78, 0.5);
        light.specular = new Color3(0.5, 0.4, 0.28);
        light.intensity = rock ? 16 : 13;
        light.range = 16;
        cluster.addLight(light);
      });
    }
    merge(lining, fixtures.fittings);
    statics.push(makeMesh(scene, `${structure.kind}-lining-${structure.from}`, lining, undergroundMaterial, { layer: UNDERGROUND, receiveShadows: false, keep: true }));
    makeMesh(scene, `${structure.kind}-lamps-${structure.from}`, fixtures.glow, lampMaterial, { layer: OUTDOOR | UNDERGROUND, receiveShadows: false });
    for (const [s, facing] of [[structure.from, -1], [structure.to, 1]] as const) {
      const f = plumbFrame(main, s);
      const above = relief.natural(f.p[0], f.p[2]) - f.p[1];
      const height = Math.max(rock ? TUNNEL_CROWN + 3.4 : GALLERY.ceiling + 2.2, Math.min(rock ? 17 : GALLERY.ceiling + 3.4, above + 1.5));
      const portal = rock ? tunnelPortal(main, s, facing, height) : galleryPortal(main, s, facing, height);
      const mesh = makeMesh(scene, `${structure.kind}-portal-${facing}`, portal, material, { keep: true });
      statics.push(mesh);
      casters.push(mesh);
      // Plaque au nom de l'ouvrage, au-dessus de la voûte.
      const out = new Vector3(f.forward[0], 0, f.forward[2]).scaleInPlace(facing * (rock ? 0.95 : 0.75));
      atlas.add(structure.name, 5.6, 0.8, rock ? { background: "#f2e6c8", border: "#7a5b34", color: "#4a3115" } : { background: "#f4f4f0", border: "#2f3b4a", color: "#1f2b3a" }, new Vector3(f.p[0] + out.x, f.p[1] + (rock ? TUNNEL_CROWN + 1.6 : GALLERY.ceiling + 0.43), f.p[2] + out.z), Math.atan2(f.forward[0], f.forward[2]) + (facing > 0 ? 0 : Math.PI));
    }
  }
  progress(0.6);
  await yieldFrame();

  // ——— Gares, quais, panneaux, repères d'arrêt
  const buildingBoxes: Box[] = [];
  const stopBoardData = stopBoard();
  for (const station of network.stations) {
    const track = station.route === "branch" ? branch : main;
    if (station.id === "village-2") {
      statics.push(makeMesh(scene, "island-platform", islandPlatform(main, network.stations.find((s) => s.id === "village-1")!, network.trackSpacing), material, { keep: true }));
    } else {
      const data = stationMesh(track, station, station.building === "terminal" ? 6.2 : station.building === "village" ? 4.6 : 4);
      const mesh = makeMesh(scene, `station-${station.id}`, data, material, { keep: true });
      // Volume du bâtiment (au-dessus du quai) : la caméra n'y entre jamais.
      const p = stationPlacement(track, station);
      buildingBoxes.push(boxAround(data, p.heading, p.y + PLATFORM.height + 0.6));
      statics.push(mesh);
      casters.push(mesh);
    }
    const at = stationPlacement(track, station);
    const sx = station.side === "right" ? 1 : -1;
    const right = new Vector3(Math.cos(at.heading), 0, -Math.sin(at.heading));
    const forward = new Vector3(Math.sin(at.heading), 0, Math.cos(at.heading));
    const lateral = station.id === "village-2" ? -(PLATFORM.edge + 1.1) : sx * (PLATFORM.edge + 1.1);
    const name = station.id === "village-2" ? "Voie 2" : station.id === "village-1" ? "Gare du village — voie 1" : station.name;
    for (const along of station.id === "village-2" ? [-18] : [-22, 18]) {
      const position = new Vector3(at.x + right.x * lateral + forward.x * along, at.y + PLATFORM.height + 3.0, at.z + right.z * lateral + forward.z * along);
      atlas.add(name, 3.6, 0.7, { background: "#1e4f8a", border: "#f2c94c", color: "#ffffff" }, position, at.heading + Math.PI / 2);
      // Poteaux du panneau.
      for (const d of [-1.6, 1.6]) {
        const p = position.add(forward.scale(d));
        lathe(small, [[0.05, 0], [0.05, 3.0]], 8, PALETTE.steelDark, { x: p.x, y: at.y + PLATFORM.height, z: p.z });
      }
    }
    // Tableau d'arrêt au repère.
    const stopAt = track.pointAt(station.stop + 1.5);
    const stopSide = station.id === "village-2" ? -1 : sx;
    place(small, stopBoardData, { x: stopAt.x + right.x * stopSide * (PLATFORM.edge + 0.6), y: stopAt.y + PLATFORM.height, z: stopAt.z + right.z * stopSide * (PLATFORM.edge + 0.6), yaw: stopAt.heading });
  }
  progress(0.7);
  await yieldFrame();

  // ——— Signaux
  const lampOff = new StandardMaterial("lamp-off", scene);
  lampOff.diffuseColor = new Color3(0.12, 0.12, 0.13);
  lampOff.specularColor = new Color3(0.3, 0.3, 0.3);
  const lampOn: Record<string, StandardMaterial> = {};
  for (const [aspect, color] of [["green", new Color3(0.2, 1, 0.45)], ["yellow", new Color3(1, 0.8, 0.15)], ["red", new Color3(1, 0.15, 0.1)], ["white", new Color3(1, 1, 0.95)]] as const) {
    const m = new StandardMaterial(`lamp-${aspect}`, scene);
    m.disableLighting = true;
    m.emissiveColor = color;
    m.fogEnabled = false;
    lampOn[aspect] = m;
  }
  // Feux : une seule lentille, dessinée en instances légères dans cinq maillages (vert, jaune, rouge, blanc allumés,
  // et éteint) ; changer un signal, c'est déplacer ses feux d'un maillage à l'autre. Cinq appels de dessin en tout.
  const lens = lampLens();
  const lampGroups: Record<string, Mesh> = {};
  for (const [aspect, mat] of [["green", lampOn.green], ["yellow", lampOn.yellow], ["red", lampOn.red], ["white", lampOn.white], ["off", lampOff]] as const) {
    lampGroups[aspect] = makeMesh(scene, `lamps-${aspect}`, lens, mat, { receiveShadows: false });
    lampGroups[aspect].thinInstanceSetBuffer("matrix", new Float32Array(16), 16, false);
    lampGroups[aspect].thinInstanceCount = 0;
  }
  const signalLamps: { id: string; lamps: { aspect: string; matrix: Matrix }[] }[] = [];
  for (const signal of network.signals) {
    const aspects: ("green" | "yellow" | "red")[] = signal.role === "route" ? ["green", "yellow", "red"] : ["green", "red"];
    const model = signalModel(aspects);
    const track = main;
    const p = track.pointAt(signal.s);
    const sx = signal.side === "right" ? 1 : -1;
    const lateral = sx * 2.75;
    const base = { x: p.x + Math.cos(p.heading) * lateral, y: p.y - 0.15, z: p.z - Math.sin(p.heading) * lateral };
    place(small, model.body, { x: base.x, y: base.y, z: base.z, yaw: p.heading });
    const bodyMatrix = Matrix.RotationY(p.heading).multiply(Matrix.Translation(base.x, base.y, base.z));
    const lamps = model.lamps.map((lamp) => ({ aspect: lamp.aspect as string, matrix: Matrix.Translation(lamp.at[0], lamp.at[1], lamp.at[2]).multiply(bodyMatrix) }));
    signalLamps.push({ id: signal.id, lamps });
  }
  // Levier de l'aiguillage, côté gauche, et sa lanterne (blanche : voie directe ; jaune : voie déviée).
  const standAt = main.pointAt(network.switchAt - 2.5);
  const standPos = new Vector3(standAt.x - Math.cos(standAt.heading) * 2.6, standAt.y - 0.2, standAt.z + Math.sin(standAt.heading) * 2.6);
  const stand = makeMesh(scene, "switch-stand", switchStand(), material);
  stand.position.copyFrom(standPos);
  stand.rotation.y = standAt.heading;
  const lever = makeMesh(scene, "switch-lever", switchLever(), material);
  lever.parent = stand;
  lever.position.set(0.3, 0.1, 0);
  const standMatrix = Matrix.RotationY(standAt.heading).multiply(Matrix.Translation(standPos.x, standPos.y, standPos.z));
  signalLamps.push({ id: "switch-indicator", lamps: [-0.17, 0.17].map((z) => ({ aspect: "indicator", matrix: Matrix.Scaling(0.85, 0.85, 1).multiply(Matrix.Translation(0, 1.66, z)).multiply(standMatrix) })) });
  progress(0.8);
  await yieldFrame();

  atlas.build();
  statics.push(makeMesh(scene, "small-decor", small, material, { keep: true }));
  // Fusion du décor immobile par zones de 300 m (même jeu de matériaux, même calque), sur la géométrie source : un
  // maillage par zone, un sous-maillage par famille de matériau (quelques appels de dessin au lieu de dizaines).
  const zones = new Map<string, { meshes: Mesh[]; set: MaterialSet; layer: number }>();
  for (const mesh of statics) {
    const source = (mesh.metadata as { source?: MeshData } | null)?.source;
    if (!source) continue;
    const set = mesh.material === undergroundMaterial.multi ? undergroundMaterial : material;
    const c = mesh.getBoundingInfo().boundingSphere.centerWorld;
    const key = `${mesh.layerMask}:${Math.floor(c.x / 300)}:${Math.floor(c.z / 300)}`;
    (zones.get(key) ?? zones.set(key, { meshes: [], set, layer: mesh.layerMask }).get(key)!).meshes.push(mesh);
  }
  casters.length = 0;
  for (const [key, zone] of zones) {
    const data = emptyMesh();
    for (const mesh of zone.meshes) {
      merge(data, (mesh.metadata as { source: MeshData }).source);
      mesh.dispose();
    }
    const merged = makeMesh(scene, `decor-${key}`, data, zone.set, { layer: zone.layer, receiveShadows: zone.layer !== UNDERGROUND });
    if (zone.layer !== UNDERGROUND) casters.push(merged);
  }

  // ——— Train
  const consist: Consist = createConsist(options.wagons ?? 4, options.cratesPerWagon ?? 6);
  const train: TrainView = createTrainView(scene, material, consist);
  const steam: Steam = createSteam(scene, quality, options.gpuParticles !== false);
  // Reflet du ciel dans les matériaux PBR (acier, laiton, peinture, verre), photographié une fois puis préfiltré.
  const environment = createSkyEnvironment(scene, sky, () => scene.materials.filter((m): m is PBRMaterial => m instanceof PBRMaterial));
  // Verre du projecteur : il luit (matériau lumineux), au jour comme dans les tunnels.
  const lensData = emptyMesh();
  disc(lensData, 0.15, 0.03, 18, PALETTE.lamp, [LOCO_ANCHORS.headlamp[0], LOCO_ANCHORS.headlamp[1], LOCO_ANCHORS.headlamp[2] + 0.02], "z");
  const headlampGlass = makeMesh(scene, "headlamp-glass", lensData, lampMaterial, { layer: OUTDOOR | UNDERGROUND, receiveShadows: false });
  headlampGlass.parent = train.locomotive;
  const audio = createTrainAudio();
  // Ombres : les caisses des véhicules, et les ouvrages proches du train (revus tous les 25 m) ; le reste du décor
  // n'est pas redessiné dans la carte d'ombre à chaque image.
  const staticCasters = casters.map((mesh) => ({ mesh, at: mesh.getBoundingInfo().boundingSphere.centerWorld.clone() }));
  let castersAt = -Infinity;
  const refreshCasters = (focus: Vector3, head: number) => {
    if (Math.abs(head - castersAt) < 25) return;
    castersAt = head;
    lighting.setShadowCasters([...train.casters(), ...staticCasters.filter((c) => Vector3.Distance(c.at, focus) < 130).map((c) => c.mesh)]);
  };
  // Tout le décor est immobile : ses matrices sont figées une fois pour toutes.
  for (const mesh of scene.meshes) if (!train.meshes().includes(mesh as Mesh) && !mesh.name.startsWith("blade") && mesh !== sky && mesh.parent === null) mesh.freezeWorldMatrix();
  for (const t of terrain) t.freezeWorldMatrix();

  // ——— Caméra
  const camera = new TargetCamera("camera", new Vector3(0, 6, -20), scene);
  camera.minZ = 0.12;
  camera.maxZ = 3000;
  camera.fov = 0.85;
  const rig = createCameraRig(options.inspection?.camera ?? "behind");
  const obstacles = createObstacles(network, relief, buildingBoxes);

  // ——— État du jeu
  const departure = network.stations.find((s) => s.id === "depart")!;
  const startHead = departure.stop;
  let route: RouteId = options.inspection?.route ?? "main";
  let state: TrainState = { ...initialState(options.inspection?.head ?? startHead), speed: options.inspection?.speed ?? 0 };
  let input: DriverInput = { throttle: false, brake: false, emergency: false };
  let paused = false;
  let switchBlend = route === "branch" ? 1 : 0;
  let arrivedAt: string | null = departure.id;
  let lastChuff = 0;
  let clock = 0;
  let structureName: string | null = null;
  const emit = (event: TrainEvent) => options.onEvent?.(event);
  const trackOf = () => (route === "branch" ? branch : main);
  const minHead = consist.vehicles.reduce((sum, v) => sum + v.spec.length, 0) + 1.5;
  const maxHead = () => trackOf().length - 1.4;

  let poses: VehiclePose[] = [];
  const posesFor = (head: number) => vehicleFronts(consist, head).map((front, i) => poseVehicle(trackOf(), consist.vehicles[i].spec, front));
  const locoWorld = new Matrix();
  const anchor = (local: readonly number[], out: Vector3) => Vector3.TransformCoordinatesFromFloatsToRef(local[0], local[1], local[2], locoWorld, out);
  const tmp = { chimney: new Vector3(), whistle: new Vector3(), cylA: new Vector3(), cylB: new Vector3(), eye: new Vector3(), look: new Vector3(), lamp: new Vector3(), lampAt: new Vector3() };

  const stationAlongside = (): StationStop | null => {
    const tail = state.head - consist.vehicles.reduce((sum, v) => sum + v.spec.length, 0);
    return stationsOn(network, route).find((st) => st.from < state.head + 5 && st.to > tail - 5) ?? null;
  };

  let signalKey = "";
  const updateSignals = () => {
    const departureOn = clock < 1.5 && Math.abs(state.speed) < 0.1 && arrivedAt === departure.id ? "red" : "green";
    const key = `${route}-${departureOn}`;
    if (key === signalKey) return;
    signalKey = key;
    const buckets: Record<string, Matrix[]> = { green: [], yellow: [], red: [], white: [], off: [] };
    for (const signal of signalLamps) {
      let on: string = "green";
      if (signal.id === "aiguillage") on = route === "branch" ? "yellow" : "green";
      if (signal.id === "depart") on = departureOn;
      for (const lamp of signal.lamps) {
        if (lamp.aspect === "indicator") buckets[route === "branch" ? "yellow" : "white"].push(lamp.matrix);
        else buckets[lamp.aspect === on ? lamp.aspect : "off"].push(lamp.matrix);
      }
    }
    for (const [aspect, matrices] of Object.entries(buckets)) {
      const mesh = lampGroups[aspect];
      const buffer = new Float32Array(Math.max(1, matrices.length) * 16);
      matrices.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buffer, 16, true);
      mesh.thinInstanceCount = matrices.length;
      mesh.isVisible = matrices.length > 0;
    }
  };

  const step = (dt: number) => {
    const previous = state;
    state = stepTrain(state, input, consist, trackOf(), dt, minHead, maxHead());
    if (state.bumped && !previous.bumped) emit({ type: "bumped" });
    // Coups d'échappement : quatre par tour de roue motrice, plus forts quand le régulateur est ouvert.
    const driver = 0.78;
    const chuffs = Math.floor(Math.abs(state.distance) / ((2 * Math.PI * driver) / 4));
    if (chuffs !== lastChuff) {
      lastChuff = chuffs;
      const strength = Math.max(0.15, state.throttle);
      audio.chuff(strength, Math.abs(state.speed));
      steam.puff(strength);
    }
    // Arrêt en gare : à l'arrêt, l'avant de la locomotive à 6 m du repère.
    const station = stationsOn(network, route).find((st) => Math.abs(state.head - st.stop) <= 6);
    if (Math.abs(state.speed) < 0.05 && station && arrivedAt !== station.id) {
      arrivedAt = station.id;
      emit({ type: "arrived", station: station.id, name: station.name, precision: Math.abs(state.head - station.stop) });
      audio.chime();
    }
    if (arrivedAt && Math.abs(state.head - (network.stations.find((s) => s.id === arrivedAt)?.stop ?? state.head)) > 25) {
      emit({ type: "departed", station: arrivedAt });
      arrivedAt = null;
    }
    const inside = network.structures.find((st) => state.head > st.from && state.head < st.to)?.name ?? null;
    if (inside !== structureName) {
      structureName = inside;
      if (inside) emit({ type: "entered", structure: inside });
    }
  };

  const frame = (dt: number) => {
    clock += dt;
    if (!paused && !options.inspection?.frozen) {
      // Physique à pas fixe de 1/120 s (stable quelle que soit la cadence d'affichage).
      let remaining = Math.min(dt, 0.1);
      while (remaining > 1e-6) {
        const h = Math.min(1 / 120, remaining);
        step(h);
        remaining -= h;
      }
    }
    poses = posesFor(state.head);
    // Éclairement de chaque véhicule : il baisse doucement sur les seize premiers mètres sous terre (on quitte le jour
    // pour la lumière chaude des luminaires), et remonte de même en approchant de la sortie ; le train reste bien visible.
    const light = poses.map((pose) => {
      const t = Math.min(1, Math.max(0, (depthInside(network, pose.s) + 2) / 16));
      return 1 - 0.42 * t * t * (3 - 2 * t);
    });
    train.update(poses, state.distance, light);
    train.locomotive.computeWorldMatrix(true);
    locoWorld.copyFrom(train.locomotive.getWorldMatrix());
    anchor(LOCO_ANCHORS.chimney, tmp.chimney);
    anchor(LOCO_ANCHORS.whistle, tmp.whistle);
    anchor(LOCO_ANCHORS.cylinders[0], tmp.cylA);
    anchor(LOCO_ANCHORS.cylinders[1], tmp.cylB);
    const forward = new Vector3(poses[0].forward[0], poses[0].forward[1], poses[0].forward[2]);
    // La cheminée sous la voûte : la fumée s'étale au lieu de monter.
    steam.setEnclosure(Math.min(1, Math.max(0, (depthInside(network, state.head - 2) + 1) / 4)));
    if (!options.diagnostics?.includes("smoke")) steam.update(tmp.chimney, [tmp.cylA, tmp.cylB], tmp.whistle, forward.scale(Math.sign(state.speed || 1)), state.throttle, state.speed);
    audio.setBrake(Math.max(state.brake, state.emergency ? 1 : 0), Math.abs(state.speed));
    // Projecteur : depuis la lanterne, vers l'avant de la locomotive.
    anchor(LOCO_ANCHORS.headlamp, tmp.lamp);
    lighting.headlight.position.copyFrom(tmp.lamp);
    lighting.headlight.direction.copyFrom(forward).addInPlaceFromFloats(0, -0.06, 0).normalize();
    // Aiguilles : elles basculent en une demi-seconde vers l'itinéraire choisi.
    const target = route === "branch" ? 1 : 0;
    switchBlend += Math.sign(target - switchBlend) * Math.min(Math.abs(target - switchBlend), dt * 2);
    bladeStraight.rotation.y = -0.016 * switchBlend;
    bladeDiverging.rotation.y = -0.016 * (1 - switchBlend);
    lever.rotation.x = -0.9 + switchBlend * 1.8;
    updateSignals();
    // Caméra.
    anchor(LOCO_ANCHORS.cabEye, tmp.eye);
    anchor(LOCO_ANCHORS.cabLook, tmp.look);
    const pose = rig.update(
      { track: trackOf(), network, head: state.head, poses, cab: { eye: tmp.eye, target: tmp.look }, ground: relief.height, station: stationAlongside(), portrait: engine.getRenderHeight() > engine.getRenderWidth(), obstacles, clock },
      clock,
      dt,
    );
    camera.position.copyFrom(pose.eye);
    camera.setTarget(pose.target);
    camera.fov = pose.fov;
    // Ombre centrée devant le train.
    const focus = new Vector3(poses[1].position[0], poses[1].position[1], poses[1].position[2]);
    lighting.setShadowFocus(focus);
    if (!options.diagnostics?.includes("shadows")) refreshCasters(focus, state.head);
  };

  // Diagnostic : retirer une famille de maillages pour mesurer ce qu'elle coûte.
  const off = new Set(options.diagnostics ?? []);
  if (off.has("shadows")) lighting.setShadowCasters([]);
  if (off.has("smoke")) steam.dispose();
  for (const mesh of scene.meshes) {
    const n = mesh.name;
    if ((off.has("terrain") && n.startsWith("terrain")) || (off.has("track") && /^(main|branch)-/.test(n)) || (off.has("train") && train.meshes().includes(mesh as Mesh))) mesh.setEnabled(false);
    if (off.has("decor") && /^(station|island|stone-viaduct|truss-bridge|rock-tunnel|gallery|signal|board|stop|switch|decor)/.test(n)) mesh.setEnabled(false);
  }
  frame(0);
  progress(0.95);

  let lastDraw = 0;
  let disposed = false;
  const timing = { logic: 0, render: 0, frames: 0, logicMs: 0, renderMs: 0, since: performance.now() };
  engine.runRenderLoop(() => {
    if (disposed) return;
    const t0 = performance.now();
    frame(engine.getDeltaTime() / 1000);
    const t1 = performance.now();
    const before = engine._drawCalls.current;
    scene.render();
    lastDraw = engine._drawCalls.current - before;
    timing.logic += t1 - t0;
    timing.render += performance.now() - t1;
    timing.frames += 1;
    if (performance.now() - timing.since > 1000) {
      timing.logicMs = timing.logic / timing.frames;
      timing.renderMs = timing.render / timing.frames;
      timing.logic = timing.render = timing.frames = 0;
      timing.since = performance.now();
    }
  });
  const resize = () => engine.resize();
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(options.host);
  progress(1);
  const buildMs = performance.now() - started;

  const snapshot = (): TrainSnapshot => {
    const direction = state.speed !== 0 ? Math.sign(state.speed) : state.direction;
    const ahead = stationsOn(network, route)
      .map((st) => ({ st, d: (st.stop - state.head) * direction }))
      .filter((x) => x.d > -6)
      .sort((a, b) => a.d - b.d)[0];
    const here = arrivedAt ? network.stations.find((s) => s.id === arrivedAt) : undefined;
    return {
      speedKmh: state.speed * 3.6,
      direction: state.direction,
      throttle: state.throttle,
      brake: state.brake,
      emergency: state.emergency,
      camera: rig.mode,
      route,
      nextStation: ahead ? { id: ahead.st.id, name: ahead.st.name, distance: ahead.d } : null,
      atStation: here && Math.abs(state.speed) < 0.05 ? { id: here.id, name: here.name } : null,
      underground: isUnderground(network, state.head - 5),
      switchFree: state.head < network.switchAt - 5,
      structure: structureName,
    };
  };

  const anchors = decorAnchors(network, relief);
  const slots: Record<MaterialSlot, Material> = { terrain: terrainMaterial.multi, infrastructure: material.multi, lamps: lampMaterial, sky: skyMaterial };
  const decor: DecorHandle = {
    relief,
    network,
    scene,
    anchors,
    inClearance: (x, z, y) => inRailwayClearance(relief, x, z, undefined, y),
    material: (slot) => slots[slot],
    replaceMaterial(slot, next) {
      const previous = slots[slot];
      for (const mesh of scene.meshes) if (mesh.material === previous) mesh.material = next;
      slots[slot] = next;
    },
    addModel(model, placement) {
      const anchor = placement.anchor ? anchors.find((a) => a.id === placement.anchor) : undefined;
      const position = placement.position ?? (anchor ? new Vector3(anchor.x, anchor.y, anchor.z) : model.position);
      model.position.copyFrom(position);
      model.rotation.y = placement.heading ?? anchor?.heading ?? model.rotation.y;
      const layer = placement.underground ? UNDERGROUND : OUTDOOR;
      for (const mesh of [model, ...model.getChildMeshes(false)] as AbstractMesh[]) {
        if (!("layerMask" in mesh)) continue;
        mesh.layerMask = layer;
        mesh.receiveShadows = !placement.underground;
        if (placement.shadows && !placement.underground) staticCasters.push({ mesh, at: mesh.getBoundingInfo?.().boundingSphere.centerWorld.clone() ?? position.clone() });
      }
      castersAt = -Infinity;
    },
  };

  return {
    setInput(next) {
      input = { ...input, ...next };
    },
    reverse() {
      const next = reverse(state);
      const changed = next.direction !== state.direction;
      state = next;
      return changed;
    },
    emergencyStop() {
      state = { ...state, emergency: Math.abs(state.speed) > PHYSICS.rest };
    },
    whistle() {
      audio.whistle();
      steam.whistle();
    },
    setCamera(mode) {
      rig.setMode(mode, clock);
      emit({ type: "camera", mode });
    },
    toggleSwitch() {
      if (state.head >= network.switchAt - 5) return false;
      route = route === "main" ? "branch" : "main";
      emit({ type: "switch", route });
      return true;
    },
    snapshot,
    stats() {
      return {
        fps: Math.round(engine.getFps() * 10) / 10,
        triangles: Math.round(scene.getActiveIndices() / 3),
        drawCalls: lastDraw,
        activeMeshes: scene.getActiveMeshes().length,
        particles: steam.count(),
        buildMs: Math.round(buildMs),
        logicMs: Math.round(timing.logicMs * 100) / 100,
        renderMs: Math.round(timing.renderMs * 10) / 10,
        head: Math.round(state.head * 10) / 10,
        pixelRatio,
        quality,
        renderer,
        environment: environment.mode,
        clusteredLights: clustered && cluster ? cluster.lights.length : 0,
        gpuParticles: steam.gpu,
      };
    },
    audio,
    setPaused(next) {
      paused = next;
    },
    restart() {
      route = "main";
      state = initialState(startHead);
      input = { throttle: false, brake: false, emergency: false };
      arrivedAt = departure.id;
    },
    decor,
    dispose() {
      disposed = true;
      observer?.disconnect();
      engine.stopRenderLoop();
      steam.dispose();
      train.dispose();
      audio.dispose();
      scene.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}

