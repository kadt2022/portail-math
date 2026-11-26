// Tracé d'une voie ferrée, en TypeScript pur. Une voie est décrite comme un conducteur la parcourt : des tronçons de
// courbure constante (droites, courbes à gauche ou à droite) et des tronçons de pente constante. Entre deux courbures,
// la courbure varie linéairement sur une longueur de raccordement : c'est une clothoïde, la courbe de transition des
// vraies voies ferrées, qui évite les à-coups latéraux. Les pentes se raccordent de la même façon (raccordement
// vertical). Dans les courbes, la voie est inclinée vers l'intérieur (dévers), proportionnellement à la courbure.
//
// La position le long de la voie, s (en mètres), est l'abscisse curviligne : chaque mètre de s est un mètre de rail.
// Tout le reste (trains, caméras, décor) s'appuie sur pointAt(s).
//
// Écrit pour Yamba.

export interface CurvePiece {
  /** Longueur du tronçon (m). */
  length: number;
  /** Courbure (1/rayon, 1/m) : positive vers la droite, négative vers la gauche, nulle en ligne droite. */
  curvature: number;
  /** Longueur du raccordement en début de tronçon, depuis la courbure précédente (m). 0 : changement immédiat. */
  ramp?: number;
}

export interface GradePiece {
  length: number;
  /** Pente (m de montée par m parcouru) : 0,02 = 2 %. */
  grade: number;
  ramp?: number;
}

export interface TrackStart {
  x: number;
  y: number;
  z: number;
  /** Cap initial (radians) : direction (sin cap, cos cap) dans le plan horizontal. */
  heading: number;
  /** Courbure et pente au départ (pour prolonger une autre voie sans cassure). */
  curvature?: number;
  grade?: number;
}

export interface TrackPoint {
  s: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Pente locale (tan de l'angle de rampe). */
  grade: number;
  curvature: number;
  /** Dévers (radians) : positif, la voie penche vers la droite (courbe à droite). */
  cant: number;
}

export interface Track {
  readonly length: number;
  /** Point de la voie à l'abscisse s (bornée à la voie). */
  pointAt(s: number): TrackPoint;
  /** Échantillons réguliers (pour construire rails, ballast, terrain). */
  readonly samples: readonly TrackPoint[];
  readonly step: number;
}

/** Pas d'intégration du tracé (m). */
export const TRACK_STEP = 0.5;
/** Dévers par unité de courbure, et dévers maximal (environ 4°). */
const CANT_PER_CURVATURE = 14;
const MAX_CANT = 0.07;

/** Valeur, au mètre s d'une suite de tronçons, avec raccordements linéaires en début de tronçon. */
function profileAt(pieces: readonly { length: number; value: number; ramp: number }[], start: number, s: number): number {
  let previous = start;
  let at = 0;
  for (const piece of pieces) {
    if (s < at + piece.length) {
      const into = s - at;
      if (piece.ramp > 0 && into < piece.ramp) return previous + (piece.value - previous) * (into / piece.ramp);
      return piece.value;
    }
    previous = piece.value;
    at += piece.length;
  }
  return previous;
}

/**
 * Construit une voie : intégration du cap (courbure) et de l'altitude (pente) pas à pas. La longueur est celle du
 * plan des courbures ; le plan des pentes est prolongé par sa dernière pente s'il est plus court.
 */
export function buildTrack(start: TrackStart, curves: readonly CurvePiece[], grades: readonly GradePiece[]): Track {
  const curvePieces = curves.map((p) => ({ length: p.length, value: p.curvature, ramp: p.ramp ?? 0 }));
  const gradePieces = grades.map((p) => ({ length: p.length, value: p.grade, ramp: p.ramp ?? 0 }));
  const length = curves.reduce((sum, p) => sum + p.length, 0);
  const samples: TrackPoint[] = [];
  let x = start.x;
  let y = start.y;
  let z = start.z;
  let heading = start.heading;
  const count = Math.ceil(length / TRACK_STEP);
  for (let i = 0; i <= count; i += 1) {
    const s = Math.min(length, i * TRACK_STEP);
    const curvature = profileAt(curvePieces, start.curvature ?? 0, s);
    const grade = profileAt(gradePieces, start.grade ?? 0, s);
    const cant = Math.max(-MAX_CANT, Math.min(MAX_CANT, curvature * CANT_PER_CURVATURE));
    samples.push({ s, x, y, z, heading, grade, curvature, cant });
    if (i === count) break;
    // Pas suivant : demi-pas de cap (méthode du point milieu) pour rester précis dans les courbes serrées.
    const ds = Math.min(TRACK_STEP, length - s);
    const mid = heading + curvature * ds * 0.5;
    const horizontal = ds / Math.sqrt(1 + grade * grade);
    x += Math.sin(mid) * horizontal;
    z += Math.cos(mid) * horizontal;
    y += grade * horizontal;
    heading += curvature * ds;
  }
  return {
    length,
    samples,
    step: TRACK_STEP,
    pointAt(sRaw) {
      const s = Math.max(0, Math.min(length, sRaw));
      const i = Math.min(samples.length - 2, Math.floor(s / TRACK_STEP));
      const a = samples[i];
      const b = samples[i + 1];
      const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
      return {
        s,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        heading: a.heading + (b.heading - a.heading) * t,
        grade: a.grade + (b.grade - a.grade) * t,
        curvature: a.curvature + (b.curvature - a.curvature) * t,
        cant: a.cant + (b.cant - a.cant) * t,
      };
    },
  };
}

/**
 * Prolonge une voie à partir de l'abscisse `at` d'une autre (branche d'aiguillage) : la nouvelle voie commence
 * exactement au même point, avec le même cap et la même pente ; ses abscisses continuent celles de la voie mère.
 */
export function branchTrack(parent: Track, at: number, curves: readonly CurvePiece[], grades: readonly GradePiece[]): Track {
  const origin = parent.pointAt(at);
  const tail = buildTrack({ x: origin.x, y: origin.y, z: origin.z, heading: origin.heading, curvature: origin.curvature, grade: origin.grade }, curves, grades);
  const length = at + tail.length;
  const prefix = parent.samples.filter((p) => p.s < at);
  const samples = [...prefix, ...tail.samples.map((p) => ({ ...p, s: p.s + at }))];
  return {
    length,
    samples,
    step: TRACK_STEP,
    pointAt(s) {
      return s < at ? parent.pointAt(s) : { ...tail.pointAt(s - at), s: Math.min(length, Math.max(at, s)) };
    },
  };
}

/** Vecteurs du repère de la voie en un point : avant, droite, haut (dévers et pente compris). */
export function trackFrame(p: TrackPoint): { forward: [number, number, number]; right: [number, number, number]; up: [number, number, number] } {
  const cosPitch = 1 / Math.sqrt(1 + p.grade * p.grade);
  const forward: [number, number, number] = [Math.sin(p.heading) * cosPitch, p.grade * cosPitch, Math.cos(p.heading) * cosPitch];
  // Droite horizontale, puis inclinaison du dévers autour de l'axe avant.
  const flatRight: [number, number, number] = [Math.cos(p.heading), 0, -Math.sin(p.heading)];
  // Haut sans dévers : la verticale, débarrassée de sa part le long de l'avant (la voie monte ou descend).
  const along = forward[1];
  const raw: [number, number, number] = [-forward[0] * along, 1 - forward[1] * along, -forward[2] * along];
  const n = Math.hypot(raw[0], raw[1], raw[2]);
  const flatUp: [number, number, number] = [raw[0] / n, raw[1] / n, raw[2] / n];
  // Le dévers abaisse le rail intérieur : la voie penche vers l'intérieur de la courbe (vers la droite si courbure > 0).
  const c = Math.cos(p.cant);
  const sn = Math.sin(p.cant);
  const right: [number, number, number] = [flatRight[0] * c - flatUp[0] * sn, flatRight[1] * c - flatUp[1] * sn, flatRight[2] * c - flatUp[2] * sn];
  const up: [number, number, number] = [flatUp[0] * c + flatRight[0] * sn, flatUp[1] * c + flatRight[1] * sn, flatUp[2] * c + flatRight[2] * sn];
  return { forward, right, up };
}
