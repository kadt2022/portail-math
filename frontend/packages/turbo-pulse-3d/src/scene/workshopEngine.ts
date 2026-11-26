import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { Scene } from "@babylonjs/core/scene";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";

import { PART_FOCUS, type ShipSpec, type WorkshopPart } from "../ship/shipSpec";
import { createStudioEnvironment } from "./environment";
import { createHangar } from "./hangar";
import { createShipMaterials } from "./materials";
import { createShip } from "./ship";

// L'atelier : le vaisseau posé sur son socle, une caméra qui tourne doucement autour, des gestes simples (tourner, zoomer), un cadrage
// par partie pour l'atelier de construction. Le moteur ne connaît ni React ni l'interface : on lui donne un canevas et une fiche.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : Engine, Scene, ArcRotateCamera, SceneInstrumentation.
//
// Écrit pour Yamba.

export interface WorkshopStats {
  triangles: number;
  meshes: number;
  drawCalls: number;
  fps: number;
}

export interface Workshop {
  apply(spec: ShipSpec): void;
  /** Cadre la caméra sur une partie du vaisseau. */
  focus(part: WorkshopPart): void;
  /** Rotation automatique de la caméra (arrêtée dès que l'enfant touche l'écran). */
  setAutoRotate(on: boolean): void;
  stats(): WorkshopStats;
  dispose(): void;
}

export interface WorkshopOptions {
  /** Réduit les coûts (ombres coupées, moins de pixels) sur les petits appareils. */
  light?: boolean;
}

const HOME = { alpha: -Math.PI / 2 - 0.6, beta: 1.25, radius: 11.5, target: [0, 0.1, 0] as const };

export function createWorkshop(canvas: HTMLCanvasElement, initial: ShipSpec, options: WorkshopOptions = {}): Workshop {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: "high-performance" });
  engine.setHardwareScalingLevel(options.light ? 1.5 : Math.max(1, 1 / Math.min(window.devicePixelRatio || 1, 2)));
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera("camera", HOME.alpha, HOME.beta, HOME.radius, new Vector3(...HOME.target), scene);
  camera.lowerRadiusLimit = 4.5;
  camera.upperRadiusLimit = 17;
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;
  camera.wheelDeltaPercentage = 0.02;
  camera.pinchDeltaPercentage = 0.004;
  camera.panningSensibility = 0;
  camera.fov = 0.7;
  camera.minZ = 0.1;
  camera.maxZ = 400;
  camera.attachControl(canvas, true);
  camera.useAutoRotationBehavior = true;
  const auto = camera.autoRotationBehavior!;
  auto.idleRotationSpeed = 0.18;
  auto.idleRotationWaitTime = 1500;
  auto.idleRotationSpinupTime = 1500;
  auto.zoomStopsAnimation = false;

  const materials = createShipMaterials(scene);
  const hangar = createHangar(scene, { shadows: !options.light });
  const environment = createStudioEnvironment(scene, hangar.sky, () => materials.all());
  const ship = createShip(scene, materials, initial);
  ship.root.position.y = hangar.floorY + 1.1;
  for (const node of ship.parts.values()) for (const mesh of node.getChildMeshes()) if (mesh.metadata?.caster) hangar.castShadow(mesh as Mesh);

  // Finition « premium » : tons cinéma (ACES), contraste léger, halo (GlowLayer) sur les lumières. Le halo est coupé sur les petits appareils.
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.contrast = 1.1;
  scene.imageProcessingConfiguration.exposure = 1.0;
  let glowLayer: GlowLayer | null = null;
  if (!options.light) {
    glowLayer = new GlowLayer("halo", scene, { mainTextureFixedSize: 256, blurKernelSize: 24 });
    glowLayer.intensity = 0.6;
    // Seules les lumières du vaisseau rayonnent : ni le ciel, ni le socle, ni le bouclier.
    const radiant = /^ship-(?:\w+)-(?:glowBlue|glowCyan|light|star)$/;
    glowLayer.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
      if (radiant.test(mesh.name)) result.set(1, 1, 1, 1);
      else result.set(0, 0, 0, 0);
    };
  }

  const instrumentation = new SceneInstrumentation(scene);
  instrumentation.captureFrameTime = false;
  instrumentation.captureRenderTime = false;

  // Doux flottement du vaisseau et pulsation des moteurs.
  let time = 0;
  const baseY = ship.root.position.y;
  scene.onBeforeRenderObservable.add(() => {
    time += engine.getDeltaTime() / 1000;
    ship.root.position.y = baseY + Math.sin(time * 1.4) * 0.06;
    materials.setGlow(1 + Math.sin(time * 3.2) * 0.12);
  });

  const resize = () => engine.resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  engine.runRenderLoop(() => scene.render());

  let spec = initial;
  return {
    apply(next) {
      ship.apply(next);
      // Les parties reconstruites doivent aussi projeter leur ombre.
      for (const node of ship.parts.values()) for (const mesh of node.getChildMeshes()) if (mesh.metadata?.caster) hangar.castShadow(mesh as Mesh);
      spec = next;
    },
    focus(part) {
      const f = PART_FOCUS[part];
      const t = camera.target;
      const to = new Vector3(f.target[0], f.target[1] + (spec.shield ? 0 : 0), f.target[2]);
      const frames = 24;
      const from = { x: t.x, y: t.y, z: t.z, r: camera.radius };
      let i = 0;
      const step = () => {
        i += 1;
        const k = 1 - Math.pow(1 - i / frames, 3);
        camera.setTarget(new Vector3(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, from.z + (to.z - from.z) * k));
        camera.radius = from.r + (f.radius - from.r) * k;
        if (i >= frames) scene.onBeforeRenderObservable.removeCallback(step);
      };
      scene.onBeforeRenderObservable.add(step);
    },
    setAutoRotate(on) {
      camera.useAutoRotationBehavior = on;
    },
    stats() {
      const s = ship.stats();
      return { ...s, drawCalls: instrumentation.drawCallsCounter.current, fps: Math.round(engine.getFps()) };
    },
    dispose() {
      observer.disconnect();
      engine.stopRenderLoop();
      environment.dispose();
      hangar.dispose();
      ship.dispose();
      materials.dispose();
      glowLayer?.dispose();
      instrumentation.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
