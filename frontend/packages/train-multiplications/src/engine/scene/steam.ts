import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { GPUParticleSystem } from "@babylonjs/core/Particles/gpuParticleSystem";
// Moteur des particules GPU en WebGL 2 (retour de transformation) ; celui de WebGPU (shaders de calcul) arrive avec
// le moteur WebGPU (voir renderEngine.ts).
import "@babylonjs/core/Particles/webgl2ParticleSystem";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import "@babylonjs/core/Particles/particleSystemComponent";
import type { Scene } from "@babylonjs/core/scene";

import { OUTDOOR, UNDERGROUND } from "./lighting";

// Fumée et vapeur de la locomotive, avec les systèmes de particules de Babylon.js (Apache 2.0) et une seule petite
// texture de bouffée dessinée à la volée. Quand la carte graphique le permet (GPUParticleSystem.IsSupported, en
// qualité haute), les particules sont calculées par elle : la fumée peut alors être plus dense pour le même coût. Sinon,
// le système classique, calculé par le processeur, fait exactement la même chose, en moins dense. La cheminée fume en continu, plus fort quand le régulateur est ouvert, et
// lâche une bouffée à chaque coup d'échappement ; les purgeurs des cylindres crachent de la vapeur blanche au
// démarrage ; le sifflet souffle un jet de vapeur.
//
// Écrit pour Yamba.

export interface Steam {
  /** Positions dans le monde de la cheminée, des cylindres et du sifflet, et direction d'avance du train. */
  update(chimney: Vector3, cylinders: Vector3[], whistle: Vector3, forward: Vector3, throttle: number, speed: number): void;
  /**
   * Sous la voûte (0 : au grand air, 1 : dans le tube) : la fumée ne peut plus monter ; elle s'étale sous la voûte,
   * plus grise et plus brève, et traîne derrière le train au lieu de s'élever en panache.
   */
  setEnclosure(k: number): void;
  puff(strength: number): void;
  whistle(): void;
  /** Particules vivantes (mesures). */
  count(): number;
  /** Les particules sont-elles calculées par la carte graphique ? */
  readonly gpu: boolean;
  dispose(): void;
}

function puffTexture(scene: Scene): DynamicTexture {
  const size = 64;
  const texture = new DynamicTexture("puff", { width: size, height: size }, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.7)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.hasAlpha = true;
  texture.update();
  return texture;
}

type Particles = ParticleSystem | GPUParticleSystem;

function system(scene: Scene, name: string, capacity: number, texture: DynamicTexture, gpu: boolean): Particles {
  const ps = gpu ? new GPUParticleSystem(name, { capacity, emitRateControl: true }, scene) : new ParticleSystem(name, capacity, scene);
  ps.particleTexture = texture;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ps.layerMask = OUTDOOR | UNDERGROUND;
  ps.isLocal = false;
  ps.emitter = new Vector3();
  ps.updateSpeed = 1 / 60;
  return ps;
}

export function createSteam(scene: Scene, quality: "low" | "high" = "high", allowGpu = true): Steam {
  const texture = puffTexture(scene);
  const gpu = allowGpu && quality === "high" && GPUParticleSystem.IsSupported;
  // Sur la carte graphique, la fumée est 1,6 fois plus dense (plus de bouffées, plus fines).
  const scale = (quality === "low" ? 0.5 : 1) * (gpu ? 1.6 : 1);
  const smoke = system(scene, "smoke", Math.round(420 * scale), texture, gpu);
  smoke.minLifeTime = 2.4;
  smoke.maxLifeTime = 4.2;
  smoke.minSize = 0.7;
  smoke.maxSize = 1.3;
  smoke.addSizeGradient(0, 0.6);
  smoke.addSizeGradient(1, 4.6);
  smoke.color1 = new Color4(0.86, 0.86, 0.88, 0.78);
  smoke.color2 = new Color4(0.62, 0.62, 0.66, 0.72);
  smoke.colorDead = new Color4(0.92, 0.93, 0.95, 0);
  smoke.direction1 = new Vector3(-0.4, 3.2, -0.4);
  smoke.direction2 = new Vector3(0.4, 4.4, 0.4);
  smoke.minEmitPower = 1;
  smoke.maxEmitPower = 1.6;
  smoke.gravity = new Vector3(0, 0.25, 0);
  smoke.minAngularSpeed = -0.6;
  smoke.maxAngularSpeed = 0.6;
  smoke.minEmitBox = new Vector3(-0.15, 0, -0.15);
  smoke.maxEmitBox = new Vector3(0.15, 0.1, 0.15);
  smoke.emitRate = 10;
  smoke.start();

  const cocks = system(scene, "cylinder-steam", Math.round(220 * scale), texture, gpu);
  cocks.minLifeTime = 0.5;
  cocks.maxLifeTime = 1.1;
  cocks.minSize = 0.25;
  cocks.maxSize = 0.5;
  cocks.addSizeGradient(0, 0.4);
  cocks.addSizeGradient(1, 2.6);
  cocks.color1 = new Color4(1, 1, 1, 0.85);
  cocks.color2 = new Color4(0.95, 0.96, 1, 0.7);
  cocks.colorDead = new Color4(1, 1, 1, 0);
  cocks.minEmitPower = 2;
  cocks.maxEmitPower = 4;
  cocks.gravity = new Vector3(0, 1.2, 0);
  cocks.emitRate = 0;
  cocks.start();

  const jet = system(scene, "whistle-steam", Math.round(120 * scale), texture, gpu);
  jet.minLifeTime = 0.6;
  jet.maxLifeTime = 1.2;
  jet.minSize = 0.15;
  jet.maxSize = 0.3;
  jet.addSizeGradient(0, 0.3);
  jet.addSizeGradient(1, 1.8);
  jet.color1 = new Color4(1, 1, 1, 0.9);
  jet.color2 = new Color4(1, 1, 1, 0.75);
  jet.colorDead = new Color4(1, 1, 1, 0);
  jet.direction1 = new Vector3(-0.2, 5, -0.2);
  jet.direction2 = new Vector3(0.2, 7, 0.2);
  jet.minEmitPower = 1;
  jet.maxEmitPower = 1.4;
  jet.emitRate = 0;
  jet.start();

  let side = 0;
  const cylinderPoints: Vector3[] = [new Vector3(), new Vector3()];
  let whistleUntil = 0;
  let clock = 0;
  let drain = 0;
  let lastForward = new Vector3(0, 0, 1);
  // Bouffées en attente : ajoutées au débit de la prochaine image (manualEmitCount couperait la fumée continue).
  let pending = 0;
  let enclosed = -1;
  const mix = (a: number, b: number, k: number) => a + (b - a) * k;

  return {
    gpu,
    setEnclosure(k) {
      const e = Math.round(Math.min(1, Math.max(0, k)) * 20) / 20;
      if (e === enclosed) return;
      enclosed = e;
      smoke.minLifeTime = mix(2.4, 1.1, e);
      smoke.maxLifeTime = mix(4.2, 2.0, e);
      smoke.direction1.set(mix(-0.4, -1.4, e), mix(3.2, 0.35, e), mix(-0.4, -1.4, e));
      smoke.direction2.set(mix(0.4, 1.4, e), mix(4.4, 0.8, e), mix(0.4, 1.4, e));
      smoke.gravity.set(0, mix(0.25, -0.05, e), 0);
      smoke.color1.set(mix(0.86, 0.62, e), mix(0.86, 0.6, e), mix(0.88, 0.58, e), mix(0.78, 0.5, e));
      smoke.color2.set(mix(0.62, 0.48, e), mix(0.62, 0.46, e), mix(0.66, 0.44, e), mix(0.72, 0.42, e));
    },
    update(chimney, cylinders, whistle, forward, throttle, speed) {
      clock += 1 / 60;
      (smoke.emitter as Vector3).copyFrom(chimney);
      cylinders.forEach((c, i) => cylinderPoints[i].copyFrom(c));
      (jet.emitter as Vector3).copyFrom(whistle);
      lastForward = forward;
      // Fumée continue : légère au ralenti, épaisse quand le régulateur est ouvert.
      smoke.emitRate = (6 + throttle * 34) * scale + pending * 60;
      pending = 0;
      // Purgeurs ouverts au démarrage (vitesse faible, régulateur ouvert).
      drain = throttle > 0.1 && Math.abs(speed) < 3 ? 1 : Math.max(0, drain - 0.02);
      cocks.emitRate = drain * 60 * scale;
      (cocks.emitter as Vector3).copyFrom(cylinderPoints[side % 2]);
      side += 1;
      const out = new Vector3(lastForward.z, 0, -lastForward.x);
      cocks.direction1 = out.scale(side % 2 === 0 ? 2 : -2).add(new Vector3(0, -0.2, 0)).add(lastForward.scale(0.6));
      cocks.direction2 = out.scale(side % 2 === 0 ? 3.5 : -3.5).add(new Vector3(0, 0.6, 0)).add(lastForward.scale(1.2));
      jet.emitRate = clock < whistleUntil ? 90 * scale : 0;
    },
    puff(strength) {
      pending += (2 + strength * 6) * scale;
    },
    whistle() {
      whistleUntil = clock + 1.0;
    },
    count() {
      return smoke.getActiveCount() + cocks.getActiveCount() + jet.getActiveCount();
    },
    dispose() {
      smoke.dispose();
      cocks.dispose();
      jet.dispose();
      texture.dispose();
    },
  };
}
