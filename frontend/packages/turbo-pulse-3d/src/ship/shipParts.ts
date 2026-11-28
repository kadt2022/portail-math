// Les pièces du vaisseau, construites en géométrie pure. Chaque partie rend ses maillages classés par « rôle » de matériau (coque,
// accent, verrière, métal…) : la scène donne un matériau à chaque rôle, et la palette de couleurs change sans toucher aux formes.
//
// Repère : x vers la droite du vaisseau, y vers le haut, z vers l'avant (le nez). Le vaisseau fait environ 5,7 de long, 6,2 d'envergure.
// Silhouette : chasseur futuriste, fuselage long et plat à nez pointu, grande verrière allongée, ailes balayées vers l'arrière,
// deux gros moteurs cylindriques sur les flancs, double dérive à lisérés ambre, coussin lumineux bleu dessous (il flotte).

import {
  type MeshData,
  type Pt,
  type Section,
  merge,
  mirrorX,
  prism,
  revolve,
  rotateZ,
  scale,
  loft,
  translate,
} from "./geometry";
import type { EngineVariant, PartId, WingVariant } from "./shipSpec";

export type MaterialRole = "hull" | "accent" | "glass" | "metal" | "dark" | "glowBlue" | "glowCyan" | "light" | "star";

export type PartGeometry = Partial<Record<MaterialRole, MeshData>>;

const DEG = Math.PI / 180;
const add = (target: PartGeometry, role: MaterialRole, mesh: MeshData | readonly MeshData[]) => {
  const list = Array.isArray(mesh) ? mesh : [mesh as MeshData];
  target[role] = merge(target[role] ? [target[role] as MeshData, ...list] : list);
};
/** Une pièce et son image dans un miroir gauche-droite. */
const both = (mesh: MeshData): MeshData[] => [mesh, mirrorX(mesh)];

/** Demi-ellipse (rayon, z) entre deux z : sert au bouclier. */
function ellipseContour(radius: number, from: number, to: number, steps = 10): Pt[] {
  const mid = (from + to) / 2;
  const half = (to - from) / 2;
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = Math.PI - (Math.PI * i) / steps;
    points.push([Math.max(0, radius * Math.sin(Math.PI - t)), mid + half * Math.cos(t)]);
  }
  return points;
}

// ─── Coque : fuselage long, nez rouge, entrées d'air ambre, aération ───────────────────────────────────────────────────────

const HULL_SECTIONS: Section[] = [
  { z: -2.5, w: 0.7, up: 0.38, down: 0.34, y: 0.0, n: 3 },
  { z: -1.8, w: 0.95, up: 0.5, down: 0.42, y: 0.02, n: 3 },
  { z: -0.6, w: 1.0, up: 0.58, down: 0.44, y: 0.04, n: 3 },
  { z: 0.6, w: 0.92, up: 0.56, down: 0.4, y: 0.02, n: 3 },
  { z: 1.6, w: 0.68, up: 0.4, down: 0.3, y: -0.02, n: 3 },
  { z: 2.25, w: 0.4, up: 0.25, down: 0.2, y: -0.08, n: 3 },
  { z: 2.75, w: 0.19, up: 0.12, down: 0.11, y: -0.14, n: 2.6 },
  { z: 2.9, w: 0.06, up: 0.05, down: 0.05, y: -0.17, n: 2 },
];
const NOSE_FROM = 4;
for (const s of HULL_SECTIONS) {
  s.up *= 1.2;
  s.down *= 1.15;
}

function hull(): PartGeometry {
  const part: PartGeometry = {};
  add(part, "hull", loft(HULL_SECTIONS.slice(0, NOSE_FROM + 1)));
  // Nez rouge, très légèrement plus gros que la coque pour que la jonction forme une arête propre.
  const nose = HULL_SECTIONS.slice(NOSE_FROM).map((s, i) => ({ ...s, w: s.w * (i === 0 ? 1.0 : 1.015), up: s.up * 1.02, down: s.down * 1.05 }));
  add(part, "accent", loft(nose));
  // Quille sombre sous le ventre, séparée de la coque par un joint.
  add(part, "dark", translate(prism([[-0.5, -2.2], [0.5, -2.2], [0.36, 1.3], [-0.36, 1.3]], { from: -0.5, to: -0.42, bevel: 0.1, axis: "y" }), [0, 0, 0]));
  // Entrées d'air ambre sur les flancs du nez, aération sombre à lamelles sur le dos.
  const intake: Pt[] = [[1.25, 0.05], [1.9, -0.02], [1.95, -0.1], [1.3, -0.12]];
  add(part, "light", both(prism(intake, { from: 0.58, to: 0.7, bevel: 0.05, axis: "x" })));
  add(part, "dark", prism([[-0.34, -1.9], [0.34, -1.9], [0.3, -1.1], [-0.3, -1.1]], { from: 0.5, to: 0.62, bevel: 0.08, axis: "y" }));
  for (let i = 0; i < 3; i += 1) {
    const z = -1.75 + i * 0.22;
    add(part, "light", prism([[-0.24, z], [0.24, z], [0.24, z + 0.07], [-0.24, z + 0.07]], { from: 0.62, to: 0.645, bevel: 0.0, axis: "y" }));
  }
  // Feux avant ambre de chaque côté du nez, voyants de flanc.
  add(part, "light", both(prism([[0.15, 0.2], [0.55, 0.2], [0.55, 0.3], [0.15, 0.3]], { from: 0.93, to: 1.0, bevel: 0.05, axis: "x" })));
  return part;
}

// ─── Cockpit : verrière allongée, siège ────────────────────────────────────────────────────────────────────────────────────

function cockpit(): PartGeometry {
  const part: PartGeometry = {};
  const canopy: Section[] = [
    { z: -0.55, w: 0.06, up: 0.06, down: 0.12, y: 0.5, n: 2.4 },
    { z: -0.3, w: 0.46, up: 0.46, down: 0.12, y: 0.55, n: 2.6 },
    { z: 0.35, w: 0.63, up: 0.64, down: 0.12, y: 0.55, n: 2.6 },
    { z: 1.0, w: 0.52, up: 0.54, down: 0.12, y: 0.5, n: 2.6 },
    { z: 1.6, w: 0.3, up: 0.3, down: 0.1, y: 0.43, n: 2.4 },
    { z: 1.95, w: 0.07, up: 0.07, down: 0.07, y: 0.34, n: 2 },
  ];
  add(part, "glass", loft(canopy));
  // Cadre sombre à la base de la verrière, arceau rouge derrière, siège et dossier à l'intérieur.
  add(part, "dark", loft([{ z: -0.5, w: 0.5, up: 0.04, down: 0.04, y: 0.52, n: 3 }, { z: 1.7, w: 0.36, up: 0.04, down: 0.04, y: 0.4, n: 3 }]));
  add(part, "accent", prism([[-0.45, -0.75], [0.45, -0.75], [0.4, -0.5], [-0.4, -0.5]], { from: 0.5, to: 0.68, bevel: 0.1, axis: "y" }));
  add(part, "dark", prism([[-0.2, 0.0], [0.2, 0.0], [0.2, 0.45], [-0.2, 0.45]], { from: 0.52, to: 0.66, bevel: 0.1, axis: "y" }));
  add(part, "dark", prism([[-0.2, -0.22], [0.2, -0.22], [0.2, -0.08], [-0.2, -0.08]], { from: 0.52, to: 0.95, bevel: 0.08, axis: "y" }));
  add(part, "glowBlue", prism([[-0.25, 0.9], [0.25, 0.9], [0.2, 1.0], [-0.2, 1.0]], { from: 0.52, to: 0.55, bevel: 0.0, axis: "y" }));
  return part;
}

// ─── Ailes : grandes, balayées vers l'arrière, bout rouge, liséré bleu ────────────────────────────────────────────────────

const WING_Y = -0.1;

function wings(variant: WingVariant): PartGeometry {
  const part: PartGeometry = {};
  const k = variant === "large" ? { x: 1.2, z: 1.12 } : { x: 1, z: 1 };
  const m = (points: Pt[]): Pt[] => points.map(([x, z]) => [x * k.x, z * k.z] as Pt);
  const plate = m([[0.6, 0.75], [3.1, -1.7], [3.1, -2.2], [0.6, -1.5]]);
  add(part, "hull", both(translate(prism(plate, { from: -0.06, to: 0.06, bevel: 0.03, axis: "y" }), [0, WING_Y, 0])));
  // Bout d'aile rouge, bord d'attaque rouge fin.
  add(part, "accent", both(translate(prism(m([[2.35, -1.0], [3.14, -1.72], [3.14, -2.24], [2.35, -1.85]]), { from: -0.08, to: 0.08, bevel: 0.03, axis: "y" }), [0, WING_Y, 0])));
  add(part, "accent", both(translate(prism(m([[0.6, 0.78], [2.4, -0.98], [2.3, -1.12], [0.6, 0.6]]), { from: -0.075, to: 0.075, bevel: 0.03, axis: "y" }), [0, WING_Y, 0])));
  // Liséré bleu lumineux le long du bord de fuite, dessous.
  add(part, "glowBlue", both(translate(prism(m([[0.75, -1.5], [3.0, -2.12], [3.0, -2.2], [0.75, -1.58]]), { from: -0.08, to: -0.06, bevel: 0.0, axis: "y" }), [0, WING_Y, 0])));
  return part;
}

interface EngineShape {
  radius: number;
  length: number;
  x: number;
  y: number;
  z: number;
  center: boolean;
}

const ENGINE_SHAPES: Record<EngineVariant, EngineShape> = {
  twin: { radius: 0.52, length: 2.4, x: 1.08, y: -0.06, z: -1.5, center: false },
  compact: { radius: 0.4, length: 2.0, x: 1.02, y: -0.04, z: -1.7, center: true },
};

/** Une nacelle le long de z, centrée à l'origine ; le cœur lumineux est à l'arrière (z négatif). */
function pod(radius: number, length: number): PartGeometry {
  const part: PartGeometry = {};
  const back = -length / 2;
  const front = length / 2;
  const r = radius;
  add(part, "hull", revolve(([[0, front], [r * 0.5, front - 0.08], [r * 0.85, front - 0.3], [r, front - 0.6], [r, back + 0.14], [r * 0.9, back + 0.04], [r * 0.9, back], [0, back]] as Pt[]).reverse(), { segments: 24 }));
  // Bande sombre mécanique, liséré ambre fin, et bague de métal autour de la tuyère.
  add(part, "dark", revolve([[r * 0.97, front - 0.95], [r * 1.04, front - 0.95], [r * 1.04, front - 1.3], [r * 0.97, front - 1.3]], { segments: 24 }));
  add(part, "light", revolve([[r * 0.97, front - 0.72], [r * 1.03, front - 0.72], [r * 1.03, front - 0.78], [r * 0.97, front - 0.78]], { segments: 24 }));
  add(part, "metal", revolve([[r * 0.66, back - 0.06], [r * 1.08, back - 0.06], [r * 1.08, back + 0.2], [r * 0.66, back + 0.2]], { segments: 24 }));
  add(part, "dark", revolve([[r * 0.46, back - 0.02], [r * 0.7, back - 0.02], [r * 0.7, back + 0.14], [r * 0.46, back + 0.14]], { segments: 24 }));
  add(part, "glowBlue", revolve([[0, back - 0.02], [r * 0.66, back - 0.02], [r * 0.66, back + 0.1], [0, back + 0.1]], { segments: 24 }));
  add(part, "glowCyan", revolve([[0, back - 0.05], [r * 0.34, back - 0.05], [r * 0.34, back + 0.05], [0, back + 0.05]], { segments: 20 }));
  return part;
}

function engines(variant: EngineVariant): PartGeometry {
  const shape = ENGINE_SHAPES[variant];
  const one = pod(shape.radius, shape.length);
  const part: PartGeometry = {};
  for (const [role, mesh] of Object.entries(one) as [MaterialRole, MeshData][]) {
    const placed = translate(mesh, [shape.x, shape.y, shape.z]);
    add(part, role, [placed, mirrorX(placed)]);
  }
  if (shape.center) {
    const middle = pod(shape.radius * 0.8, shape.length * 0.9);
    for (const [role, mesh] of Object.entries(middle) as [MaterialRole, MeshData][]) add(part, role, translate(mesh, [0, 0.12, -1.05]));
  }
  return part;
}

// ─── Double dérive : hautes, balayées, lisérés ambre ─────────────────────────────────────────────────────────────────────

function tail(): PartGeometry {
  const part: PartGeometry = {};
  const fin: Pt[] = [[-0.5, 0], [-2.3, 0], [-2.75, 1.45], [-2.1, 1.45]];
  const placed = (mesh: MeshData) => translate(rotateZ(mesh, -12 * DEG), [0.62, 0.45, 0]);
  add(part, "accent", both(placed(prism(fin, { from: -0.07, to: 0.07, bevel: 0.05, axis: "x" }))));
  const strip: Pt[] = [[-1.25, 0.78], [-2.0, 0.78], [-2.1, 0.93], [-1.4, 0.93]];
  add(part, "light", both(placed(prism(strip, { from: -0.085, to: 0.085, bevel: 0.0, axis: "x" }))));
  // Plaque blanche à la base de la dérive.
  add(part, "hull", both(placed(prism([[-0.55, 0], [-2.2, 0], [-2.35, 0.3], [-0.7, 0.3]], { from: -0.09, to: 0.09, bevel: 0.02, axis: "x" }))));
  return part;
}

// ─── Coussin lumineux : le vaisseau flotte sur deux liserés bleus sous le ventre (plus de pieds) ──────────────────────────

function gear(): PartGeometry {
  const part: PartGeometry = {};
  add(part, "glowBlue", both(prism([[0.38, -1.7], [0.52, -1.7], [0.44, 1.0], [0.34, 1.0]], { from: -0.56, to: -0.53, bevel: 0.0, axis: "y" })));
  add(part, "glowCyan", prism([[-0.12, -2.3], [0.12, -2.3], [0.1, -1.8], [-0.1, -1.8]], { from: -0.5, to: -0.47, bevel: 0.0, axis: "y" }));
  return part;
}

function shield(): PartGeometry {
  const part: PartGeometry = {};
  const bubble = revolve(ellipseContour(1, -1, 1, 16), { segments: 32 });
  add(part, "glass", scale(bubble, [3.5, 2.1, 4.1]));
  return part;
}

export interface ShipVariants {
  wings: WingVariant;
  engines: EngineVariant;
}

/** La géométrie d'une partie, classée par rôle de matériau. */
export function buildPart(part: PartId, variants: ShipVariants): PartGeometry {
  switch (part) {
    case "hull":
      return hull();
    case "cockpit":
      return cockpit();
    case "wings":
      return wings(variants.wings);
    case "engines":
      return engines(variants.engines);
    case "tail":
      return tail();
    case "gear":
      return gear();
    case "shield":
      return shield();
  }
}

export const ALL_PARTS: readonly PartId[] = ["hull", "cockpit", "wings", "engines", "tail", "gear", "shield"];
