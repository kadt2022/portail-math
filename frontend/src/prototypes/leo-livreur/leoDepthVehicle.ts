// Rue des Jardins : une berline arrive du fond vers le spectateur, s'arrête au feu, puis tourne à droite pour entrer
// dans la voie ouest de l'avenue du Savoir (parallèle à celle de Léo, jamais dans celle de Léo). Pur (sans Phaser).
//
// Tout est calculé SUR LE SOL, puis projeté. Repère au sol : `u` (latéral, unités du monde, 0 sur l'axe de la caméra,
// négatif à gauche) et `z` (profondeur depuis le bord de la chaussée principale ; z < 0 sur la chaussée principale).
// Projection :
//   z >= 0 (rue en perspective) : k = D / (z + D) ; y = yFuite + (yBord - yFuite) · k ; x = xFuite + u · k
//   z <  0 (chaussée principale, dessinée de profil, sans perspective) : k = 1 ; y = yBord - z · pente ; x = xFuite + u
// La pente est celle de la perspective au bord (dérivée continue) : pas de cassure au raccord.
//
// Une seule échelle physique, celle du trafic de l'avenue du Savoir : la taille affichée vaut (échelle de la vue) · k.
// La vitesse est en unités du monde par seconde le long du trajet au sol (ds = vitesse · dt), jamais liée à l'échelle.
// Aucune image n'est tournée ni cisaillée : on affiche, parmi les 7 vues fournies de la MÊME berline (0° à 90°),
// celle qui correspond à l'angle entre l'axe de la voiture et la direction de la caméra.

import { avenueGeometry } from "./leoLanes";
import { ONCOMING_LANE_Y } from "./leoGeometry";
import { LATERAL_ACCELERATION } from "./leoIntersection";
import { followSpeed, type ExtraObstacle, type TrafficManager } from "./leoTraffic";
import { shouldStopForLight, type LightState } from "./leoTrafficLight";
import { driverFactor, speedLimitAt } from "./leoSpeedLimits";
import { CROSS_SPECS, LEO_LENGTH_PX, rollAngle, vehicleDisplay, type VehicleSpec } from "./leoVehicleCatalog";

// ---------------------------------------------------------------------------------------------
// Planche des 7 vues (assets/leo-cross-sedan-turn-v1.webp, 2000 x 667, fond transparent)
// ---------------------------------------------------------------------------------------------

export const TURN_SHEET = { key: "leo-cross-sedan-turn", width: 2000, height: 667 } as const;

export interface SheetView {
  /** Angle de la vue : 0 = face, 90 = profil tourné vers la gauche. */
  angle: number;
  /** Boîte opaque mesurée dans la planche : [x0, y0, x1, y1]. */
  box: readonly [number, number, number, number];
  /** Contact au sol de la roue avant gauche de la voiture (la roue la plus proche du spectateur). */
  contact: readonly [number, number];
  /** Diamètre vertical mesuré de la jante de cette roue (px), absent de face (jante invisible). */
  rim: number | null;
}

/** Mesures faites sur la planche : boîtes opaques, contact au sol de la roue avant gauche, jante. */
export const SHEET_VIEWS: readonly SheetView[] = [
  { angle: 0, box: [9, 214, 234, 406], contact: [208, 406], rim: null },
  { angle: 15, box: [244, 216, 492, 402], contact: [436.1, 398], rim: 57 },
  { angle: 30, box: [506, 217, 773, 401], contact: [686.2, 396], rim: 58 },
  { angle: 45, box: [779, 217, 1047, 399], contact: [940.8, 394], rim: 57 },
  { angle: 60, box: [1056, 221, 1333, 393], contact: [1188.5, 391], rim: 54 },
  { angle: 75, box: [1337, 228, 1631, 385], contact: [1425.8, 384], rim: 50 },
  { angle: 90, box: [1641, 236, 1998, 381], contact: [1702.6, 381], rim: 49 },
];

/** Découpe d'une vue dans la planche (petite marge transparente autour de la boîte). */
export function sheetCrop(view: SheetView) {
  const x0 = Math.max(0, view.box[0] - 2);
  const y0 = Math.max(0, view.box[1] - 2);
  const x1 = Math.min(TURN_SHEET.width - 1, view.box[2] + 2);
  const y1 = Math.min(TURN_SHEET.height - 1, view.box[3] + 2);
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

export const turnTextureKey = (angle: number) => `${TURN_SHEET.key}-${angle}`;
export const turnWheelTextureKey = (angle: number, index: number) => `${TURN_SHEET.key}-${angle}-wheel-${index}`;

/** Jante visible d'une roue dans une vue : ellipse (centre et demi-axes, px de la planche). */
export interface SheetWheel {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Fraction de la jante mesurée qui tourne (comme les autres véhicules : le pneu reste fixe, la jante tourne). */
const RIM_DISC_RATIO = 0.94;
const rim = (cx: number, cy: number, width: number, height: number): SheetWheel => ({
  cx, cy, rx: (width / 2) * RIM_DISC_RATIO, ry: (height / 2) * RIM_DISC_RATIO,
});

/**
 * Jantes visibles mesurées sur la planche (zones gris argent des roues). De face et à 15°, la jante est cachée ou
 * réduite à un trait : rien à faire tourner. À 90°, les disques sont exactement ceux du trafic ordinaire (même
 * rayon que `SEDAN_TURN_PROFILE`) : au relais, la roue continue de tourner sans saut.
 */
export const SHEET_WHEELS: Record<number, readonly SheetWheel[]> = {
  0: [],
  15: [],
  30: [rim(686.2, 359.9, 24, 58)],
  45: [rim(940.8, 357.6, 30, 57)],
  60: [rim(1188.5, 354, 37, 54)],
  75: [rim(1425.8, 349.7, 40, 50), rim(1594.4, 333.7, 27, 45)],
  90: [
    { cx: 1702.6, cy: 347.9, rx: 23, ry: 23 },
    { cx: 1926.9, cy: 347.8, rx: 23, ry: 23 },
  ],
};

/**
 * Calibrage physique des vues. Les dessins n'ont pas tous la même taille en pixels (192 px de haut de face, 145 px
 * de profil). On égalise la hauteur toit -> sol de la carrosserie, une grandeur physique qui ne dépend pas de
 * l'orientation de la voiture et que l'œil perçoit comme « la taille » de la voiture : d'une vue à l'autre, elle est
 * identique, et pendant le virage la taille affichée ne peut que rester égale ou grandir (perspective), jamais
 * diminuer. Le diamètre des roues, contrôlé par les tests, reste cohérent à quelques pour cent près (écarts du dessin).
 */
export function relativeScale(view: SheetView): number {
  const profile = SHEET_VIEWS[SHEET_VIEWS.length - 1];
  const height = (v: SheetView) => v.box[3] - v.box[1];
  return height(profile) / height(view);
}

// ---------------------------------------------------------------------------------------------
// Profil (vue 90°) : c'est lui que reprend le trafic de l'avenue du Savoir
// ---------------------------------------------------------------------------------------------

const OLD_SEDAN = CROSS_SPECS.find((spec) => spec.textureKey === "leo-cross-sedan") as VehicleSpec;
/** Rayon du pneu (unités du monde) d'une berline de l'avenue du Savoir : la référence de taille physique. */
export const REFERENCE_TYRE_RADIUS = OLD_SEDAN.wheels[0][2] * vehicleDisplay(OLD_SEDAN).scale;

const PROFILE_VIEW = SHEET_VIEWS[SHEET_VIEWS.length - 1];
const PROFILE_CROP = sheetCrop(PROFILE_VIEW);
/** Roues du profil mesurées dans la planche : centre (x, y) et rayon du pneu (sol - centre). */
const PROFILE_WHEELS: ReadonlyArray<readonly [number, number, number]> = [
  [1702.6, 347.9, 33.1],
  [1926.9, 347.8, 33.2],
];
/** Échelle physique de la vue de profil : son pneu a le rayon de celui des berlines de l'avenue du Savoir. */
export const PROFILE_WORLD_SCALE = REFERENCE_TYRE_RADIUS / PROFILE_WHEELS[0][2];

export const SEDAN_TURN_PROFILE: VehicleSpec = {
  kind: "black-sedan",
  label: "Berline noire (rue des Jardins)",
  textureKey: turnTextureKey(90),
  source: { width: PROFILE_CROP.width, height: PROFILE_CROP.height },
  bbox: [
    PROFILE_VIEW.box[0] - PROFILE_CROP.x,
    PROFILE_VIEW.box[1] - PROFILE_CROP.y,
    PROFILE_VIEW.box[2] - PROFILE_CROP.x,
    PROFILE_VIEW.box[3] - PROFILE_CROP.y,
  ],
  ground: PROFILE_VIEW.contact[1] - PROFILE_CROP.y,
  wheels: [
    [PROFILE_WHEELS[0][0] - PROFILE_CROP.x, PROFILE_WHEELS[0][1] - PROFILE_CROP.y, PROFILE_WHEELS[0][2]],
    [PROFILE_WHEELS[1][0] - PROFILE_CROP.x, PROFILE_WHEELS[1][1] - PROFILE_CROP.y, PROFILE_WHEELS[1][2]],
  ],
  lengthRatio: (PROFILE_WORLD_SCALE * (PROFILE_VIEW.box[2] - PROFILE_VIEW.box[0] + 1)) / LEO_LENGTH_PX,
  depth: 36,
  facing: "left",
  weight: 0,
  profiles: ["normal"],
};

const profileDisplay = vehicleDisplay(SEDAN_TURN_PROFILE);
/** Distance au sol entre l'essieu avant et le centre de la voiture (la roue avant est à gauche du profil). */
const FRONT_AXLE_TO_CENTER = -profileDisplay.wheels[0].x;

/** Échelle (unités du monde par pixel de la planche) d'une vue, à la profondeur de la chaussée (k = 1). */
export function viewWorldScale(view: SheetView) {
  return PROFILE_WORLD_SCALE * relativeScale(view);
}

// ---------------------------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------------------------

/** Pente de la vue : rapport entre la descente à l'écran et la profondeur au bord de la chaussée. */
const VIEW_DEPRESSION = 0.5;
/**
 * Demi-voie (unités du monde) entre l'axe de la voiture et ses roues gauches. Sur la chaussée principale, elle donne
 * exactement le décalage que le trafic ordinaire utilise entre l'axe de la voie et le contact des pneus (profondeur / 2).
 */
export const HALF_TRACK = SEDAN_TURN_PROFILE.depth / 2 / VIEW_DEPRESSION;
/** Facteur de perspective à l'apparition, loin au fond de la rue. */
export const SPAWN_PERSPECTIVE = 0.07;
/** Marge avant la ligne d'arrêt (unités du monde) : l'avant s'immobilise juste avant la ligne. */
export const STOP_MARGIN = 4;
const COMFORT_BRAKING = 285;
/** Rayon du virage au sol (unités du monde). */
export const TURN_RADIUS = 200;
/** Longueur de la ligne droite de sortie dans la voie ouest. */
const EXIT_LENGTH = 700;
/** Distance parcourue dans la voie ouest avant le relais au trafic ordinaire. */
export const HANDOFF_AFTER = 20;
/** Durée du fondu entre deux vues voisines (s). */
export const VIEW_FADE = 0.12;

// ---------------------------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------------------------

export interface DepthProjection {
  vanishX: number;
  vanishY: number;
  edgeY: number;
  /** Profondeur de référence D du modèle sténopé. */
  depth: number;
  perspective: (z: number) => number;
  zAtY: (y: number) => number;
  /** Projection d'un point du sol. */
  project: (u: number, z: number) => { x: number; y: number; k: number };
  laneU: number;
  laneZ: number;
  stopZ: number;
  spawnZ: number;
}

let projection: DepthProjection | null = null;

export function depthProjection(): DepthProjection {
  if (projection) return projection;
  const avenue = avenueGeometry();
  const vanishY = avenue.vanishY;
  const vanishX = avenue.southLaneX(vanishY);
  const edgeY = avenue.edgeY;
  const depth = (edgeY - vanishY) / VIEW_DEPRESSION;
  const perspective = (z: number) => (z >= 0 ? depth / (z + depth) : 1);
  const zAtY = (y: number) => (y <= edgeY ? depth * ((edgeY - vanishY) / (y - vanishY) - 1) : -(y - edgeY) / VIEW_DEPRESSION);
  const project = (u: number, z: number) => {
    if (z < 0) return { x: vanishX + u, y: edgeY - z * VIEW_DEPRESSION, k: 1 };
    const k = perspective(z);
    return { x: vanishX + u * k, y: vanishY + (edgeY - vanishY) * k, k };
  };
  projection = {
    vanishX,
    vanishY,
    edgeY,
    depth,
    perspective,
    zAtY,
    project,
    laneU: avenue.southLaneX(edgeY) - vanishX,
    laneZ: -(ONCOMING_LANE_Y - edgeY) / VIEW_DEPRESSION,
    stopZ: zAtY(avenue.stopY),
    spawnZ: depth * (1 / SPAWN_PERSPECTIVE - 1),
  };
  return projection;
}

// ---------------------------------------------------------------------------------------------
// Trajet au sol : approche rectiligne, quart de cercle, sortie dans la voie ouest
// ---------------------------------------------------------------------------------------------

export interface GroundPoint {
  u: number;
  z: number;
  /** Cap au sol : 0 = vers le spectateur, π/2 = vers l'ouest. */
  heading: number;
}

export interface GroundPath {
  approachLength: number;
  arcLength: number;
  length: number;
  turnStartZ: number;
  /** Abscisse curviligne de l'essieu avant au passage de la ligne d'arrêt. */
  stopS: number;
  at: (s: number) => GroundPoint;
  /** Vitesse maximale (adhérence latérale dans le virage, freinage confortable avant lui). */
  speedCap: (s: number) => number;
}

let groundPath: GroundPath | null = null;

export function depthPath(): GroundPath {
  if (groundPath) return groundPath;
  const p = depthProjection();
  const turnStartZ = p.laneZ + TURN_RADIUS;
  const approachLength = p.spawnZ - turnStartZ;
  const arcLength = (Math.PI / 2) * TURN_RADIUS;
  const centerU = p.laneU - TURN_RADIUS;
  const turnSpeed = Math.sqrt(LATERAL_ACCELERATION * TURN_RADIUS);
  const at = (s: number): GroundPoint => {
    if (s <= approachLength) return { u: p.laneU, z: p.spawnZ - s, heading: 0 };
    if (s <= approachLength + arcLength) {
      const theta = (s - approachLength) / TURN_RADIUS;
      return { u: centerU + TURN_RADIUS * Math.cos(theta), z: turnStartZ - TURN_RADIUS * Math.sin(theta), heading: theta };
    }
    return { u: centerU - (s - approachLength - arcLength), z: p.laneZ, heading: Math.PI / 2 };
  };
  const speedCap = (s: number) => {
    if (s >= approachLength && s <= approachLength + arcLength) return turnSpeed;
    if (s > approachLength + arcLength) return Infinity;
    return Math.sqrt(turnSpeed * turnSpeed + 2 * COMFORT_BRAKING * (approachLength - s));
  };
  groundPath = {
    approachLength,
    arcLength,
    length: approachLength + arcLength + EXIT_LENGTH,
    turnStartZ,
    stopS: p.spawnZ - (p.stopZ + STOP_MARGIN),
    at,
    speedCap,
  };
  return groundPath;
}

/** Avant de la voiture au sol pour un cap donné. */
function forward(heading: number) {
  return { u: -Math.sin(heading), z: -Math.cos(heading) };
}

/** Gauche de la voiture au sol (de face, sa gauche est à droite de l'écran). */
function left(heading: number) {
  const f = forward(heading);
  return { u: -f.z, z: f.u };
}

// ---------------------------------------------------------------------------------------------
// Choix de la vue selon l'angle
// ---------------------------------------------------------------------------------------------

/**
 * Angle (degrés) entre l'axe de la voiture et la direction voiture -> caméra. 0° : on voit la face ; 90° : le profil.
 * La caméra du modèle sténopé est au sol en (0, -D).
 */
export function viewAngle(point: GroundPoint) {
  const p = depthProjection();
  const f = forward(point.heading);
  const toCamU = -point.u;
  const toCamZ = -p.depth - point.z;
  const cos = (f.u * toCamU + f.z * toCamZ) / Math.hypot(toCamU, toCamZ);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/** Vue la plus proche de l'angle (au-delà de 90°, la caméra est derrière le flanc : on garde le profil). */
export function viewForAngle(angle: number): SheetView {
  const clamped = Math.max(0, Math.min(90, angle));
  const index = Math.round(clamped / 15);
  return SHEET_VIEWS[index];
}

// ---------------------------------------------------------------------------------------------
// Véhicule
// ---------------------------------------------------------------------------------------------

export interface DepthVehicle {
  active: boolean;
  /** Abscisse curviligne de l'essieu avant le long du trajet au sol. */
  s: number;
  speed: number;
  cruise: number;
  alpha: number;
  /** Progression du fondu d'apparition (0 à 1). */
  appear: number;
  committed: boolean;
  /** Angle de la vue affichée et de la précédente (fondu). */
  view: number;
  previousView: number | null;
  mix: number;
  /** Distance parcourue au sol (unités du monde) : elle fait tourner les roues. */
  rolled: number;
}

/** Roue tournante d'une couche : disque découpé dans la jante, posé sur l'ellipse de la vue. */
export interface DepthWheel {
  texture: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  /** Rotation (rad) : distance / rayon, sens antihoraire car la voiture va vers la gauche de l'écran. */
  rotation: number;
}

export interface DepthLayer {
  angle: number;
  texture: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  alpha: number;
  wheels: DepthWheel[];
}

export interface DepthPose {
  visible: boolean;
  layers: DepthLayer[];
  depthOrder: number;
}

export interface DepthContext {
  side: LightState;
  /** Trafic de l'avenue du Savoir : voie de sortie libre, relais. Absent dans certains tests. */
  main?: TrafficManager;
}

export class DepthTraffic {
  readonly vehicle: DepthVehicle = {
    active: false, s: 0, speed: 0, cruise: 0, alpha: 0, appear: 0, committed: false, view: 0, previousView: null, mix: 1, rolled: 0,
  };
  private respawnTimer = 1;

  constructor(private readonly random: () => number = Math.random) {}

  reset() {
    this.vehicle.active = false;
    this.respawnTimer = 1;
  }

  /** Milieu de l'essieu avant au sol (sert à la ligne d'arrêt). */
  front(): GroundPoint {
    return depthPath().at(this.vehicle.s);
  }

  /** Centre de la voiture au sol. */
  center(): GroundPoint {
    const point = this.front();
    const f = forward(point.heading);
    return { u: point.u - f.u * FRONT_AXLE_TO_CENTER, z: point.z - f.z * FRONT_AXLE_TO_CENTER, heading: point.heading };
  }

  /** Contact au sol de la roue avant gauche : le point d'ancrage de toutes les vues. */
  contact(): GroundPoint {
    const point = this.front();
    const l = left(point.heading);
    return { u: point.u + l.u * HALF_TRACK, z: point.z + l.z * HALF_TRACK, heading: point.heading };
  }

  /** Engagée dans le carrefour : le contrôleur prolonge le rouge intégral tant qu'elle n'en est pas sortie. */
  busy() {
    return this.vehicle.active && this.vehicle.committed;
  }

  /** Sur la chaussée principale, la voiture est un obstacle pour le trafic de la voie ouest. */
  extras(): ExtraObstacle[] {
    const v = this.vehicle;
    if (!v.active || this.front().z >= 0) return [];
    const center = this.center();
    const x = depthProjection().project(center.u, center.z).x;
    return [{ lane: "oncoming", x, length: profileDisplay.footprintLength, speed: v.speed * Math.sin(center.heading) }];
  }

  /** Fenêtre de la voie ouest à garder libre avant de s'engager : de la sortie du virage à la rue. */
  exitWindow() {
    const p = depthProjection();
    const endX = p.vanishX + p.laneU - TURN_RADIUS;
    return { minX: endX - profileDisplay.footprintLength - 260, maxX: p.vanishX + p.laneU + 160 };
  }

  update(seconds: number, context: DepthContext) {
    const dt = Math.min(Math.max(seconds, 0), 0.05);
    const path = depthPath();
    const v = this.vehicle;
    if (!v.active) {
      this.respawnTimer -= dt;
      if (this.respawnTimer > 0) return;
      // Conducteur « normal » à la limite de la zone de la rue des Jardins (la ville).
      v.cruise = driverFactor("normal", this.random) * speedLimitAt(depthProjection().vanishX);
      v.speed = v.cruise * 0.8;
      v.s = 0;
      v.alpha = 0;
      v.appear = 0;
      v.committed = false;
      v.view = viewForAngle(viewAngle(this.center())).angle;
      v.previousView = null;
      v.mix = 1;
      v.rolled = 0;
      v.active = true;
      return;
    }

    // Feu et voie de sortie : décidés avant la ligne ; une fois engagée, la voiture termine son virage.
    const distance = path.stopS - v.s;
    let mustStop = false;
    if (!v.committed) {
      const window = this.exitWindow();
      const exitClear = !context.main || context.main.laneClear("oncoming", window.minX, window.maxX);
      mustStop = distance >= -0.5 && (shouldStopForLight(context.side, distance, v.speed) || (!exitClear && distance >= 0));
    }
    const desired = Math.min(v.cruise, path.speedCap(v.s));
    let leader: { gap: number; speed: number; standstill?: number } | null = mustStop
      ? { gap: Math.max(distance, 0) + 2, speed: 0, standstill: 2 }
      : null;
    if (!leader && context.main && this.front().z < 0) {
      const center = this.center();
      const ahead = context.main.nearestAhead("oncoming", depthProjection().project(center.u, center.z).x, profileDisplay.footprintLength);
      if (ahead) leader = { gap: ahead.gap, speed: ahead.speed };
    }
    let speed = followSpeed(v.speed, desired, leader, dt);
    if (mustStop) {
      // Freinage confortable qui s'annule exactement à la ligne : ni reptation, ni dépassement.
      speed = distance <= 0.5 ? 0 : Math.min(speed, Math.sqrt(2 * COMFORT_BRAKING * distance) + 4);
    }
    let travelled = speed * dt;
    if (mustStop) travelled = Math.min(travelled, Math.max(0, distance));
    v.speed = speed;
    v.s += travelled;
    v.rolled += travelled;
    if (!v.committed && v.s > path.stopS) v.committed = true;
    v.appear = Math.min(1, v.appear + dt * 3);
    v.alpha = v.appear;

    // Vue : celle de l'angle courant, avec un fondu court vers la vue voisine.
    const next = viewForAngle(viewAngle(this.center())).angle;
    if (next !== v.view) {
      v.previousView = v.view;
      v.view = next;
      v.mix = 0;
    }
    v.mix = Math.min(1, v.mix + dt / VIEW_FADE);
    if (v.mix >= 1) v.previousView = null;

    // Relais : dans la voie ouest, le trafic ordinaire reprend la voiture (même image, position, taille, vitesse).
    if (v.s >= path.approachLength + path.arcLength + HANDOFF_AFTER) {
      let handed = !context.main;
      if (context.main) {
        handed = context.main.adopt({
          lane: "oncoming",
          spec: SEDAN_TURN_PROFILE,
          profile: "normal",
          x: this.handoffX(),
          speed: v.speed,
          cruise: v.cruise,
          // Même angle de roue que juste avant : les jantes continuent de tourner sans saut.
          wheelAngle: this.wheelRotation(),
        }) !== null;
      }
      if (handed || v.s >= path.length) {
        v.active = false;
        this.respawnTimer = 4 + this.random() * 4;
      }
    }
  }

  /**
   * Rotation des roues : distance parcourue / rayon de roulement, comme pour tout le trafic. La voiture roule vers la
   * gauche de l'écran (elle vient vers nous puis tourne vers l'ouest) : sens antihoraire, angle négatif.
   */
  wheelRotation() {
    return rollAngle(-this.vehicle.rolled, profileDisplay.wheels[0].rollRadius);
  }

  /** Abscisse du centre de la voiture sur la chaussée principale : la position reprise par le trafic ordinaire. */
  handoffX() {
    const center = this.center();
    return depthProjection().project(center.u, center.z).x;
  }

  /** Pose à l'écran : uniquement les vues fournies, posées sur le contact au sol de la roue avant gauche. */
  pose(): DepthPose {
    const v = this.vehicle;
    if (!v.active) return { visible: false, layers: [], depthOrder: 0 };
    const layers: DepthLayer[] = [this.layer(v.view, v.alpha * (v.previousView !== null ? v.mix : 1))];
    if (v.previousView !== null) layers.unshift(this.layer(v.previousView, v.alpha * (1 - v.mix)));
    const anchor = this.anchor();
    return { visible: true, layers, depthOrder: 6 + anchor.y / 1000 };
  }

  private anchor() {
    const contact = this.contact();
    return depthProjection().project(contact.u, contact.z);
  }

  private layer(angle: number, alpha: number): DepthLayer {
    const view = SHEET_VIEWS.find((candidate) => candidate.angle === angle) as SheetView;
    const crop = sheetCrop(view);
    const anchor = this.anchor();
    const scale = viewWorldScale(view) * anchor.k;
    return {
      angle,
      texture: turnTextureKey(angle),
      x: anchor.x,
      y: anchor.y,
      width: crop.width * scale,
      height: crop.height * scale,
      originX: (view.contact[0] - crop.x) / crop.width,
      originY: (view.contact[1] - crop.y) / crop.height,
      alpha,
      wheels: (SHEET_WHEELS[angle] ?? []).map((wheel, index) => ({
        texture: turnWheelTextureKey(angle, index),
        x: anchor.x + (wheel.cx - view.contact[0]) * scale,
        y: anchor.y + (wheel.cy - view.contact[1]) * scale,
        radiusX: wheel.rx * scale,
        radiusY: wheel.ry * scale,
        rotation: this.wheelRotation(),
      })),
    };
  }
}
