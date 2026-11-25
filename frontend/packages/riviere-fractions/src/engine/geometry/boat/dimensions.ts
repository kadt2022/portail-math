// Plan de formes du bateau à moteur du joueur. Toutes les pièces (coque, pont, poste de pilotage, toit, moteur,
// accessoires, pilote) lisent leurs cotes ici : une seule source, des pièces qui s'emboîtent.
//
// Repère du bateau : x vers tribord (la droite du pilote), y vers le haut (0 = ligne de flottaison), z vers la proue.
// Le paramètre t parcourt la longueur de la coque, de 0 au tableau arrière à 1 à l'étrave.

export type Vec3 = [number, number, number];

export const HULL = {
  /** Tableau arrière (z) et pointe de l'étrave (z). */
  stern: -2.35,
  bow: 2.6,
  /** Largeur au plat-bord, au plus large. */
  beam: 2.04,
  /** Plancher du cockpit (y). */
  floor: 0.2,
  /** Largeur du liston, le dessus du plat-bord autour du cockpit. */
  cap: 0.13,
  /** Début du pont avant, sous le pare-brise (z). */
  foredeck: 0.95,
  /** Cloison arrière du cockpit, devant le pont arrière (z). */
  aftDeck: -2.0,
} as const;

export const HULL_LENGTH = HULL.bow - HULL.stern;

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const tAt = (z: number) => (z - HULL.stern) / HULL_LENGTH;
export const zAt = (t: number) => HULL.stern + t * HULL_LENGTH;

/** Hauteur du plat-bord : basse à l'arrière, relevée vers la proue. */
export const sheer = (t: number) => 0.82 + 0.28 * t * t;

/** Demi-largeur au plat-bord : poupe large et presque droite, proue profilée en pointe. */
export function halfBeam(t: number): number {
  const u = clamp((t - 0.38) / 0.62, 0, 1);
  return (HULL.beam / 2) * (0.965 + 0.035 * smoothstep(0, 0.3, t)) * (1 - u ** 2.1);
}

/** Hauteur de la quille, qui remonte vers l'étrave. */
export const keel = (t: number) => -0.34 + 0.52 * smoothstep(0.55, 1, t) ** 1.3;

/** Angle de V de la carène : plate à l'arrière pour glisser, fine à l'avant pour fendre l'eau. */
export const deadrise = (t: number) => 0.3 + 0.55 * smoothstep(0.35, 1, t);

/** Bouchain : l'arête entre le fond en V et le flanc. */
export function chine(t: number): { x: number; y: number } {
  const x = halfBeam(t) * 0.84;
  return { x, y: Math.min(keel(t) + Math.tan(deadrise(t)) * x, sheer(t) - 0.14) };
}

/** Quête de l'étrave : le bas de la proue recule, le haut avance. */
const rake = (t: number) => 0.55 * smoothstep(0.72, 1, t) ** 1.5;

/** Bas du flanc, juste au-dessus du bouchain (le petit redan qui rejette les embruns). */
function sideFoot(t: number): { x: number; y: number } {
  const c = chine(t);
  return { x: c.x + 0.03 * clamp(halfBeam(t) / 0.3, 0, 1), y: c.y + 0.006 };
}

function hullPoint(t: number, x: number, y: number): Vec3 {
  return [x, y, zAt(t) - (sheer(t) - y) * rake(t)];
}

/** Hauteurs (de 0 au bouchain à 1 au plat-bord) des rangées de sommets du flanc. */
export const SIDE_ROWS = [0, 0.22, 0.5, 0.78, 1] as const;

/**
 * Section de la coque en t, moitié tribord : le fond (de la quille au redan) et le flanc (du redan au plat-bord).
 * Le flanc s'évase en montant puis devient vertical sous le liston.
 */
export function section(t: number): { bottom: Vec3[]; side: Vec3[] } {
  const k = keel(t);
  const c = chine(t);
  const foot = sideFoot(t);
  const w = halfBeam(t);
  const s = sheer(t);
  const bottom = [hullPoint(t, 0, k), hullPoint(t, c.x * 0.5, k + (c.y - k) * 0.47), hullPoint(t, c.x, c.y), hullPoint(t, foot.x, foot.y)];
  const side = SIDE_ROWS.map((h) => hullPoint(t, foot.x + (w - foot.x) * (1 - (1 - h) ** 2), foot.y + (s - foot.y) * h));
  return { bottom, side };
}

/** Largeur du flanc (x) à la hauteur y, en t : pour poser une pièce contre la coque. */
export function sideX(t: number, y: number): number {
  const foot = sideFoot(t);
  const h = clamp((y - foot.y) / (sheer(t) - foot.y), 0, 1);
  return foot.x + (halfBeam(t) - foot.x) * (1 - (1 - h) ** 2);
}

/** Paroi intérieure du cockpit (x), sous le bord intérieur du liston. */
export const innerX = (t: number) => halfBeam(t) - HULL.cap;

/** Bombé du pont avant, nul à la pointe pour rejoindre l'étrave. */
export const crown = (t: number) => 0.07 * (1 - smoothstep(0.85, 1, t));

/** Hauteur du pont avant au point (x, z). */
export function deckY(x: number, z: number): number {
  const t = tAt(z);
  const w = Math.max(halfBeam(t), 1e-3);
  return sheer(t) + crown(t) * (1 - clamp(x / w, -1, 1) ** 2);
}

/** Poste de pilotage, à tribord : siège, volant et tableau de bord. */
export const HELM = { x: 0.47, seatZ: 0.02, seatTop: 0.645 } as const;

/** Volant : centre, inclinaison de la colonne (autour de x) et rayon de la jante. */
export const WHEEL = { x: HELM.x, y: 0.975, z: 0.39, tilt: -0.67, radius: 0.17 } as const;

/** Point de la jante du volant : angle 0 vers tribord, π/2 en haut de la jante. */
export function wheelPoint(angle: number, radius: number = WHEEL.radius): Vec3 {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const c = Math.cos(WHEEL.tilt);
  const s = Math.sin(WHEEL.tilt);
  return [WHEEL.x + x, WHEEL.y - z * s, WHEEL.z + z * c];
}

/** Toit rigide sur montants : superellipse vue de dessus, bombée. */
export const ROOF = { centerZ: 0.02, halfWidth: 0.84, halfLength: 0.98, exponent: 3.2, under: 2.08, edge: 2.2, dome: 0.075 } as const;

/** Moteur hors-bord : pivot de direction sur le tableau arrière, moyeu de l'hélice dans le repère du moteur. */
export const OUTBOARD = { pivot: [0, 0.7, HULL.stern - 0.04] as Vec3, hub: [0, -0.76, -0.64] as Vec3, bladeRadius: 0.17 } as const;
