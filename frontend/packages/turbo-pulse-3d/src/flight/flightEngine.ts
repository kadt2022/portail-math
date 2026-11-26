import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Material } from "@babylonjs/core/Materials/material";

import { createStudioEnvironment } from "../scene/environment";
import { createShipMaterials } from "../scene/materials";
import { createShip } from "../scene/ship";
import { DEFAULT_SHIP, type ShipSpec } from "../ship/shipSpec";
import { createFlightAudio } from "./audio";
import { ARRIVAL_DISTANCE, Flight, NO_INPUT, SPAWN_Z, SPEED, TRIP_LENGTH, attitude, type FlightInput, type Phase } from "./flightModel";
import { createImpactFx } from "./impactFx";
import { createOrbs } from "./orbs";
import { createSpace } from "./space";
import { createStation } from "./station";

// Le jeu de vol : assemble le modèle de vol (logique pure) et la scène Babylon.js (espace, vaisseau, boules, station, effets, son).
// Il ne connaît ni React ni l'interface : on lui donne un canevas, des commandes, et il rend des mesures pour l'affichage.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : Engine, Scene, FreeCamera, instances, GlowLayer, SceneInstrumentation.
//
// Écrit pour Yamba.

export interface FlightHud {
  phase: Phase;
  remaining: number;
  total: number;
  speed: number;
  minSpeed: number;
  maxSpeed: number;
}

export interface FlightStats {
  fps: number;
  drawCalls: number;
  activeOrbs: number;
  /** Niveau de réduction de la résolution (1 = pleine). */
  scaling: number;
}

export interface FlightOptions {
  /** Appareil modeste : moins d'étoiles, pas de halo, boules plus simples, résolution réduite. */
  light?: boolean;
  /** Longueur du trajet (réglage de mise au point). */
  distance?: number;
  seed?: number;
  ship?: ShipSpec;
  /** Résolution adaptative (par défaut oui) ; à couper pour les mesures et les captures. */
  adaptive?: boolean;
}

export interface FlightGame {
  start(): void;
  restart(): void;
  setInput(input: Partial<FlightInput>): void;
  setMuted(muted: boolean): void;
  onHud(callback: (hud: FlightHud) => void): void;
  /** Appelé à chaque choc, avec l'intensité (0–1). */
  onImpact(callback: (size: number) => void): void;
  stats(): FlightStats;
  dispose(): void;
}

const POOL = 40;
const CAMERA_BACK = -16;
const CAMERA_UP = 3.6;
const GLOWING = /^(?:ship-\w+-(?:glowBlue|glowCyan|light)|station-light|orb-\d)/;

export function createFlightGame(canvas: HTMLCanvasElement, options: FlightOptions = {}): FlightGame {
  const light = options.light ?? false;
  const engine = new Engine(canvas, !light, { preserveDrawingBuffer: false, stencil: false, powerPreference: "high-performance" });
  const baseScaling = light ? 1.5 : Math.max(1, 1 / Math.min(window.devicePixelRatio || 1, 2));
  let scaling = baseScaling;
  engine.setHardwareScalingLevel(scaling);
  const scene = new Scene(engine);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;

  const space = createSpace(scene, { light });
  const materials = createShipMaterials(scene);
  const ship = createShip(scene, materials, options.ship ?? DEFAULT_SHIP);
  const orbs = createOrbs(scene, POOL, light ? 12 : 22);
  const station = createStation(scene);
  const fx = createImpactFx(scene);
  const environment = createStudioEnvironment(scene, space.sky, () => [...materials.all(), ...orbs.materials] as PBRMaterial[]);
  const audio = createFlightAudio();

  // Caméra de suivi : derrière et un peu au-dessus, loin du vaisseau pour qu'il reste petit, et large pour voir venir les obstacles.
  const camera = new FreeCamera("follow", new Vector3(0, CAMERA_UP, CAMERA_BACK), scene);
  camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
  camera.fov = 1.3;
  camera.minZ = 0.5;
  camera.maxZ = 2600;
  camera.inputs.clear();
  camera.setTarget(new Vector3(0, 0.4, 30));

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.contrast = 1.1;

  let glow: GlowLayer | null = null;
  const enableGlow = () => {
    glow = new GlowLayer("halo", scene, { mainTextureFixedSize: 256, blurKernelSize: 24 });
    glow.intensity = 0.7;
    glow.customEmissiveColorSelector = (mesh, _sub, material, result) => {
      if (GLOWING.test(mesh.name)) {
        const m = material as Material & { emissiveColor?: Color3 };
        const c = m.emissiveColor ?? Color3.White();
        result.set(c.r, c.g, c.b, 1);
      } else result.set(0, 0, 0, 0);
    };
  };
  if (!light) enableGlow();

  // Propulseurs : deux cônes lumineux (un clair dedans, un coloré autour) à la sortie des moteurs, dont la longueur suit la vitesse.
  const flameMaterial = (name: string, hex: string, alpha: number) => {
    const m = new StandardMaterial(name, scene);
    m.disableLighting = true;
    m.emissiveColor = Color3.FromHexString(hex);
    m.alpha = alpha;
    m.alphaMode = 1;
    m.disableDepthWrite = true;
    return m;
  };
  const outerMaterial = flameMaterial("flame-outer", "#46c8ff", 0.55);
  const innerMaterial = flameMaterial("flame-inner", "#eaffff", 0.9);
  const flames = [-1.08, 1.08].flatMap((x) =>
    [
      { diameter: 0.85, material: outerMaterial },
      { diameter: 0.42, material: innerMaterial },
    ].map(({ diameter, material }, i) => {
      const cone = CreateCylinder(`flame-${x}-${i}`, { diameterTop: diameter, diameterBottom: 0.04, height: 1, tessellation: 16 }, scene);
      cone.material = material;
      cone.parent = ship.root;
      cone.rotation.x = Math.PI / 2;
      cone.isPickable = false;
      cone.metadata = { x, inner: i === 1 };
      return cone;
    }),
  );

  const flight = new Flight(options.distance ?? TRIP_LENGTH, options.seed ?? 1, POOL);
  const input: FlightInput = { ...NO_INPUT };
  let hudCallback: ((hud: FlightHud) => void) | null = null;
  let impactCallback: ((size: number) => void) | null = null;
  let time = 0;
  let hudTimer = 0;
  let shake = 0;
  let lowFpsFor = 0;
  let highFpsFor = 0;
  const camPos = new Vector3(0, CAMERA_UP, CAMERA_BACK);
  const camLook = new Vector3(0, 0.4, 30);

  const instrumentation = new SceneInstrumentation(scene);
  instrumentation.captureFrameTime = false;
  instrumentation.captureRenderTime = false;

  const emitHud = () =>
    hudCallback?.({ phase: flight.phase, remaining: flight.remaining, total: flight.total, speed: flight.ship.speed, minSpeed: SPEED.min, maxSpeed: SPEED.max });

  /** Résolution adaptative : si l'image saccade, on réduit le nombre de pixels ; si tout va bien longtemps, on le rend. */
  const adapt = (dt: number) => {
    const fps = engine.getFps();
    lowFpsFor = fps < 42 ? lowFpsFor + dt : 0;
    highFpsFor = fps > 57 ? highFpsFor + dt : 0;
    if (lowFpsFor > 1.5 && scaling < 2.5) {
      scaling += 0.25;
      engine.setHardwareScalingLevel(scaling);
      lowFpsFor = 0;
      if (scaling >= 1.75 && glow) {
        glow.dispose();
        glow = null;
      }
    } else if (highFpsFor > 6 && scaling > baseScaling) {
      scaling = Math.max(baseScaling, scaling - 0.25);
      engine.setHardwareScalingLevel(scaling);
      highFpsFor = 0;
    }
  };

  const updateShip = () => {
    const s = flight.ship;
    const a = attitude(s);
    ship.root.position.set(s.x, s.y + Math.sin(time * 1.7) * 0.05, 0);
    ship.root.rotation.set(a.pitch, a.yaw, a.roll);
    // Pendant la protection qui suit un choc, le vaisseau clignote.
    ship.root.setEnabled(s.shield <= 0 || Math.floor(time * 16) % 2 === 0);
    const k = Math.min(1, Math.max(0, (s.speed - SPEED.min) / (SPEED.max - SPEED.min)));
    materials.setGlow(1 + k * 0.5 + Math.sin(time * 40) * 0.03);
    const length = 0.5 + k * 2.6 + Math.sin(time * 55) * 0.12;
    for (const flame of flames) {
      const inner = (flame.metadata as { inner: boolean }).inner;
      const len = inner ? length * 0.6 : length;
      flame.scaling.set(1, len, 1);
      flame.position.set((flame.metadata as { x: number }).x, -0.06, -2.7 - len / 2);
    }
    return k;
  };

  const updateCamera = (dt: number) => {
    const s = flight.ship;
    const follow = 1 - Math.exp(-6 * dt);
    const wantPos = new Vector3(s.x * 0.55, CAMERA_UP + s.y * 0.5, CAMERA_BACK - (s.speed - SPEED.cruise) * 0.06);
    const wantLook = new Vector3(s.x * 0.4, 0.4 + s.y * 0.4, 32);
    camPos.addInPlace(wantPos.subtract(camPos).scale(follow));
    camLook.addInPlace(wantLook.subtract(camLook).scale(follow));
    shake = Math.max(0, shake - dt * 2.4);
    const jitter = shake * shake * 0.5;
    camera.position.set(camPos.x + (Math.random() - 0.5) * jitter, camPos.y + (Math.random() - 0.5) * jitter, camPos.z);
    camera.setTarget(camLook);
    // Petit « coup de zoom » à grande vitesse.
    camera.fov = 1.3 + ((s.speed - SPEED.cruise) / SPEED.max) * 0.18;
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    time += dt;
    const events = flight.step(dt, input);
    for (const orb of events.hits) {
      fx.play(orb.x, orb.y, orb.z, orb.color, orb.radius);
      audio.impact(orb.radius);
      shake = 1;
      impactCallback?.(Math.min(1, orb.radius / 1.5));
    }
    if (events.arrivedNow) {
      audio.arrive();
      emitHud();
    }
    orbs.sync(flight.field.orbs, SPAWN_Z);
    station.update(flight.remaining, time);
    const k = updateShip();
    space.update(dt, flight.phase === "ready" ? SPEED.cruise * 0.35 : flight.ship.speed);
    fx.update(dt);
    updateCamera(dt);
    audio.setSpeed(flight.phase === "ready" ? 0.1 : k);
    if (options.adaptive !== false) adapt(dt);
    hudTimer += dt;
    if (hudTimer > 0.1) {
      hudTimer = 0;
      emitHud();
    }
  });

  const resizeObserver = new ResizeObserver(() => engine.resize());
  resizeObserver.observe(canvas);
  engine.runRenderLoop(() => scene.render());

  return {
    start() {
      audio.resume();
      flight.start();
      emitHud();
    },
    restart() {
      audio.resume();
      flight.restart();
      emitHud();
    },
    setInput(next) {
      Object.assign(input, next);
    },
    setMuted: (muted) => audio.setMuted(muted),
    onHud(callback) {
      hudCallback = callback;
      emitHud();
    },
    onImpact(callback) {
      impactCallback = callback;
    },
    stats: () => ({ fps: Math.round(engine.getFps()), drawCalls: instrumentation.drawCallsCounter.current, activeOrbs: flight.field.activeCount(), scaling }),
    dispose() {
      resizeObserver.disconnect();
      engine.stopRenderLoop();
      audio.dispose();
      glow?.dispose();
      for (const flame of flames) flame.dispose();
      outerMaterial.dispose();
      innerMaterial.dispose();
      fx.dispose();
      station.dispose();
      orbs.dispose();
      environment.dispose();
      ship.dispose();
      materials.dispose();
      space.dispose();
      instrumentation.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}

export { ARRIVAL_DISTANCE };
