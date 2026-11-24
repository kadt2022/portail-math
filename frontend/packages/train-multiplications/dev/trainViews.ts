// Atelier du monde ferroviaire (outil de développement, hors du jeu) : le vrai moteur du jeu, train posé où l'on veut.
//   train-views.html?head=420&camera=behind|cab|side|loading|panorama&route=main|branch&frozen&speed=8&quality=low|high
//     &renderer=auto|webgpu|webgl&noclustered&nogpuparticles
// Expose window.trainHandle (pour piloter le train depuis un script), window.trainReady et window.trainStats().
import { createTrainEngine } from "../src/engine/scene/trainEngine";
import type { CameraMode } from "../src/engine/scene/cameraRig";

const params = new URLSearchParams(location.search);
const host = document.getElementById("host") as HTMLElement;
const head = params.get("head");
const handle = await createTrainEngine({
  host,
  maxPixelRatio: 1,
  quality: (params.get("quality") as "low" | "high" | null) ?? "high",
  renderer: (params.get("renderer") as "auto" | "webgpu" | "webgl" | null) ?? "auto",
  clusteredLights: !params.has("noclustered"),
  gpuParticles: !params.has("nogpuparticles"),
  inspection: head
    ? { head: Number(head), camera: (params.get("camera") as CameraMode | null) ?? "behind", route: (params.get("route") as "main" | "branch" | null) ?? "main", speed: Number(params.get("speed") ?? 0), frozen: params.has("frozen") }
    : undefined,
  diagnostics: (params.get("diag")?.split(",").filter(Boolean) ?? []) as ("shadows" | "smoke" | "terrain" | "track" | "decor" | "train")[],
  onEvent: (event) => ((window as unknown as { trainEvents: unknown[] }).trainEvents ??= []).push(event),
});
if (!head && params.get("camera")) handle.setCamera(params.get("camera") as CameraMode);
const w = window as unknown as Record<string, unknown>;
w.trainHandle = handle;
w.trainStats = () => ({ ...handle.stats(), ...handle.snapshot() });
setInterval(() => {
  const s = handle.stats();
  document.getElementById("stats")!.textContent = `${s.fps} img/s · ${s.triangles} tri · ${s.drawCalls} appels · ${s.activeMeshes} maillages · s=${s.head}`;
}, 500);
setTimeout(() => (w.trainReady = true), 600);
