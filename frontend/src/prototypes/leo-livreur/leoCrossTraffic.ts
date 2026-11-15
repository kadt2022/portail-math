// Trafic perpendiculaire du carrefour de la Zone 3 : pur (sans Phaser).
//
// Chaque véhicule possède sa position, sa vitesse, son trajet (calculé AVANT le virage à partir de la table des
// voies), ses roues et son état de circulation. Il ne dépend jamais des commandes de Léo : il regarde le feu de sa
// rue, le véhicule qui le précède et la place disponible dans sa voie de sortie. Après son virage il devient un
// véhicule ordinaire du trafic.

import { ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";
import {
  depthScale,
  exitWindow,
  rightTurnPath,
  samplePath,
  speedCapAt,
  type CrossPath,
} from "./leoIntersection";
import { mainLaneName, planTurn, type Movement, type TurnPlan } from "./leoLanes";
import { followSpeed, type ExtraObstacle, type LeoBody, type TrafficManager } from "./leoTraffic";
import { shouldStopForLight, type LightState } from "./leoTrafficLight";
import { rollAngle, SPEED_PROFILES, vehicleDisplay, type SpeedProfile, type VehicleSpec } from "./leoVehicleCatalog";

/** Écart de sécurité, de part et d'autre de la zone d'insertion, avant d'engager un virage. */
export const CROSS_SAFE_GAP = 40;
/** Distance (unités du monde) à laquelle on s'immobilise devant une ligne d'arrêt ou le bord de la chaussée. */
export const STOP_LINE_STANDSTILL = 16;
const STOP_LINE_BRAKING = 285;

export type VehicleState = "CRUISING" | "APPROACHING" | "WAITING" | "TURNING" | "MERGING" | "EXITING";

export interface CrossVehicle {
  id: number;
  active: boolean;
  plan: TurnPlan;
  path: CrossPath;
  spec: VehicleSpec;
  profile: SpeedProfile;
  /** Abscisse curviligne du centre du véhicule le long du trajet (px écran). */
  s: number;
  speed: number;
  /** Vitesse de croisière du profil de conduite (celle des autres véhicules du trafic). */
  cruise: number;
  /** Distance totale roulée en unités du monde (px à l'échelle 1) : la rotation des roues s'en déduit. */
  rolled: number;
  /** Longueur à pleine échelle, et longueur affichée (réduite au loin par la perspective). */
  fullLength: number;
  length: number;
  rollRadius: number;
  /** Pose courante : position, cap (tangente du trajet) et échelle de profondeur. */
  x: number;
  y: number;
  heading: number;
  scale: number;
  state: VehicleState;
  /** Manœuvre autorisée et engagée : passé ce point de non-retour, plus aucune raison de freiner d'urgence. */
  committed: boolean;
}

export interface CrossContext {
  /** Feu de la rue perpendiculaire. */
  side: LightState;
  main: TrafficManager;
  leo?: LeoBody;
}

export interface CrossOptions {
  capacity: number;
  random?: () => number;
  specs: readonly VehicleSpec[];
  /** Mouvements autorisés ; par défaut tous ceux de la table des voies (ici : virage à droite seulement). */
  movements?: readonly Movement[];
}

export class CrossTrafficManager {
  readonly vehicles: CrossVehicle[];
  private readonly random: () => number;
  private readonly specs: readonly VehicleSpec[];
  private readonly plans: readonly TurnPlan[];
  private spawnTimer = 1;
  /** Véhicules restant à faire arriver dans le groupe en cours. */
  private burstRemaining = 0;
  /** Nombre maximal de véhicules perpendiculaires simultanés (densité adaptable). */
  cap: number;

  constructor(options: CrossOptions) {
    this.random = options.random ?? Math.random;
    this.specs = options.specs;
    const wanted = options.movements ?? ["RIGHT"];
    this.plans = wanted.map((movement) => planTurn("AVENUE_SOUTH", movement)).filter((plan): plan is TurnPlan => plan !== null);
    if (this.plans.length === 0) throw new Error("Aucun mouvement autorisé depuis l'avenue");
    this.cap = options.capacity;
    const plan = this.plans[0];
    this.vehicles = Array.from({ length: options.capacity }, (_, id) => ({
      id,
      active: false,
      plan,
      path: rightTurnPath(200),
      spec: options.specs[id % options.specs.length],
      profile: "normal" as SpeedProfile,
      s: 0,
      speed: 0,
      cruise: 0,
      rolled: 0,
      fullLength: 0,
      length: 0,
      rollRadius: 1,
      x: -10_000,
      y: 0,
      heading: Math.PI / 2,
      scale: 1,
      state: "APPROACHING" as VehicleState,
      committed: false,
    }));
  }

  get activeCount() {
    return this.vehicles.reduce((count, vehicle) => count + (vehicle.active ? 1 : 0), 0);
  }

  reset() {
    for (const vehicle of this.vehicles) vehicle.active = false;
    this.spawnTimer = 1;
    this.burstRemaining = 0;
  }

  /** Initialise un véhicule sur son trajet : voie de sortie connue, trajectoire calculée, profil de vitesse choisi. */
  private launch(vehicle: CrossVehicle, spec: VehicleSpec, plan: TurnPlan, s: number, speed: number, profile: SpeedProfile, cruise: number) {
    const display = vehicleDisplay(spec);
    Object.assign(vehicle, {
      active: true,
      plan,
      path: rightTurnPath(display.footprintLength, display.footprintDepth),
      spec,
      profile,
      s,
      cruise,
      rolled: 0,
      fullLength: display.footprintLength,
      rollRadius: display.wheels[0].rollRadius,
      state: "APPROACHING",
      committed: false,
    });
    this.placeOnPath(vehicle);
    vehicle.speed = Math.min(speed, speedCapAt(vehicle.path, vehicle.s + vehicle.length / 2));
  }

  /** Place un véhicule sur son trajet (tests et reprise de partie) sans passer par l'apparition aléatoire. */
  place(index: number, spec: VehicleSpec, movement: Movement, s: number, speed: number, profile: SpeedProfile = "normal") {
    const plan = planTurn("AVENUE_SOUTH", movement);
    if (!plan) throw new Error(`Mouvement non autorisé : ${movement}`);
    const [low, high] = SPEED_PROFILES[profile];
    const vehicle = this.vehicles[index];
    this.launch(vehicle, spec, plan, s, speed, profile, (low + high) / 2);
    return vehicle;
  }

  /** Un véhicule est-il engagé dans la zone de virage (conflit avec la chaussée principale) ? */
  turnZoneBusy() {
    return this.vehicles.some((vehicle) => vehicle.active
      && vehicle.s + vehicle.length / 2 > vehicle.path.edgeS
      && vehicle.s - vehicle.length / 2 < vehicle.path.curveEndS);
  }

  /**
   * Véhicules déjà engagés sur la chaussée principale (virage en cours) : ceux du trafic ordinaire doivent les
   * respecter.
   */
  extras(): ExtraObstacle[] {
    const result: ExtraObstacle[] = [];
    for (const vehicle of this.vehicles) {
      if (!vehicle.active || vehicle.y < ROAD_Y - ROAD_HALF_WIDTH - 4) continue;
      const lane = mainLaneName(vehicle.plan.toLaneId);
      if (!lane) continue;
      result.push({ lane, x: vehicle.x, length: vehicle.length, speed: vehicle.speed * Math.abs(Math.cos(vehicle.heading)) });
    }
    return result;
  }

  update(seconds: number, context: CrossContext) {
    const dt = Math.min(Math.max(seconds, 0), 0.05);
    // Du plus avancé au plus en retard : chaque suiveur voit son leader déjà déplacé.
    const order = this.vehicles.filter((vehicle) => vehicle.active).sort((a, b) => b.s - a.s);
    for (const vehicle of order) {
      const leader = this.leaderOf(vehicle, context);
      // Vitesse désirée : celle du profil, bornée par la courbure (adhérence latérale) et la limite de l'avenue,
      // avec freinage préparatoire avant le virage (déjà intégré à la table des caps).
      const desired = Math.min(vehicle.cruise, speedCapAt(vehicle.path, vehicle.s + vehicle.length / 2));
      let speed = followSpeed(vehicle.speed, desired, leader, dt);
      if (leader && leader.standstill !== undefined && leader.speed === 0) {
        // Ligne d arrêt : la vitesse s annule à la ligne (freinage confortable), sans reptation asymptotique.
        const room = leader.gap - leader.standstill;
        speed = room <= 0.5 ? 0 : Math.min(speed, Math.sqrt(2 * STOP_LINE_BRAKING * room) + 4);
      }
      // Perspective : la vitesse est en unités du monde ; à l'écran, un véhicule lointain avance moins vite.
      let travelled = speed * dt * vehicle.scale;
      if (leader) {
        // Garantie dure, jamais atteinte en conduite normale : pas de superposition (écart en unités du monde).
        const room = Math.max(0, leader.gap - 6) * vehicle.scale;
        if (travelled > room) {
          travelled = room;
          speed = Math.min(speed, leader.speed);
        }
      }
      vehicle.speed = speed;
      vehicle.s += travelled;
      this.placeOnPath(vehicle);
      vehicle.rolled += speed * dt;
      vehicle.state = this.stateOf(vehicle);
      if (vehicle.s >= vehicle.path.curveEndS + 8) this.handOff(vehicle, context);
      if (vehicle.active && vehicle.s >= vehicle.path.length - 4) vehicle.active = false;
    }
    this.spawn(dt);
  }

  private placeOnPath(vehicle: CrossVehicle) {
    const point = samplePath(vehicle.path, vehicle.s);
    vehicle.x = point.x;
    vehicle.y = point.y;
    vehicle.heading = point.heading;
    vehicle.scale = depthScale(point.y);
    vehicle.length = vehicle.fullLength * vehicle.scale;
  }

  private stateOf(vehicle: CrossVehicle): VehicleState {
    const path = vehicle.path;
    if (vehicle.s < path.edgeS) return vehicle.speed < 1 ? "WAITING" : "APPROACHING";
    if (vehicle.s < path.curveEndS) return "TURNING";
    return vehicle.s < path.curveEndS + vehicle.fullLength ? "MERGING" : "EXITING";
  }

  /**
   * Passe le relais au trafic ordinaire dès que la voie rejointe a une place : même position, même vitesse,
   * mêmes roues, même profil de conduite. Sans place, le véhicule continue sur son trajet de sortie, sans disparaître.
   */
  private handOff(vehicle: CrossVehicle, context: CrossContext) {
    const lane = mainLaneName(vehicle.plan.toLaneId);
    if (!lane) return;
    const direction = lane === "same" ? 1 : -1;
    const adopted = context.main.adopt({
      lane,
      spec: vehicle.spec,
      profile: vehicle.profile,
      x: vehicle.x,
      speed: Math.max(vehicle.speed, 0),
      cruise: vehicle.cruise,
      wheelAngle: rollAngle(direction * vehicle.rolled, vehicle.rollRadius),
    });
    if (adopted) vehicle.active = false;
  }

  /** Véhicule (ou obstacle virtuel) qui limite la vitesse de ce véhicule. */
  private leaderOf(vehicle: CrossVehicle, context: CrossContext) {
    const path = vehicle.path;
    const front = vehicle.s + vehicle.length / 2;
    const world = 1 / Math.max(vehicle.scale, 0.1);
    const found: { best: { gap: number; speed: number; standstill?: number } | null } = { best: null };
    const consider = (gap: number, speed: number, standstill?: number) => {
      if (!found.best || gap * world < found.best.gap) found.best = { gap: gap * world, speed, standstill };
    };

    // 1. Véhicule qui précède : même trajet, ou approche commune (même voie d'entrée) tant que personne n'a tourné.
    for (const other of this.vehicles) {
      if (!other.active || other === vehicle || other.s <= vehicle.s) continue;
      const sharedApproach = vehicle.s <= path.edgeS + 4 && other.s <= other.path.edgeS + 4;
      if (other.path !== path && !sharedApproach) continue;
      consider(other.s - other.length / 2 - front, other.speed);
    }

    // 2. Feu de la rue perpendiculaire : ligne d'arrêt posée avant le passage piéton.
    if (front <= path.stopS + 2) {
      const distance = path.stopS - front;
      // Un feu n'est pas un véhicule : on s'arrête juste avant la ligne, pas à la distance d'un véhicule qui précède.
      if (shouldStopForLight(context.side, distance, vehicle.speed)) consider(distance, 0, STOP_LINE_STANDSTILL);
    }

    // 3. Entrée sur la chaussée principale : on s'arrête au bord tant que la manœuvre n'est pas possible.
    if (front <= path.edgeS + 2 && !vehicle.committed) {
      if (!this.turnClear(vehicle, context)) {
        consider(Math.max(0, path.edgeS - front), 0, STOP_LINE_STANDSTILL);
      } else if (path.edgeS - front <= (vehicle.speed * vehicle.speed) / (2 * 285) + 12) {
        // Dernier instant pour s'arrêter confortablement : la voie est libre, on s'engage et on ne freine plus d'urgence.
        vehicle.committed = true;
      }
    }

    // 4. Après l'entrée, les véhicules de la voie rejointe qui sont devant nous.
    if (vehicle.s >= path.edgeS - vehicle.length) {
      const lane = mainLaneName(vehicle.plan.toLaneId);
      const ahead = lane ? context.main.nearestAhead(lane, vehicle.x, vehicle.length) : null;
      if (ahead) consider(ahead.gap, ahead.speed);
    }
    return found.best;
  }

  /**
   * La manœuvre est-elle possible ? Quatre conditions, vérifiées AVANT de s'engager :
   *  1. le feu de la rue est vert ;
   *  2. la voie de sortie a la place d'accueillir le véhicule entier, marge de sécurité comprise (ni véhicule, ni Léo) ;
   *  3. aucun véhicule d'un trajet différent n'occupe déjà la zone de virage (réservation : un à la fois) ;
   *  4. le mouvement est autorisé par la table des voies (déjà garanti par le plan).
   * Une fois engagé dans le virage, on le termine toujours.
   */
  turnClear(vehicle: CrossVehicle, context: CrossContext) {
    const path = vehicle.path;
    if (vehicle.s > path.edgeS - 2) return true;
    if (context.side !== "GREEN") return false;
    const window = exitWindow(path, vehicle.fullLength);
    const lane = mainLaneName(window.laneId);
    if (!lane) return false;
    const minX = window.minX - CROSS_SAFE_GAP;
    const maxX = window.maxX + CROSS_SAFE_GAP;
    if (!context.main.laneClear(lane, minX, maxX)) return false;
    if (context.main.leoInWindow(context.leo, lane, minX, maxX)) return false;
    for (const other of this.vehicles) {
      if (!other.active || other === vehicle || other.path === path) continue;
      const inZone = other.s + other.length / 2 > other.path.edgeS - 10 && other.s - other.length / 2 < other.path.curveEndS;
      if (inZone) return false;
    }
    return true;
  }

  private spawn(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const free = this.vehicles.find((vehicle) => !vehicle.active);
    if (!free || this.activeCount >= this.cap) return;
    // Groupes : 2 à 4 véhicules à la suite, puis une pause. Ils s'arrêtent au feu et forment une file visible.
    if (this.burstRemaining <= 0) this.burstRemaining = 2 + Math.floor(this.random() * 3);
    this.burstRemaining -= 1;
    this.spawnTimer = this.burstRemaining > 0 ? 0.8 + this.random() * 0.9 : 7 + this.random() * 5;
    // Tant qu un véhicule est déjà dans l avenue, on choisit parmi les plus courts : un car arrêté à la ligne
    // remplirait seul la partie visible de l avenue et cacherait le reste du groupe.
    const queued = this.vehicles.some((other) => other.active);
    const pool = queued ? [...this.specs].sort((x, y) => vehicleDisplay(x).footprintLength - vehicleDisplay(y).footprintLength).slice(0, Math.max(2, Math.ceil(this.specs.length / 2))) : this.specs;
    let spec = pool[Math.floor(this.random() * pool.length)];
    // Le car est rare : un second tirage évite qu un véhicule très long ouvre presque chaque groupe.
    if (!queued && vehicleDisplay(spec).footprintLength > 250) spec = pool[Math.floor(this.random() * pool.length)];
    const display = vehicleDisplay(spec);
    // Pas d'apparition sur un véhicule qui n'a pas encore quitté la zone d'entrée.
    // La place se mesure à l'écran, à l'échelle du lointain : le véhicule précédent doit avoir libéré l'entrée.
    const newLength = display.footprintLength * depthScale(rightTurnPath(display.footprintLength, display.footprintDepth).points[0].y);
    if (this.vehicles.some((other) => other.active && other.s < (newLength + other.length) / 2 + 3)) return;
    const plan = this.plans[Math.floor(this.random() * this.plans.length)];
    // Profil de conduite : ceux du trafic existant, jamais une vitesse propre aux nouveaux véhicules.
    const profile = spec.profiles[Math.floor(this.random() * spec.profiles.length)] ?? "normal";
    const [low, high] = SPEED_PROFILES[profile];
    const cruise = low + this.random() * (high - low);
    this.launch(free, spec, plan, 0, cruise, profile, cruise);
  }
}
