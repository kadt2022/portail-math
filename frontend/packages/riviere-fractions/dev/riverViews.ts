// Atelier des points de vue de la rivière (outil de développement, hors du jeu) : la vraie scène du niveau 1, le
// bateau amarré à une abscisse donnée et le temps figé. Les mêmes adresses donnent exactement les mêmes images : c'est
// ce qui permet de comparer un avant et un après.
//   river-views.html?s=150&d=0&time=12 (et shadows=0, grading=0 pour comparer sans ombres ou sans étalonnage)
//   forest=410:590 plante la forêt d'arbres stylisés sur ce tronçon (le reste du décor est inchangé) ;
//   far=0 sans le niveau très lointain, under=0 sans le sous-bois (pour mesurer chacun)
//   wide=480:30:-60 vue large au-dessus de la rivière : regard vers s=480, à 30 m de haut, depuis 60 m en arrière
//   cam=x,y,z,tx,ty,tz remplace la caméra du jeu par une vue fixe (vue large pour juger la densité)
import { createLevelOneLayout } from "../src/engine/geometry/layout";
import { createRiverEngine } from "../src/engine/scene/riverEngine";
import type { SignText } from "../src/engine/scene/signDrawing";

const params = new URLSearchParams(location.search);
const s = Number(params.get("s") ?? "10");
const d = Number(params.get("d") ?? "0");
const time = Number(params.get("time") ?? "12");
const host = document.getElementById("host") as HTMLElement;
const stats = document.getElementById("stats") as HTMLElement;

const lighting = { shadows: params.get("shadows") !== "0", grading: params.get("grading") !== "0" };
const forestParam = params.get("forest");
const forest = forestParam
  ? { from: Number(forestParam.split(":")[0]), to: Number(forestParam.split(":")[1]), farLevel: params.get("far") !== "0", undergrowth: params.get("under") !== "0" }
  : undefined;
const wide = params.get("wide");
const wideCamera = () => {
  const [at, height, back] = (wide as string).split(":").map(Number);
  const layout = createLevelOneLayout();
  const eye = layout.toWorld(at + back, 0);
  const target = layout.toWorld(at, 0);
  return [eye.x, height, eye.z, target.x, 0, target.z].join(",");
};
const camParam = wide ? wideCamera() : params.get("cam");
const engine = await createRiverEngine({
  host,
  onLaneCrossed: () => undefined,
  inspection: { s, d, time, camera: camParam ? (camParam.split(",").map(Number) as [number, number, number, number, number, number]) : undefined },
  maxPixelRatio: 1,
  lighting,
  forest,
});
const answers = [["12", "4", "5"], ["18", "9", "3"], ["3/18", "6", "9"], ["1/3", "3/4", "4/3"], ["2", "8", "6"], ["5/7", "5/14", "3/7"], ["2", "32", "8"]];
const sign = (text: string): SignText => (text.includes("/") ? { kind: "stacked", numerator: text.split("/")[0], denominator: text.split("/")[1] } : { kind: "text", text });
engine.setSigns(answers.map((lanes) => [sign(lanes[0]), sign(lanes[1]), sign(lanes[2])] as const));
const report = () => {
  const view = engine.getStats();
  stats.textContent = `s ${s} · ${view.fps} images/s · ${view.activeMeshes} maillages · ${Math.round(view.triangles / 1000)}k triangles · ${view.buildMs} ms`;
};
setInterval(report, 500);
setTimeout(() => {
  report();
  (window as unknown as { riverReady: boolean }).riverReady = true;
}, 2500);
(window as unknown as { riverStats: () => unknown }).riverStats = () => engine.getStats();
