// Carrefour de la Zone 3 : contrôleur de feux commun et trajectoires de virage.
// Pur (sans Phaser) : tout est testable. La voiture de Léo n'y est pour rien ; seuls les véhicules du trafic
// empruntent ces trajectoires.

import { MAIN_LANE_Y, ONCOMING_LANE_Y } from "./leoGeometry";
import { avenueGeometry, laneCenterY, laneSign, lanes, planTurn, type LaneId, type Movement, type TurnPlan } from "./leoLanes";
import { DEFAULT_LIGHT_CYCLE, type LightCycle, type LightState } from "./leoTrafficLight";
import { ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";

// ---------------------------------------------------------------------------------------------
// Contrôleur de feux
// ---------------------------------------------------------------------------------------------

export type IntersectionPhaseName =
  | "MAIN_GREEN"
  | "MAIN_YELLOW"
  | "ALL_RED_BEFORE_SIDE"
  | "SIDE_GREEN"
  | "SIDE_YELLOW"
  | "ALL_RED_BEFORE_MAIN";

export interface IntersectionCycle {
  mainGreen: number;
  mainYellow: number;
  /** Sécurité : les deux directions sont au rouge, le temps de vider le carrefour. */
  allRed: number;
  sideGreen: number;
  sideYellow: number;
  offset?: number;
}

/** Durées de jeu à tester (secondes), pas des normes de circulation. */
export const DEFAULT_INTERSECTION_CYCLE: IntersectionCycle = {
  mainGreen: 20,
  mainYellow: 4,
  allRed: 2,
  sideGreen: 15,
  sideYellow: 4,
};

/** Dérive un cycle d'un feu à trois états : le rouge de l'avenue est découpé autour du vert de la rue. */
export function cycleFromMain(main: LightCycle = DEFAULT_LIGHT_CYCLE): IntersectionCycle {
  const allRed = 1;
  const sideYellow = 1.5;
  const sideGreen = Math.max(1, main.red - 2 * allRed - sideYellow);
  return { mainGreen: main.green, mainYellow: main.yellow, allRed, sideGreen, sideYellow, offset: main.offset };
}

export interface IntersectionState {
  phase: IntersectionPhaseName;
  main: LightState;
  side: LightState;
  remaining: number;
  elapsed: number;
}

type Step = [IntersectionPhaseName, number, LightState, LightState];

function stepsOf(cycle: IntersectionCycle): Step[] {
  return [
    ["MAIN_GREEN", cycle.mainGreen, "GREEN", "RED"],
    ["MAIN_YELLOW", cycle.mainYellow, "YELLOW", "RED"],
    ["ALL_RED_BEFORE_SIDE", cycle.allRed, "RED", "RED"],
    ["SIDE_GREEN", cycle.sideGreen, "RED", "GREEN"],
    ["SIDE_YELLOW", cycle.sideYellow, "RED", "YELLOW"],
    ["ALL_RED_BEFORE_MAIN", cycle.allRed, "RED", "RED"],
  ];
}

export function intersectionLength(cycle: IntersectionCycle) {
  return cycle.mainGreen + cycle.mainYellow + 2 * cycle.allRed + cycle.sideGreen + cycle.sideYellow;
}

/** État théorique du cycle à l'instant `time` (sans prolongation du rouge intégral). */
export function intersectionStateAt(time: number, cycle: IntersectionCycle = DEFAULT_INTERSECTION_CYCLE): IntersectionState {
  const length = intersectionLength(cycle);
  let t = (((time + (cycle.offset ?? 0)) % length) + length) % length;
  const steps = stepsOf(cycle);
  for (const [phase, duration, main, side] of steps) {
    if (t < duration) return { phase, main, side, remaining: duration - t, elapsed: t };
    t -= duration;
  }
  const last = steps[steps.length - 1];
  return { phase: last[0], main: last[2], side: last[3], remaining: 0, elapsed: last[1] };
}

/** Occupation du carrefour au moment de décider : qui est encore dans la zone de conflit ? */
export interface IntersectionOccupancy {
  /** Un véhicule de l'avenue principale (ou Léo) en mouvement dans la zone de conflit. */
  mainBusy: boolean;
  /** Un véhicule de la rue perpendiculaire engagé dans son virage. */
  sideBusy: boolean;
}

/** Prolongation maximale du rouge intégral : un véhicule arrêté dans la zone ne bloque jamais le parcours. */
export const MAX_ALL_RED_EXTENSION = 8;

/**
 * Contrôleur de feux commun. Il suit le cycle configuré, mais ne rend JAMAIS le vert à un axe tant que les
 * mouvements incompatibles n'ont pas quitté la zone de conflit : le rouge intégral est prolongé (jusqu'à
 * MAX_ALL_RED_EXTENSION secondes) plutôt que d'autoriser un conflit.
 */
export class IntersectionController {
  private index = 0;
  private elapsed = 0;
  /** Secondes de prolongation du rouge intégral en cours. */
  extension = 0;
  private readonly cycle: IntersectionCycle;

  constructor(cycle: IntersectionCycle = DEFAULT_INTERSECTION_CYCLE) {
    this.cycle = cycle;
    // Décalage initial : on démarre dans le cycle comme intersectionStateAt le ferait.
    let t = cycle.offset ?? 0;
    const steps = stepsOf(cycle);
    while (t >= steps[this.index][1]) {
      t -= steps[this.index][1];
      this.index = (this.index + 1) % steps.length;
    }
    this.elapsed = t;
  }

  get state(): IntersectionState {
    const step = stepsOf(this.cycle)[this.index];
    return {
      phase: step[0],
      main: step[2],
      side: step[3],
      remaining: Math.max(0, step[1] - this.elapsed),
      elapsed: this.elapsed,
    };
  }

  reset() {
    this.index = 0;
    this.elapsed = 0;
    this.extension = 0;
  }

  update(seconds: number, occupancy: IntersectionOccupancy) {
    const dt = Math.max(0, seconds);
    const steps = stepsOf(this.cycle);
    this.elapsed += dt;
    // Boucle : un grand pas de temps peut traverser plusieurs phases.
    for (let guard = 0; guard < steps.length * 2; guard += 1) {
      const step = steps[this.index];
      if (this.elapsed < step[1]) return;
      const next = steps[(this.index + 1) % steps.length];
      const opensSide = next[0] === "SIDE_GREEN" && occupancy.mainBusy;
      const opensMain = next[0] === "MAIN_GREEN" && occupancy.sideBusy;
      if ((opensSide || opensMain) && this.extension < MAX_ALL_RED_EXTENSION) {
        // Zone de conflit pas encore libérée : on garde le rouge intégral.
        this.extension += this.elapsed - step[1];
        this.elapsed = step[1];
        return;
      }
      this.elapsed -= step[1];
      this.index = (this.index + 1) % steps.length;
      this.extension = 0;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Trajectoires de virage
// ---------------------------------------------------------------------------------------------

export interface PathPoint {
  x: number;
  y: number;
  /** Cap du véhicule : tangente exacte B'(t) (radians, 0 = est, π/2 = bas de l'écran, π = ouest). */
  heading: number;
  /** Abscisse curviligne depuis le début du trajet. */
  s: number;
  /** Courbure κ(t) = |x'y'' − y'x''| / (x'² + y'²)^(3/2) ; 0 sur les segments droits. */
  curvature: number;
  /** Vitesse maximale (px/s) à ce point : adhérence latérale, freinage progressif avant les virages, limite de l'avenue. */
  cap: number;
}

export interface CrossPath {
  plan: TurnPlan;
  points: PathPoint[];
  length: number;
  /** Abscisses curvilignes : ligne d'arrêt, bord de la chaussée principale, fin du virage. */
  stopS: number;
  edgeS: number;
  curveEndS: number;
  /** Rayon minimal du virage (px) et paramètre d'ouverture utilisé. */
  minRadius: number;
  sweep: number;
  /** Abscisse du point d'arrivée dans la voie cible et de l'entrée dans la chaussée. */
  endX: number;
  edgeX: number;
  params: TurnParams;
}

/** Limite de vitesse sur l'avenue perpendiculaire (px/s), plus basse que sur la chaussée principale. */
export const AVENUE_SPEED_LIMIT = 180;
/** Accélération latérale maximale simplifiée (px/s²) : v_max = √(a_lat / κ). Paramètre de jeu, pas de la physique exacte. */
export const LATERAL_ACCELERATION = 240;
export const MIN_CURVE_SPEED = 80;
/** Freinage confortable utilisé pour ralentir AVANT un virage. */
export const CURVE_BRAKING = 285;
/** Rayon minimal d'un virage, en fraction de la longueur du véhicule (un car ne tourne pas comme une petite voiture). */
export const MIN_RADIUS_RATIO = 0.5;

const LINE_STEP = 6;
const CURVE_SAMPLES = 160;
const EXIT_LENGTH = 520;
const pathCache = new Map<string, CrossPath>();

function bezierPoint(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Dérivées première et seconde d'une Bézier cubique, analytiques. */
function bezierDerivatives(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t;
  const d1 = [0, 1].map((k) => 3 * u * u * (p1[k] - p0[k]) + 6 * u * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]));
  const d2 = [0, 1].map((k) => 6 * u * (p2[k] - 2 * p1[k] + p0[k]) + 6 * t * (p3[k] - 2 * p2[k] + p1[k]));
  return { d1, d2 };
}

/** Ouverture du virage (distance horizontale parcourue) selon la longueur du véhicule : un car balaie plus large. */
export function sweepFor(fullLength: number) {
  return Math.min(420, Math.max(150, Math.round((0.9 * fullLength) / 10) * 10));
}

/** Réglages de la courbe de Bézier : début du virage avancé sur l'avenue, ouverture, longueur des poignées. */
export interface TurnParams {
  /** Distance (px) dont le virage commence AVANT le bord de la chaussée, pour que l'avant d'un long véhicule ne mord pas la voie voisine. */
  lead: number;
  sweepScale: number;
  handle: number;
}

function buildPath(plan: TurnPlan, fullLength: number, params: TurnParams): CrossPath {
  const sweep = Math.round(sweepFor(fullLength) * params.sweepScale);
  const from = lanes()[plan.fromLaneId];
  const start = from.centerline[0];
  const edgeLane = from.centerline[from.centerline.length - 1];
  const approach = Math.atan2(edgeLane.y - start.y, edgeLane.x - start.x);
  // Début du virage (point de non-retour) : un peu avant le bord, en remontant l'approche.
  const edge = { x: edgeLane.x - Math.cos(approach) * params.lead, y: edgeLane.y - Math.sin(approach) * params.lead };
  const sign = laneSign(plan.toLaneId);
  const endY = laneCenterY(plan.toLaneId);
  const end = [edgeLane.x + sign * sweep, endY];
  const exitHeading = sign > 0 ? 0 : Math.PI;
  const chord = Math.hypot(end[0] - edge.x, end[1] - edge.y);
  const handle = params.handle * chord;
  const p0 = [edge.x, edge.y];
  const p1 = [edge.x + Math.cos(approach) * handle, edge.y + Math.sin(approach) * handle];
  const p2 = [end[0] - Math.cos(exitHeading) * handle, end[1] - Math.sin(exitHeading) * handle];

  const points: PathPoint[] = [];
  let s = 0;
  const push = (x: number, y: number, heading: number, curvature: number) => {
    if (points.length > 0) s += Math.hypot(x - points[points.length - 1].x, y - points[points.length - 1].y);
    points.push({ x, y, heading, s, curvature, cap: Infinity });
  };
  const approachLength = Math.hypot(edge.x - start.x, edge.y - start.y);
  const approachSteps = Math.max(1, Math.round(approachLength / LINE_STEP));
  for (let i = 0; i < approachSteps; i += 1) {
    const f = i / approachSteps;
    push(start.x + (edge.x - start.x) * f, start.y + (edge.y - start.y) * f, approach, 0);
  }
  const edgeIndex = points.length;
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES;
    const [x, y] = bezierPoint(p0, p1, p2, end, t);
    const { d1, d2 } = bezierDerivatives(p0, p1, p2, end, t);
    const speed2 = d1[0] * d1[0] + d1[1] * d1[1];
    const kappa = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) / Math.pow(speed2, 1.5);
    push(x, y, Math.atan2(d1[1], d1[0]), kappa);
  }
  const curveEndIndex = points.length - 1;
  const exitSteps = Math.round(EXIT_LENGTH / LINE_STEP);
  for (let i = 1; i <= exitSteps; i += 1) push(end[0] + Math.cos(exitHeading) * i * LINE_STEP, end[1] + Math.sin(exitHeading) * i * LINE_STEP, exitHeading, 0);

  // Vitesse maximale : adhérence latérale dans le virage, limite de l'avenue avant lui, puis freinage progressif
  // en amont de chaque point (passe arrière) pour que la décélération reste confortable.
  for (let i = 0; i < points.length; i += 1) {
    const inTurnZone = i < curveEndIndex;
    const lateral = points[i].curvature > 1e-6 ? Math.sqrt(LATERAL_ACCELERATION / points[i].curvature) : Infinity;
    points[i].cap = inTurnZone ? Math.max(MIN_CURVE_SPEED, Math.min(AVENUE_SPEED_LIMIT, lateral)) : Infinity;
  }
  for (let i = points.length - 2; i >= 0; i -= 1) {
    const ds = points[i + 1].s - points[i].s;
    const allowed = Math.sqrt(points[i + 1].cap * points[i + 1].cap + 2 * CURVE_BRAKING * ds);
    if (allowed < points[i].cap) points[i].cap = allowed;
  }
  let minRadius = Infinity;
  for (let i = edgeIndex; i <= curveEndIndex; i += 1) {
    if (points[i].curvature > 1e-9) minRadius = Math.min(minRadius, 1 / points[i].curvature);
  }
  const avenue = avenueGeometry();
  const stopPoint = points.find((p) => p.y >= avenue.stopY) ?? points[0];
  return {
    plan,
    points,
    length: s,
    stopS: stopPoint.s,
    edgeS: points[edgeIndex].s,
    curveEndS: points[curveEndIndex].s,
    minRadius,
    sweep,
    endX: end[0],
    edgeX: edge.x,
    params,
  };
}

/**
 * Nombre d'échantillons où l'empreinte du véhicule (rectangle orienté, à l'échelle de profondeur) sort de la zone
 * praticable : sur la voie de Léo (au-delà de la ligne centrale), hors de l'avenue, ou sur le trottoir nord.
 * Seule la partie proche de la chaussée est vérifiée : au loin l'avenue converge et le véhicule est minuscule.
 */
export function footprintViolations(path: CrossPath, fullLength: number, depth: number) {
  const avenue = avenueGeometry();
  const roadTop = ROAD_Y - ROAD_HALF_WIDTH;
  let bad = 0;
  for (const point of path.points) {
    if (point.y < 440 || point.s > path.curveEndS + fullLength) continue;
    const scale = depthScale(point.y);
    const half = (fullLength * scale) / 2;
    const halfDepth = (depth * scale) / 2;
    const cos = Math.cos(point.heading);
    const sin = Math.sin(point.heading);
    for (const [lx, ly] of [[half, -halfDepth], [half, halfDepth], [-half, halfDepth], [-half, -halfDepth]]) {
      const x = point.x + lx * cos - ly * sin;
      const y = point.y + lx * sin + ly * cos;
      if (y > ROAD_Y - 4) { bad += 1; break; }
      if (y < roadTop - 4) {
        const centre = (avenue.southLaneX(y) + avenue.northLaneX(y)) / 2;
        if (Math.abs(x - centre) > avenue.width(y) / 2 + 10) { bad += 1; break; }
      }
    }
  }
  return bad;
}

/** Réglages essayés, du plus simple au plus large : le virage commence le plus tard possible. */
function candidateParams(fullLength: number): TurnParams[] {
  const list: TurnParams[] = [];
  for (const leadFactor of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8]) {
    for (const sweepScale of [1, 1.25, 0.8, 1.5]) {
      for (const handle of [0.42, 0.34, 0.5, 0.28]) list.push({ lead: Math.round(leadFactor * fullLength), sweepScale, handle });
    }
  }
  return list;
}

/**
 * Trajectoire d'une manœuvre planifiée : approche dans la voie d'entrée, virage en Bézier cubique, sortie dans la
 * voie cible. Points de contrôle : P0 sur l'axe de la voie d'entrée, P1 tangent à l'approche, P2 tangent à la voie
 * de sortie, P3 sur l'axe de la voie de sortie. Les réglages sont choisis pour que l'empreinte du véhicule entier
 * (un car est long) reste dans la voie voisine de Léo et jamais dans la sienne.
 */
export function turnPath(plan: TurnPlan, fullLength: number, depth = 40): CrossPath {
  const key = `${plan.pathId}@${Math.round(fullLength)}x${Math.round(depth)}`;
  const cached = pathCache.get(key);
  if (cached) return cached;
  let best: { path: CrossPath; bad: number } | null = null;
  for (const params of candidateParams(fullLength)) {
    const path = buildPath(plan, fullLength, params);
    // Rayon minimal du véhicule : un car ne tourne pas comme une petite voiture.
    const bad = footprintViolations(path, fullLength, depth) + (path.minRadius < MIN_RADIUS_RATIO * fullLength ? 50 : 0);
    if (!best || bad < best.bad) best = { path, bad };
    if (bad === 0) break;
  }
  const chosen = (best as { path: CrossPath; bad: number }).path;
  pathCache.set(key, chosen);
  return chosen;
}

/** Trajectoire du virage à droite (le seul mouvement autorisé depuis l'avenue) pour un véhicule de cette longueur. */
export function rightTurnPath(fullLength: number, depth = 40) {
  const plan = planTurn("AVENUE_SOUTH", "RIGHT");
  if (!plan) throw new Error("Aucun virage à droite défini depuis l'avenue");
  return turnPath(plan, fullLength, depth);
}

/** Position, cap et abscisse curviligne interpolés le long d'un trajet. */
export function samplePath(path: CrossPath, s: number): PathPoint {
  const points = path.points;
  if (s <= 0) return points[0];
  if (s >= path.length) return points[points.length - 1];
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (points[mid].s <= s) low = mid;
    else high = mid;
  }
  const a = points[low];
  const b = points[high];
  const t = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
  let delta = b.heading - a.heading;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    heading: a.heading + delta * t,
    s,
    curvature: a.curvature + (b.curvature - a.curvature) * t,
    cap: Number.isFinite(a.cap) && Number.isFinite(b.cap) ? a.cap + (b.cap - a.cap) * t : (t < 0.5 ? a.cap : b.cap),
  };
}

/** Vitesse maximale autorisée à l'abscisse curviligne s (virage et freinage préparatoire compris). */
export function speedCapAt(path: CrossPath, s: number) {
  return samplePath(path, s).cap;
}

/** Fenêtre de la voie cible à garder libre avant de s'engager : espace pour le véhicule entier plus une marge. */
export function exitWindow(path: CrossPath, fullLength: number, margin = 120) {
  const sign = laneSign(path.plan.toLaneId);
  const far = path.endX + sign * (fullLength + margin);
  const near = path.edgeX - sign * 280;
  return { laneId: path.plan.toLaneId as LaneId, minX: Math.min(far, near), maxX: Math.max(far, near) };
}

/** Échelle d'affichage selon la profondeur : petit au loin, taille normale dès la chaussée principale. */
export function depthScale(y: number) {
  // Perspective : la taille apparente est proportionnelle à la distance au point de fuite (comme la largeur de l'avenue).
  const avenue = avenueGeometry();
  const t = (y - avenue.vanishY) / (avenue.mouthY - avenue.vanishY);
  return Math.max(0.12, Math.min(1, t));
}

export type CrossView = "side-left" | "side-right" | "front" | "back" | "front34-left" | "front34-right";

/**
 * Vue d'illustration d'un véhicule d'après son cap. Un profil n'est utilisé que presque à plat (à 30° de
 * l'horizontale au plus). Entre les deux, une vue de face, trois-quarts avant ou de dos est requise : on
 * n'incline jamais un profil de 45° ou 90° pour imiter un virage.
 */
export function crossViewForHeading(heading: number): CrossView {
  const c = Math.cos(heading);
  if (Math.abs(c) >= Math.cos(Math.PI / 6)) return c < 0 ? "side-left" : "side-right";
  const s = Math.sin(heading);
  if (s < 0) return "back";
  const a = Math.abs(c);
  if (a < Math.cos((75 * Math.PI) / 180)) return "front";
  return c < 0 ? "front34-left" : "front34-right";
}

/**
 * Profil provisoire des véhicules de la rue perpendiculaire : tant que les vues trois-quarts demandées à Crochet
 * n'existent pas, on affiche le profil fourni, tourné pour suivre la tangente du trajet. `west` : le véhicule
 * regarde vers l'ouest (cap entre 90° et 270°) ; `tilt` : inclinaison en radians (cap − π vers l'ouest, cap sinon).
 * Quand les vues adaptées arriveront, `crossViewForHeading` les choisira et ce profil ne servira plus.
 */
export function interimProfile(heading: number): { west: boolean; tilt: number } {
  const west = Math.cos(heading) <= 0;
  let tilt = west ? heading - Math.PI : heading;
  while (tilt > Math.PI) tilt -= 2 * Math.PI;
  while (tilt < -Math.PI) tilt += 2 * Math.PI;
  return { west, tilt };
}

/** Pose d'un profil projeté : rotation externe, échelles, rotation interne (rendu par deux conteneurs imbriqués). */
export interface ProfilePose {
  west: boolean;
  /** Matrice linéaire appliquée au profil : image (X, Y) -> écran (m00 X + m01 Y, m10 X + m11 Y). */
  matrix: [number, number, number, number];
  outerRotation: number;
  scaleX: number;
  scaleY: number;
  innerRotation: number;
}

/** Plus petite compression horizontale admise : un véhicule vu presque de face ne se réduit pas à un trait. */
export const MIN_PROFILE_SPREAD = 0.3;

/**
 * Décomposition d'une matrice 2x2 en rotation · échelles · rotation (SVD en forme fermée) :
 * M = R(outer) · diag(scaleX, scaleY) · R(inner). Phaser compose exactement ainsi deux conteneurs imbriqués.
 */
export function decomposeLinear(m00: number, m01: number, m10: number, m11: number) {
  const e = (m00 + m11) / 2;
  const f = (m00 - m11) / 2;
  const g = (m10 + m01) / 2;
  const h = (m10 - m01) / 2;
  const q = Math.hypot(e, h);
  const r = Math.hypot(f, g);
  const a1 = Math.atan2(g, f);
  const a2 = Math.atan2(h, e);
  return { outerRotation: (a2 + a1) / 2, scaleX: q + r, scaleY: q - r, innerRotation: (a2 - a1) / 2 };
}

/**
 * Profil projeté sur la chaussée : le flanc du véhicule est un plan vertical PARALLÈLE à l'axe de la voie.
 * En perspective à un point de fuite, les verticales restent verticales ; seul l'axe longitudinal du véhicule
 * suit la direction de la chaussée à l'écran. D'où un cisaillement, pas une rotation :
 *   avant du véhicule (X le long du profil) -> direction du trajet (cos cap, sin cap) ;
 *   verticale du profil (Y)                  -> verticale de l'écran.
 * `scale` est l'échelle de profondeur. Sur la chaussée principale (cap 0 ou π), on retrouve le profil à plat.
 */
export function profilePose(heading: number, scale = 1): ProfilePose {
  const west = Math.cos(heading) <= 0;
  // Côté de l'avant dans l'image affichée (le profil est retourné au besoin pour regarder vers l'ouest ou l'est).
  const front = west ? -1 : 1;
  const spread = Math.max(MIN_PROFILE_SPREAD, front * Math.cos(heading));
  const rise = front * Math.sin(heading);
  const matrix: [number, number, number, number] = [spread * scale, 0, rise * scale, scale];
  return { west, matrix, ...decomposeLinear(...matrix) };
}

/** Voies utiles aux tests et au rendu. */
export const MAIN_WEST_Y = ONCOMING_LANE_Y;
export const MAIN_EAST_Y = MAIN_LANE_Y;
export type { LaneId, Movement, TurnPlan };
