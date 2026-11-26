import { trackFrame, type Track, type TrackPoint } from "../../domain/track";
import { addShape, emptyMesh, mixColor, scaleColor, sweep, type Color, type Frame, type MeshData, type Vec3 } from "./kit";
import { valueNoise } from "./noise";
import { PALETTE as C } from "./palette";
import { GAUGE } from "./rollingStock";
import { bar, disc } from "./shapes";

// La voie en géométrie procédurale : rails au vrai profil (patin, âme, champignon brillant), traverses de bois avec
// leurs selles, ballast en talus, heurtoirs. La voie suit le tracé point par point, dévers compris. L'altitude d'un
// point du tracé est celle du dessus des rails.
//
// Écrit pour Yamba.

/** Hauteur du rail, épaisseur de traverse, profondeur du ballast sous le dessus des rails (m). */
export const RAIL_HEIGHT = 0.172;
export const SLEEPER_SPACING = 0.62;
export const FORMATION_DEPTH = 0.78;

const RAIL_PROFILE: [number, number][] = [
  [-0.075, 0],
  [0.075, 0],
  [0.075, 0.012],
  [0.011, 0.032],
  [0.009, 0.122],
  [0.035, 0.134],
  [0.036, 0.172],
  [-0.036, 0.172],
  [-0.035, 0.134],
  [-0.009, 0.122],
  [-0.011, 0.032],
  [-0.075, 0.012],
];

/** Rail simplifié pour la voie lointaine : champignon et âme en un seul profil à quatre côtés. */
const SIMPLE_RAIL: [number, number][] = [[-0.05, 0], [0.05, 0], [0.036, 0.172], [-0.036, 0.172]];

/** Repère de la voie à l'abscisse s : centre (dessus des rails), droite et haut. */
export function frameAt(track: Track, s: number): Frame & { point: TrackPoint } {
  const point = track.pointAt(s);
  const { right, up } = trackFrame(point);
  return { p: [point.x, point.y, point.z], right, up, point };
}

function offset(frame: Frame, x: number, y: number): Vec3 {
  return [frame.p[0] + frame.right[0] * x + frame.up[0] * y, frame.p[1] + frame.right[1] * x + frame.up[1] * y, frame.p[2] + frame.right[2] * x + frame.up[2] * y];
}

/** Abscisses régulières de `from` à `to` (bornes comprises). */
function stations(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.max(1, Math.ceil((to - from) / step));
  for (let i = 0; i <= n; i += 1) out.push(from + ((to - from) * i) / n);
  return out;
}

export interface TrackMeshOptions {
  rails?: boolean;
  /** Pas des anneaux du rail (m) : 1 de près (en courbe ; 3 en alignement), plus long pour les versions lointaines. */
  railStep?: number;
  /** Selles d'acier sous les rails (de près seulement). */
  plates?: boolean;
  ballastStep?: number;
  sleepers?: boolean;
  ballast?: boolean;
  /** Rails à omettre (pour les aiguilles mobiles) : côté et intervalle d'abscisses. */
  skipRail?: { side: -1 | 1; from: number; to: number }[];
  /** Traverses longues (sous un aiguillage) : longueur et décalage latéral. */
  longSleepers?: { from: number; to: number; extra: number; side: -1 | 1 };
}

/** Rail d'un côté (-1 gauche, 1 droite), de `from` à `to`, posé sur les traverses. */
export function railMesh(target: MeshData, track: Track, side: -1 | 1, from: number, to: number, lateral = 0, step = 1, simple = false): void {
  if (to - from < 0.05) return;
  const x = side * (GAUGE / 2 + 0.036) + lateral;
  const profile = simple ? SIMPLE_RAIL : RAIL_PROFILE;
  // Le pas s'allonge en alignement droit (la courbure y est nulle) : trois fois moins d'anneaux sans rien perdre.
  const points: number[] = [];
  for (let s = from; s < to - 1e-6; ) {
    points.push(s);
    const k = Math.abs(track.pointAt(s).curvature) + Math.abs(track.pointAt(Math.min(to, s + 3 * step)).curvature);
    s += k < 1e-5 && step === 1 ? 3 : step;
  }
  points.push(to);
  const frames = points.map((s) => {
    const f = frameAt(track, s);
    return { p: offset(f, x, -RAIL_HEIGHT), right: f.right, up: f.up };
  });
  sweep(target, profile, frames, (v, ring) => {
    const top = simple ? v === 2 || v === 3 : v >= 5 && v <= 8;
    const rust = valueNoise(ring * 0.4, side * 7, 3) * 0.25;
    return top ? C.railTop : mixColor(C.rail, C.rust, 0.25 + rust);
  }, true);
}

/** La voie complète sur un intervalle : ballast, traverses et selles, rails. */
export function trackMesh(track: Track, from: number, to: number, options: TrackMeshOptions = {}): MeshData {
  const mesh = emptyMesh();
  if (options.ballast !== false) {
    const profile: [number, number][] = [[-2.45, -FORMATION_DEPTH], [-1.75, -0.32], [-1.35, -0.29], [-0.6, -0.27], [0.6, -0.27], [1.35, -0.29], [1.75, -0.32], [2.45, -FORMATION_DEPTH]];
    const frames = stations(from, to, options.ballastStep ?? 1.5).map((s) => frameAt(track, s));
    sweep(mesh, profile, frames, (v, ring) => {
      const n = valueNoise(ring * 0.9 + v * 3.1, v * 1.3, 11);
      const shoulder = v === 0 || v === profile.length - 1 ? 0.82 : 1;
      return scaleColor(mixColor(C.ballastDark, C.ballast, n), shoulder);
    });
  }
  if (options.sleepers !== false) {
    const first = Math.ceil(from / SLEEPER_SPACING) * SLEEPER_SPACING;
    for (let s = first; s <= to; s += SLEEPER_SPACING) {
      const f = frameAt(track, s);
      const n = valueNoise(s * 1.7, 3, 21);
      const color = mixColor(C.sleeperDark, C.sleeper, n);
      let half = 1.3;
      let shift = 0;
      const long = options.longSleepers;
      if (long && s >= long.from && s <= long.to) {
        const t = (s - long.from) / (long.to - long.from);
        half = 1.3 + (long.extra * t) / 2;
        shift = (long.side * long.extra * t) / 2;
      }
      sleeper(mesh, f, half, shift, color, s, options.plates === false);
      if (options.plates !== false) {
        for (const side of [-1, 1]) plate(mesh, f, side * (GAUGE / 2 + 0.036));
      }
    }
  }
  if (options.rails !== false) {
    for (const side of [-1, 1] as const) {
      const gaps = (options.skipRail ?? []).filter((g) => g.side === side && g.to > from && g.from < to).sort((a, b) => a.from - b.from);
      let at = from;
      for (const gap of gaps) {
        railMesh(mesh, track, side, at, Math.max(at, gap.from), 0, options.railStep ?? 1, (options.railStep ?? 1) > 1);
        at = Math.max(at, gap.to);
      }
      railMesh(mesh, track, side, at, to, 0, options.railStep ?? 1, (options.railStep ?? 1) > 1);
    }
  }
  return mesh;
}

function sleeper(mesh: MeshData, f: Frame, half: number, shift: number, color: Color, s: number, simple = false): void {
  const w = 0.13;
  const top = -RAIL_HEIGHT - 0.015;
  const bottom = top - 0.16;
  const along = (d: number, x: number, y: number): Vec3 => {
    const p = offset(f, x + shift, y);
    const fwd: Vec3 = [f.up[1] * f.right[2] - f.up[2] * f.right[1], f.up[2] * f.right[0] - f.up[0] * f.right[2], f.up[0] * f.right[1] - f.up[1] * f.right[0]];
    return [p[0] - fwd[0] * d, p[1] - fwd[1] * d, p[2] - fwd[2] * d];
  };
  const v: Vec3[] = [
    along(-w, -half, bottom), along(-w, half, bottom), along(w, half, bottom), along(w, -half, bottom),
    along(-w, -half, top), along(-w, half, top), along(w, half, top), along(w, -half, top),
  ];
  const tint = scaleColor(color, 0.9 + valueNoise(s, 9, 2) * 0.2);
  // De près : dessus, quatre côtés ; de loin, le dessus seul (les côtés ne se voient plus).
  const faces = simple ? [4, 5, 6, 4, 6, 7] : [4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 2, 6, 3, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];
  addShape(mesh, v, faces, [tint, tint, tint, tint, scaleColor(tint, 1.12), scaleColor(tint, 1.12), scaleColor(tint, 1.12), scaleColor(tint, 1.12)]);
}

function plate(mesh: MeshData, f: Frame, x: number): void {
  // Selle d'acier sous le patin du rail (une plaque : à cette taille, les crampons ne se voient pas).
  const y = -RAIL_HEIGHT - 0.006;
  bar(mesh, offset(f, x - 0.16, y), offset(f, x + 0.16, y), 0.17, 0.016, C.steelDark, f.up);
}

/**
 * Heurtoir en fin de voie : les deux rails relevés en butoir, une traverse de bois peinte en bandes rouges et
 * blanches, et la lanterne rouge. Posé à l'abscisse `at`, face au train qui arrive dans le sens `facing`.
 */
export function bufferStop(track: Track, at: number, facing: 1 | -1): MeshData {
  const mesh = emptyMesh();
  const f = frameAt(track, at);
  const fwd: Vec3 = [f.up[1] * f.right[2] - f.up[2] * f.right[1], f.up[2] * f.right[0] - f.up[0] * f.right[2], f.up[0] * f.right[1] - f.up[1] * f.right[0]];
  const p = (along: number, x: number, y: number): Vec3 => {
    const o = offset(f, x, y);
    return [o[0] + fwd[0] * along * facing, o[1] + fwd[1] * along * facing, o[2] + fwd[2] * along * facing];
  };
  for (const side of [-1, 1]) {
    const x = side * (GAUGE / 2 + 0.036);
    bar(mesh, p(-1.8, x, 0), p(0.1, x, 1.05), 0.07, 0.15, C.rail, f.up);
    bar(mesh, p(0.3, x, 0), p(0.1, x, 1.05), 0.07, 0.15, C.rail, f.up);
  }
  // Poutre de choc à bandes, deux tampons.
  for (let i = 0; i < 8; i += 1) {
    const x0 = -1.4 + i * 0.35;
    bar(mesh, p(0.05, x0, 1.0), p(0.05, x0 + 0.35, 1.0), 0.3, 0.42, i % 2 === 0 ? C.red : C.white, fwd);
  }
  for (const x of [-0.86, 0.86]) {
    const a = p(-0.12, x, 1.0);
    const b = p(-0.5, x, 1.0);
    bar(mesh, a, b, 0.22, 0.22, C.black, f.up);
    disc(mesh, 0.2, 0.05, 14, C.steel, b, "z");
  }
  // Lanterne rouge sur son support.
  bar(mesh, p(0.1, 0, 1.2), p(0.1, 0, 1.9), 0.06, 0.06, C.black, fwd);
  bar(mesh, p(0.1, -0.13, 1.9), p(0.1, 0.13, 1.9), 0.26, 0.26, C.black, fwd);
  bar(mesh, p(-0.04, -0.08, 2.03), p(-0.04, 0.08, 2.03), 0.02, 0.16, C.mangoRed, fwd);
  return mesh;
}

/**
 * Cœur de croisement et contre-rails de l'aiguillage. Là où le rail gauche de la déviation croise le rail droit de la
 * voie principale : une pointe de cœur en acier moulé, deux pattes de lièvre, et un contre-rail face à chaque cœur
 * (sur le rail opposé) qui guide l'essieu au passage de la lacune.
 */
export function turnoutFrog(main: Track, branch: Track, from: number, length: number): MeshData {
  const mesh = emptyMesh();
  const x0 = GAUGE / 2 + 0.036;
  const railAt = (track: Track, s: number, x: number): Vec3 => offset(frameAt(track, s), x, -RAIL_HEIGHT);
  // Écart signé de la file gauche déviée par rapport à la file droite principale (négatif avant le croisement).
  const lateral = (s: number) => {
    const f = frameAt(main, s);
    const a = railAt(main, s, x0);
    const b = railAt(branch, s, -x0);
    return (b[0] - a[0]) * f.right[0] + (b[2] - a[2]) * f.right[2];
  };
  const separation = (s: number) => Math.max(0, lateral(s));
  // Point mathématique du cœur : là où les deux files se croisent.
  let frog = from + length;
  for (let s = from; s < from + length * 2; s += 0.05) {
    if (lateral(s) >= 0) {
      frog = s;
      break;
    }
  }
  const steel = C.rail;
  const lift = (p: Vec3, dy: number): Vec3 => [p[0], p[1] + dy, p[2]];
  // Pointe de cœur : un bloc qui s'élargit avec l'écart des deux files.
  for (let s = frog - 0.4; s < frog + 2.4; s += 0.4) {
    const mid = (t: number): Vec3 => {
      const a = railAt(main, t, x0);
      const b = railAt(branch, t, -x0);
      return lift([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], 0.08);
    };
    bar(mesh, mid(s), mid(s + 0.4), Math.max(0.09, separation(s + 0.2) + 0.08), 0.16, steel);
  }
  // Pattes de lièvre : de part et d'autre de la pointe, le long de chaque file, jusqu'un peu après la lacune.
  for (const [track, x] of [[main, x0 - 0.075], [branch, -x0 + 0.075]] as const) {
    bar(mesh, lift(railAt(track, frog - 2.2, x), 0.08), lift(railAt(track, frog + 1.2, x), 0.08), 0.06, 0.15, steel);
  }
  // Contre-rails, face au cœur, contre la file opposée (côté intérieur).
  for (const [track, x] of [[main, -x0 + 0.075], [branch, x0 - 0.075]] as const) {
    bar(mesh, lift(railAt(track, frog - 2.4, x), 0.08), lift(railAt(track, frog + 2.4, x), 0.08), 0.06, 0.15, C.rail);
  }
  return mesh;
}
