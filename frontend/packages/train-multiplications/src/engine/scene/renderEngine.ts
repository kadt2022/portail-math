import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

/**
 * Le moteur WebGPU n'est téléchargé que sur les appareils qui annoncent WebGPU : les autres ne paient pas son poids.
 * Avec lui viennent ses extensions utiles au jeu : shaders de calcul (particules GPU) et textures dynamiques (panneaux).
 */
async function loadWebGPU(): Promise<typeof WebGPUEngine> {
  const [module] = await Promise.all([
    import("@babylonjs/core/Engines/webgpuEngine"),
    import("@babylonjs/core/Engines/WebGPU/Extensions/engine.computeShader"),
    import("@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture"),
    import("@babylonjs/core/Particles/computeShaderParticleSystem"),
  ]);
  return module.WebGPUEngine;
}

// Choix du moteur de rendu. WebGPU d'abord, sur les appareils qui le proposent, puis un vrai repli vers WebGL (2, ou 1
// sur les appareils les plus anciens) : si WebGPU est absent, refuse de démarrer ou échoue à l'initialisation, le jeu
// démarre en WebGL, sans rien perdre de son fonctionnement. Personne n'est exclu.
//
// Le choix peut être forcé (« webgpu » ou « webgl ») pour comparer les deux sur un même appareil.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : WebGPUEngine (IsSupportedAsync, initAsync), Engine (WebGL).
//
// Écrit pour Yamba.

export type RendererChoice = "auto" | "webgpu" | "webgl";
export type Renderer = "webgpu" | "webgl2" | "webgl1";

/**
 * Crée le moteur sur le canevas. Un canevas ne peut porter qu'un seul type de contexte : si WebGPU échoue après avoir
 * pris le canevas, on le remplace par un canevas neuf (mêmes styles, même place) pour WebGL. Le canevas réellement
 * utilisé est renvoyé.
 */
export async function createRenderEngine(canvas: HTMLCanvasElement, antialias: boolean, choice: RendererChoice): Promise<{ engine: AbstractEngine; renderer: Renderer; canvas: HTMLCanvasElement }> {
  let target = canvas;
  if (choice !== "webgl") {
    let engine: WebGPUEngine | null = null;
    try {
      const announced = typeof navigator !== "undefined" && "gpu" in navigator;
      const WebGPU = announced ? await loadWebGPU() : null;
      if (WebGPU && (await WebGPU.IsSupportedAsync)) {
        engine = new WebGPU(target, { antialias, stencil: false, powerPreference: "high-performance", adaptToDeviceRatio: false });
        await engine.initAsync();
        return { engine, renderer: "webgpu", canvas: target };
      }
    } catch {
      // Adaptateur refusé, pilote bloqué, initialisation impossible : on passe à WebGL, sur un canevas neuf.
      engine?.dispose();
      const fresh = target.cloneNode(false) as HTMLCanvasElement;
      target.replaceWith(fresh);
      target = fresh;
    }
  }
  const engine = new Engine(target, antialias, { preserveDrawingBuffer: true, stencil: false, powerPreference: "high-performance" }, true);
  return { engine, renderer: engine.webGLVersion >= 2 ? "webgl2" : "webgl1", canvas: target };
}
