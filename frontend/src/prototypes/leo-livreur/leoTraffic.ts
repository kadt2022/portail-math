// Gestionnaire de trafic de Léo : pur (sans Phaser), donc testable.
//
// Il possède un pool fixe de véhicules : un véhicule sorti de la zone visible
// redevient disponible et réapparaît plus tard (autre type, autre vitesse),
// sans création ni destruction d'objets. Deux sens de circulation à droite :
// la voie « same » (celle de Léo, vers l'est) et la voie « oncoming » (vers l'ouest).

import { MAIN_LANE_Y, MAIN_ROAD_X_MIN, ONCOMING_LANE_Y, vehicleCorners, type VehiclePose } from "./leoGeometry";
import { anticipatedLimit, driverFactor, DRIVER_FACTORS } from "./leoSpeedLimits";
import { shouldStopForLight, type LightState } from "./leoTrafficLight";
import {
  needsMirror,
  rollAngle,
  TRAFFIC_SPECS,
  vehicleDisplay,
  wheelOffset,
  type SpeedProfile,
  type VehicleSpec,
} from "./leoVehicleCatalog";

export type TrafficLane = "same" | "oncoming";

/** Distance pare-chocs à pare-chocs en dessous de laquelle on suit le véhicule de devant. */
export const MIN_FOLLOW_GAP = 70;
/** Distance à laquelle on commence à s'aligner sur le véhicule de devant. */
export const FOLLOW_ZONE = 260;
/** Écart minimal exigé à l'apparition, pare-chocs à pare-chocs. */
export const SPAWN_CLEARANCE = 200;
/** Les véhicules apparaissent et disparaissent hors de la zone visible, à cette distance. */
/** Portée, marge et gain de la limite de vitesse de Léo derrière un véhicule. */
export const LEO_CAP_RANGE = 520;
export const LEO_CAP_MARGIN = 40;
export const LEO_CAP_GAIN = 1.4;
export const OFFSCREEN_MARGIN = 480;
/** Écart minimal exigé pour recevoir un véhicule sorti du carrefour. */
export const MIN_ADOPT_GAP = 30;
export const RECYCLE_MARGIN = 620;
/** Espacement moyen visé entre deux véhicules d'une même voie. */
export const TARGET_SPACING = 400;
/** Modèle de suivi (IDM) : accélération confortable, freinage confortable, temps inter-véhicules. */
const IDM_ACCELERATION = 165;
const IDM_BRAKING = 285;
const IDM_HEADWAY = 1.1;
/** Freinage d'urgence maximal (jamais atteint en conduite normale). */
export const MAX_BRAKING = 630;

export function laneY(lane: TrafficLane) {
  return lane === "same" ? MAIN_LANE_Y : ONCOMING_LANE_Y;
}

/**
 * Pose à l écran d une roue du trafic. Le sens de rotation vient UNIQUEMENT du déplacement réel : wheelAngle
 * croît quand le véhicule avance vers l est (sens horaire à l écran, rotation positive dans Phaser), décroît vers
 * l ouest (sens antihoraire), reste fixe à l arrêt, et varie de distance / rayon. L orientation du sprite (flipX)
 * ne fait que miroiter la texture du disque : elle ne change jamais le sens de rotation à l écran.
 */
export function trafficWheelPose(vehicle: Pick<TrafficVehicle, "spec" | "lane" | "x" | "wheelAngle">, wheelIndex: number) {
  const flipped = needsMirror(vehicle.spec, vehicle.lane === "same");
  const offset = wheelOffset(vehicleDisplay(vehicle.spec), wheelIndex, flipped);
  return { x: vehicle.x + offset.x, y: laneY(vehicle.lane) + offset.y, rotation: vehicle.wheelAngle, flipX: flipped };
}

/** +1 : vers l'est (même sens que Léo au départ), -1 : vers l'ouest. */
export function laneDirection(lane: TrafficLane) {
  return lane === "same" ? 1 : -1;
}

export interface TrafficVehicle {
  id: number;
  active: boolean;
  lane: TrafficLane;
  spec: VehicleSpec;
  profile: SpeedProfile;
  /** Centre de l'empreinte (le long de la route). */
  x: number;
  speed: number;
  /** Vitesse souhaitée (px/s). Recalculée à chaque image selon la zone quand `speedFactor` > 0. */
  cruise: number;
  /**
   * Fraction de la limite de la zone visée par ce conducteur (0 : vitesse souhaitée fixe, imposée de l'extérieur).
   */
  speedFactor?: number;
  /** Angle de roue, positif = rotation horaire à l'écran (roulage vers l'est). */
  wheelAngle: number;
  length: number;
  depth: number;
  rollRadius: number;
}

export interface LeoBody {
  pose: VehiclePose;
  speed: number;
}

/** Ligne d'arrêt d'un feu pour les véhicules qui roulent dans le sens `direction` (+1 est, -1 ouest). */
export interface SignalStop {
  lineX: number;
  direction: 1 | -1;
  state: LightState;
}

export interface TrafficContext {
  viewMinX: number;
  viewMaxX: number;
  leo?: LeoBody;
  /** Feux de circulation : chaque véhicule décide seul s'il doit s'arrêter, aucun ordre global. */
  signals?: readonly SignalStop[];
  /** Véhicules extérieurs au pool (virage du carrefour) déjà engagés sur une voie principale. */
  extras?: readonly ExtraObstacle[];
}

/** Véhicule engagé sur une voie principale mais encore géré par le carrefour. */
export interface ExtraObstacle {
  lane: TrafficLane;
  x: number;
  length: number;
  speed: number;
}

export interface TrafficOptions {
  /** Nombre maximal de véhicules du pool (le plafond réel s'ajuste dynamiquement). */
  capacity: number;
  random?: () => number;
  specs?: readonly VehicleSpec[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function leoBounds(pose: VehiclePose): Bounds {
  const corners = vehicleCorners(pose);
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function vehicleBounds(vehicle: Pick<TrafficVehicle, "x" | "length" | "depth" | "lane">): Bounds {
  const y = laneY(vehicle.lane);
  return {
    minX: vehicle.x - vehicle.length / 2,
    maxX: vehicle.x + vehicle.length / 2,
    minY: y - vehicle.depth / 2,
    maxY: y + vehicle.depth / 2,
  };
}

/** Écart entre deux véhicules d'une même voie, pare-chocs à pare-chocs (négatif = superposés). */
export function bumperGap(a: Pick<TrafficVehicle, "x" | "length">, b: Pick<TrafficVehicle, "x" | "length">) {
  return Math.abs(a.x - b.x) - (a.length + b.length) / 2;
}

function pointInPose(pose: VehiclePose, length: number, depth: number, x: number, y: number) {
  const dx = x - pose.x;
  const dy = y - pose.y;
  const cos = Math.cos(pose.heading);
  const sin = Math.sin(pose.heading);
  const along = dx * cos + dy * sin;
  const across = -dx * sin + dy * cos;
  return Math.abs(along) <= length / 2 && Math.abs(across) <= depth / 2;
}

/**
 * Vitesse suivante d'un véhicule : modèle de suivi IDM. L'accélération est une fonction continue de l'écart et
 * de la vitesse relative : le freinage est progressif, monotone (jamais de rebond), et propre à chaque véhicule.
 * Rien ne lit la commande Freiner de Léo ; Léo n'intervient que comme véhicule physiquement présent devant.
 */
export function followSpeed(v: number, cruise: number, leader: { gap: number; speed: number; standstill?: number } | null, dt: number) {
  // Véhicule immobilisé (cruise 0) : il reste à l'arrêt.
  if (cruise <= 0) return 0;
  let acceleration = IDM_ACCELERATION * (1 - (v / cruise) ** 4);
  if (leader) {
    const gap = Math.max(leader.gap, 1);
    const approach = v - leader.speed;
    const standstill = leader.standstill ?? MIN_FOLLOW_GAP;
    const desired = standstill + Math.max(0, v * IDM_HEADWAY + (v * approach) / (2 * Math.sqrt(IDM_ACCELERATION * IDM_BRAKING)));
    acceleration -= IDM_ACCELERATION * (desired / gap) ** 2;
    // À l'arrêt derrière un véhicule immobile : on reste arrêté (pas de reptation asymptotique).
    if (leader.gap <= standstill * 1.15 && v < 6 && leader.speed < 6) return 0;
  }
  acceleration = Math.max(-MAX_BRAKING, acceleration);
  const next = Math.max(0, v + acceleration * dt);
  return next < 0.5 && acceleration < 0 ? 0 : next;
}

export class TrafficManager {
  readonly vehicles: TrafficVehicle[];
  private readonly random: () => number;
  private readonly specs: readonly VehicleSpec[];
  private readonly spawnTimers: Record<TrafficLane, number> = { same: 0, oncoming: 0 };
  private readonly lastKind: Record<TrafficLane, string> = { same: "", oncoming: "" };
  /** Plafond de véhicules par voie ; ajusté par la mesure de fluidité. */
  laneCap: number;

  constructor(options: TrafficOptions) {
    this.random = options.random ?? Math.random;
    this.specs = options.specs ?? TRAFFIC_SPECS;
    this.laneCap = Math.max(1, Math.floor(options.capacity / 2));
    this.vehicles = Array.from({ length: options.capacity }, (_, id) => {
      const spec = this.specs[id % this.specs.length];
      return {
        id,
        active: false,
        lane: (id % 2 === 0 ? "same" : "oncoming") as TrafficLane,
        spec,
        profile: "normal" as SpeedProfile,
        x: -10_000,
        speed: 0,
        cruise: 0,
        speedFactor: 0,
        wheelAngle: 0,
        length: 0,
        depth: 0,
        rollRadius: 1,
      };
    });
  }

  get activeCount() {
    return this.vehicles.reduce((count, vehicle) => count + (vehicle.active ? 1 : 0), 0);
  }

  /** Remet tout le pool au repos (nouvelle partie). */
  reset() {
    for (const vehicle of this.vehicles) vehicle.active = false;
    this.spawnTimers.same = 0;
    this.spawnTimers.oncoming = 0;
  }

  update(seconds: number, context: TrafficContext) {
    const dt = Math.min(Math.max(seconds, 0), 0.05);
    for (const lane of ["same", "oncoming"] as const) this.advanceLane(lane, dt, context);
    this.recycle(context);
    for (const lane of ["same", "oncoming"] as const) this.spawn(lane, dt, context);
  }

  /** Aucun véhicule du pool n'occupe-t-il la fenêtre [minX, maxX] de cette voie ? */
  laneClear(lane: TrafficLane, minX: number, maxX: number) {
    return !this.vehicles.some((vehicle) => vehicle.active && vehicle.lane === lane
      && vehicle.x + vehicle.length / 2 > minX && vehicle.x - vehicle.length / 2 < maxX);
  }

  /** Un véhicule du pool roule-t-il (au-dessus du seuil) dans la fenêtre, toutes voies confondues ? Zone de conflit du carrefour. */
  movingIn(minX: number, maxX: number, threshold = 15) {
    return this.vehicles.some((vehicle) => vehicle.active && vehicle.speed > threshold
      && vehicle.x + vehicle.length / 2 > minX && vehicle.x - vehicle.length / 2 < maxX);
  }

  /** Léo occupe-t-il la fenêtre d'une voie (son empreinte recoupe la voie et la fenêtre) ? */
  leoInWindow(leo: LeoBody | undefined, lane: TrafficLane, minX: number, maxX: number) {
    if (!leo) return false;
    const bounds = leoBounds(leo.pose);
    const y = laneY(lane);
    return bounds.maxY > y - 20 && bounds.minY < y + 20 && bounds.maxX > minX && bounds.minX < maxX;
  }

  /** Véhicule le plus proche devant `x` dans le sens de la voie, avec l'écart pare-chocs à pare-chocs. */
  nearestAhead(lane: TrafficLane, x: number, length: number) {
    const direction = laneDirection(lane);
    let best: { gap: number; speed: number } | null = null;
    for (const other of this.vehicles) {
      if (!other.active || other.lane !== lane) continue;
      const ahead = (other.x - x) * direction;
      if (ahead <= 0) continue;
      const gap = ahead - (other.length + length) / 2;
      if (!best || gap < best.gap) best = { gap, speed: other.speed };
    }
    return best;
  }

  /**
   * Reçoit un véhicule qui a fini son virage : il devient un véhicule ordinaire du trafic, à la même place, à la
   * même vitesse, avec les mêmes roues. Renvoie null s'il n'y a pas de place (il continue alors de rouler sous
   * la gestion du carrefour, sans disparaître).
   */
  adopt(init: {
    lane: TrafficLane; spec: VehicleSpec; profile: SpeedProfile; x: number; speed: number; cruise: number; wheelAngle: number;
    /** Fraction de la limite de zone ; par défaut le milieu de la plage du profil. */
    speedFactor?: number;
  }) {
    const free = this.vehicles.find((vehicle) => !vehicle.active && vehicle.lane === init.lane);
    if (!free) return null;
    const display = vehicleDisplay(init.spec);
    const candidate = { x: init.x, length: display.footprintLength };
    for (const other of this.laneVehicles(init.lane)) {
      if (bumperGap(candidate, other) < MIN_ADOPT_GAP) return null;
    }
    free.spec = init.spec;
    free.profile = init.profile;
    free.x = init.x;
    free.speed = init.speed;
    free.cruise = init.cruise;
    // Une fois dans le trafic, il adopte la limite des zones comme les autres conducteurs.
    // Une vitesse souhaitée nulle reste une consigne d’arrêt (véhicule immobilisé), indépendante de la zone.
    free.speedFactor = init.cruise <= 0 ? 0 : init.speedFactor ?? (DRIVER_FACTORS[init.profile][0] + DRIVER_FACTORS[init.profile][1]) / 2;
    free.wheelAngle = init.wheelAngle;
    free.length = display.footprintLength;
    free.depth = display.footprintDepth;
    free.rollRadius = display.wheels[0].rollRadius;
    free.active = true;
    this.lastKind[init.lane] = init.spec.kind;
    return free;
  }

  /** Un véhicule de trafic occupe-t-il la zone couverte par Léo ? Sert à lui interdire de le traverser. */
  blocksPose(pose: VehiclePose, length: number, depth: number) {
    const probe = leoBounds(pose);
    for (const vehicle of this.vehicles) {
      if (!vehicle.active) continue;
      const box = vehicleBounds(vehicle);
      if (box.maxX < probe.minX || box.minX > probe.maxX || box.maxY < probe.minY || box.minY > probe.maxY) continue;
      const boxCorners: Array<[number, number]> = [
        [box.minX, box.minY], [box.maxX, box.minY], [box.maxX, box.maxY], [box.minX, box.maxY],
        [(box.minX + box.maxX) / 2, box.minY], [(box.minX + box.maxX) / 2, box.maxY],
      ];
      if (boxCorners.some(([x, y]) => pointInPose(pose, length, depth, x, y))) return true;
      const samples: Array<[number, number]> = [[pose.x, pose.y], ...vehicleCorners(pose)];
      for (let index = 0; index < 4; index += 1) {
        const [ax, ay] = samples[1 + index];
        const [bx, by] = samples[1 + ((index + 1) % 4)];
        samples.push([(ax + bx) / 2, (ay + by) / 2]);
      }
      if (samples.some(([x, y]) => x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY)) return true;
    }
    return false;
  }

  /**
   * Vitesse maximale que Léo peut tenir sans rattraper un véhicule devant lui, dans son sens de
   * marche : route libre = pas de limite ; sinon la limite descend en douceur vers la vitesse
   * du véhicule de devant. Ne concerne que la vitesse : jamais le volant. En sortant de la
   * voie (pour doubler), le véhicule n'est plus devant lui et la limite disparaît.
   */
  leoSpeedCap(pose: VehiclePose) {
    const dirX = Math.cos(pose.heading);
    if (Math.abs(dirX) < 0.5) return Number.POSITIVE_INFINITY;
    const direction = dirX > 0 ? 1 : -1;
    const probe = leoBounds(pose);
    let cap = Number.POSITIVE_INFINITY;
    for (const vehicle of this.vehicles) {
      if (!vehicle.active) continue;
      const box = vehicleBounds(vehicle);
      if (box.maxY <= probe.minY || box.minY >= probe.maxY) continue;
      const gap = direction > 0 ? box.minX - probe.maxX : probe.minX - box.maxX;
      if (gap < -4 || gap > LEO_CAP_RANGE) continue;
      // Vitesse du véhicule de devant le long du sens de marche de Léo (négative s'il vient en face).
      const along = laneDirection(vehicle.lane) * direction * vehicle.speed;
      cap = Math.min(cap, Math.max(0, along + Math.max(0, gap - LEO_CAP_MARGIN) * LEO_CAP_GAIN));
    }
    return cap;
  }

  private laneVehicles(lane: TrafficLane) {
    return this.vehicles.filter((vehicle) => vehicle.active && vehicle.lane === lane);
  }

  /** Véhicule (ou Léo) situé juste devant, avec l'écart pare-chocs à pare-chocs et sa vitesse dans le sens de la voie. */
  private leaderOf(vehicle: TrafficVehicle, others: TrafficVehicle[], leo?: LeoBody, signals: readonly SignalStop[] = [], extras: readonly ExtraObstacle[] = []) {
    const direction = laneDirection(vehicle.lane);
    let best: { gap: number; speed: number } | null = null;
    for (const other of others) {
      if (other === vehicle) continue;
      const ahead = (other.x - vehicle.x) * direction;
      if (ahead <= 0) continue;
      const gap = ahead - (other.length + vehicle.length) / 2;
      if (!best || gap < best.gap) best = { gap, speed: other.speed };
    }
    for (const extra of extras) {
      if (extra.lane !== vehicle.lane) continue;
      const ahead = (extra.x - vehicle.x) * direction;
      if (ahead <= 0) continue;
      const gap = ahead - (extra.length + vehicle.length) / 2;
      if (!best || gap < best.gap) best = { gap, speed: extra.speed };
    }
    // Un feu qui impose l'arrêt agit comme un véhicule immobile posé sur la ligne d'arrêt, pour ce véhicule seul.
    for (const signal of signals) {
      if (signal.direction !== direction) continue;
      const front = vehicle.x + (direction * vehicle.length) / 2;
      const distance = direction * (signal.lineX - front);
      if (!shouldStopForLight(signal.state, distance, vehicle.speed)) continue;
      if (!best || distance < best.gap) best = { gap: distance, speed: 0 };
    }
    if (leo) {
      const bounds = leoBounds(leo.pose);
      const y = laneY(vehicle.lane);
      const overlapsLane = bounds.maxY > y - vehicle.depth / 2 && bounds.minY < y + vehicle.depth / 2;
      const leoCenter = (bounds.minX + bounds.maxX) / 2;
      if (overlapsLane && (leoCenter - vehicle.x) * direction > 0) {
        const gap = direction > 0
          ? bounds.minX - (vehicle.x + vehicle.length / 2)
          : vehicle.x - vehicle.length / 2 - bounds.maxX;
        const along = Math.max(0, direction * leo.speed * Math.cos(leo.pose.heading));
        if (!best || gap < best.gap) best = { gap, speed: along };
      }
    }
    return best;
  }

  private advanceLane(lane: TrafficLane, dt: number, context: TrafficContext) {
    const direction = laneDirection(lane);
    const members = this.laneVehicles(lane);
    // Du plus avancé au plus en retard : chaque suiveur voit son leader déjà déplacé.
    members.sort((a, b) => (b.x - a.x) * direction);
    for (const vehicle of members) {
      // Vitesse souhaitée : fraction de la limite de la zone, en anticipant une zone plus lente devant.
      if ((vehicle.speedFactor ?? 0) > 0) {
        const front = vehicle.x + (direction * vehicle.length) / 2;
        vehicle.cruise = (vehicle.speedFactor ?? 0) * anticipatedLimit(front, direction);
      }
      const leader = this.leaderOf(vehicle, members, context.leo, context.signals, context.extras);
      vehicle.speed = this.nextSpeed(vehicle, leader, dt);
      // La limite anticipée décroît doucement (1,2 m/s²) avant une zone plus lente : le conducteur la suit sans la
      // dépasser, et arrive ainsi à la nouvelle limite au panneau.
      if ((vehicle.speedFactor ?? 0) > 0) vehicle.speed = Math.min(vehicle.speed, vehicle.cruise);
      let travelled = vehicle.speed * dt;
      if (leader) {
        // Garantie dure, jamais atteinte en conduite normale : pas de superposition.
        const room = Math.max(0, leader.gap - 8);
        if (travelled > room) {
          travelled = room;
          vehicle.speed = Math.min(vehicle.speed, leader.speed);
        }
      }
      // Le trafic n'a aucune commande de marche arrière : une valeur de vitesse
      // négative ne doit jamais se transformer en déplacement à rebours.
      vehicle.speed = Math.max(0, vehicle.speed);
      vehicle.x += direction * travelled;
      vehicle.wheelAngle += rollAngle(direction * travelled, vehicle.rollRadius);
    }
  }

  private nextSpeed(vehicle: TrafficVehicle, leader: { gap: number; speed: number } | null, dt: number) {
    return followSpeed(vehicle.speed, vehicle.cruise, leader, dt);
  }

  private recycle(context: TrafficContext) {
    for (const vehicle of this.vehicles) {
      if (!vehicle.active) continue;
      const half = vehicle.length / 2;
      const gone = vehicle.x + half < context.viewMinX - RECYCLE_MARGIN
        || vehicle.x - half > context.viewMaxX + RECYCLE_MARGIN
        || vehicle.x + half < MAIN_ROAD_X_MIN - 200;
      if (gone) {
        vehicle.active = false;
        vehicle.speed = 0;
      }
    }
  }

  private desiredCount(context: TrafficContext) {
    const span = context.viewMaxX - context.viewMinX + 2 * OFFSCREEN_MARGIN;
    return Math.max(1, Math.min(this.laneCap, Math.round(span / TARGET_SPACING)));
  }

  private pickSpec(lane: TrafficLane) {
    const candidates = this.specs.filter((spec) => spec.kind !== this.lastKind[lane] || this.specs.length === 1);
    const total = candidates.reduce((sum, spec) => sum + spec.weight, 0);
    let roll = this.random() * total;
    for (const spec of candidates) {
      roll -= spec.weight;
      if (roll <= 0) return spec;
    }
    return candidates[candidates.length - 1];
  }

  private spawn(lane: TrafficLane, dt: number, context: TrafficContext) {
    this.spawnTimers[lane] -= dt;
    if (this.spawnTimers[lane] > 0) return;
    // Plafond à zéro : aucune apparition automatique (tests ciblés, reprise de partie).
    if (this.laneCap <= 0) return;
    const members = this.laneVehicles(lane);
    if (members.length >= this.desiredCount(context)) return;
    const free = this.vehicles.find((vehicle) => !vehicle.active && vehicle.lane === lane);
    if (!free) return;

    const spec = this.pickSpec(lane);
    const display = vehicleDisplay(spec);
    const length = display.footprintLength;
    // Opposés : arrivent par la droite de l'écran. Même sens : surtout par derrière,
    // parfois par devant, toujours hors de la vue, jamais directement devant Léo.
    const preferAhead = lane === "oncoming" || this.random() < 0.35;
    const jitter = this.random() * 260;
    const aheadX = context.viewMaxX + OFFSCREEN_MARGIN + length / 2 + jitter;
    const behindX = context.viewMinX - OFFSCREEN_MARGIN - length / 2 - jitter;
    const onRoad = (x: number) => x - length / 2 >= MAIN_ROAD_X_MIN;
    this.spawnTimers[lane] = 0.3 + this.random() * 0.9;
    // Les bouts de la route ne produisent rien ; une voie sans accès d'un côté utilise l'autre.
    const preferred = preferAhead ? aheadX : behindX;
    const fallback = lane === "same" ? (preferAhead ? behindX : aheadX) : null;
    const x = onRoad(preferred) ? preferred : fallback !== null && onRoad(fallback) ? fallback : null;
    if (x === null) return;
    const candidate = { x, length };
    if (members.some((other) => bumperGap(candidate, other) < SPAWN_CLEARANCE)) return;

    const profile = spec.profiles[Math.floor(this.random() * spec.profiles.length)] ?? "normal";
    free.spec = spec;
    free.profile = profile;
    // Vitesse selon la zone d'apparition et le tempérament du conducteur (voir leoSpeedLimits).
    free.speedFactor = driverFactor(profile, this.random);
    free.cruise = free.speedFactor * anticipatedLimit(x + (laneDirection(lane) * length) / 2, laneDirection(lane));
    free.speed = free.cruise;
    free.x = x;
    free.length = length;
    free.depth = display.footprintDepth;
    free.rollRadius = display.wheels[0].rollRadius;
    free.wheelAngle = 0;
    free.active = true;
    this.lastKind[lane] = spec.kind;
  }
}

/** Mesure la fluidité réelle (moyenne exponentielle du temps d'image) et ajuste le plafond par voie. */
export class DensityGovernor {
  private averageMs = 16.7;
  private sinceAdjust = 0;

  constructor(
    public cap: number,
    private readonly bounds: { min: number; max: number },
    private readonly slowMs = 24,
    private readonly fastMs = 18,
  ) {}

  get frameMs() {
    return this.averageMs;
  }

  /** À appeler à chaque image ; renvoie le plafond par voie à appliquer. */
  record(deltaMs: number) {
    const clamped = Math.min(Math.max(deltaMs, 1), 250);
    this.averageMs += (clamped - this.averageMs) * 0.05;
    this.sinceAdjust += clamped;
    if (this.sinceAdjust >= 1500) {
      this.sinceAdjust = 0;
      if (this.averageMs > this.slowMs) this.cap = Math.max(this.bounds.min, this.cap - 1);
      else if (this.averageMs < this.fastMs) this.cap = Math.min(this.bounds.max, this.cap + 1);
    }
    return this.cap;
  }
}

/** Plafond initial par voie selon la largeur de l'écran (téléphone : plus prudent). */
export function initialLaneCap(screenWidth: number) {
  if (screenWidth < 520) return 2;
  if (screenWidth < 900) return 3;
  return 4;
}
