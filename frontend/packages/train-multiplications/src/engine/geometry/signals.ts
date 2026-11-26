import { box, cylinder, emptyMesh, type MeshData, type Vec3 } from "./kit";
import { PALETTE as C } from "./palette";
import { bar, disc, ring, rod } from "./shapes";

// Signalisation ferroviaire : signaux lumineux sur mât (cible noire à liseré blanc, feux sous visière), et levier
// d'aiguillage avec sa lanterne d'indication. Les feux sont des maillages à part : la scène les allume et les éteint.
// Repère local : z le long de la voie (le train arrive depuis -z), x vers l'extérieur, y vers le haut.
//
// Écrit pour Yamba.

export interface SignalModel {
  body: MeshData;
  /** Feux : couleur d'indication et position du centre de la lentille. */
  lamps: { aspect: "green" | "yellow" | "red"; at: Vec3 }[];
}

/** Lentille de feu (disque), tournée vers le train qui arrive (-z). */
export function lampLens(radius = 0.13): MeshData {
  const mesh = emptyMesh();
  disc(mesh, radius, 0.03, 16, [1, 1, 1], [0, 0, 0], "z");
  return mesh;
}

export function signalModel(aspects: ("green" | "yellow" | "red")[]): SignalModel {
  const body = emptyMesh();
  const mastHeight = 4.2;
  // Socle de béton, mât à bandes, échelle, plateforme.
  box(body, 0.7, 0.4, 0.7, C.concrete, { y: -0.6 });
  for (let i = 0; i < 8; i += 1) cylinder(body, 0.09, 0.09, mastHeight / 8, 10, i % 2 === 0 ? C.white : C.black, { y: -0.2 + (i * mastHeight) / 8 });
  for (const x of [-0.18, 0.18]) rod(body, [x, -0.2, 0.18], [x, mastHeight - 0.6, 0.18], 0.015, C.steelDark, 5);
  for (let y = 0; y < mastHeight - 0.8; y += 0.35) rod(body, [-0.18, y, 0.18], [0.18, y, 0.18], 0.012, C.steelDark, 4);
  // Cible : plaque noire bordée de blanc, feux superposés, visières.
  const n = aspects.length;
  const headH = 0.42 * n + 0.2;
  const top = mastHeight + headH - 0.2;
  box(body, 0.66, headH + 0.08, 0.06, C.white, { y: mastHeight - 0.24, z: -0.02 });
  box(body, 0.56, headH, 0.08, C.black, { y: mastHeight - 0.2, z: -0.04 });
  box(body, 0.2, 0.2, 0.2, C.blackSoft, { y: top - 0.02, z: 0.05 });
  const lamps: SignalModel["lamps"] = [];
  aspects.forEach((aspect, i) => {
    const y = top - 0.32 - i * 0.42;
    ring(body, 0.13, 0.17, 0.06, 16, C.blackSoft, [0, y, -0.1], "z");
    // Visière : demi-tube au-dessus du feu.
    for (let k = 0; k < 6; k += 1) {
      const a0 = (k / 6) * Math.PI;
      const a1 = ((k + 1) / 6) * Math.PI;
      bar(body, [Math.cos(a0) * 0.17, y + Math.sin(a0) * 0.17, -0.12], [Math.cos(a1) * 0.17, y + Math.sin(a1) * 0.17, -0.12], 0.02, 0.24, C.black, [0, 0, 1]);
    }
    lamps.push({ aspect, at: [0, y, -0.13] });
  });
  return { body, lamps };
}

/** Levier d'aiguillage à contrepoids et lanterne d'indication (les plaques de direction sont posées par la scène). */
export function switchStand(): MeshData {
  const mesh = emptyMesh();
  box(mesh, 0.9, 0.18, 0.5, C.sleeperDark, { y: -0.3 });
  box(mesh, 0.3, 0.55, 0.3, C.iron, { y: -0.12 });
  rod(mesh, [0, 0.4, 0], [0, 1.5, 0], 0.04, C.iron);
  box(mesh, 0.32, 0.32, 0.32, C.black, { y: 1.5 });
  box(mesh, 0.36, 0.05, 0.36, C.iron, { y: 1.82 });
  return mesh;
}

/** Bras du levier (pivot à l'origine) : barre rouge et blanche et contrepoids. */
export function switchLever(): MeshData {
  const mesh = emptyMesh();
  for (let i = 0; i < 4; i += 1) bar(mesh, [0, 0, i * 0.22], [0, 0, (i + 1) * 0.22], 0.06, 0.06, i % 2 === 0 ? C.red : C.white);
  disc(mesh, 0.16, 0.14, 12, C.iron, [0, 0, 0.92]);
  return mesh;
}
