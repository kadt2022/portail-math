import { consistMass, vehicleFronts, vehicleMass, type Consist } from "./consist";
import type { Track } from "./track";

// Physique ferroviaire simplifiée mais cohérente, en TypeScript pur. Le train est un seul corps (les attelages sont
// supposés tendus) de masse M, qui avance le long de la voie à la vitesse v (m/s, positive en marche avant).
//
//   M · dv/dt = traction − résistance à l'avancement − Σ (mᵢ · g · sin θᵢ) − freinage
//
// - traction : bornée par l'adhérence (effort maximal au démarrage) et par la puissance de la machine (P / v) ;
// - résistance à l'avancement : formule de Davis, A + B·v + C·v² (roulement, frottements, air) ;
// - pente : chaque véhicule pèse selon la pente sous lui (une rame à cheval sur un sommet est retenue d'un côté et
//   poussée de l'autre) ;
// - freinage : une décélération maximale (service ou urgence), répartie sur toute la masse.
// La masse transportée (les caisses) alourdit le train : il accélère moins vite et freine sur une plus longue distance.
//
// Écrit pour Yamba.

export const G = 9.81;

export const PHYSICS = {
  /** Effort de traction maximal (N), limité par l'adhérence. */
  maxTractiveEffort: 88000,
  /** Puissance au crochet (W). */
  power: 620000,
  /** Vitesse au-delà de laquelle le régulateur de la machine réduit l'admission (m/s : 65 km/h). */
  maxSpeed: 18,
  /** Davis : A (N par tonne), B (N par tonne et par m/s), C (N par (m/s)²). */
  davisA: 12,
  davisB: 0.35,
  davisC: 4.2,
  /** Décélérations maximales (m/s²) : frein de service, frein d'urgence. */
  serviceBrake: 1.05,
  emergencyBrake: 1.7,
  /** Montée et descente des commandes (par seconde) : le régulateur et le frein ne s'ouvrent pas d'un coup. */
  throttleRate: 0.7,
  throttleRelease: 1.6,
  brakeRate: 1.4,
  brakeRelease: 1.8,
  /** En dessous de cette vitesse (m/s), sans traction, le train est considéré à l'arrêt. */
  rest: 0.05,
} as const;

export type Direction = 1 | -1;

export interface DriverInput {
  /** Accélérer : le régulateur s'ouvre tant que la commande est tenue. */
  throttle: boolean;
  /** Freiner : le frein de service se serre tant que la commande est tenue. */
  brake: boolean;
  /** Arrêter le train : frein d'urgence, jusqu'à l'arrêt complet. */
  emergency: boolean;
}

export interface TrainState {
  /** Abscisse de l'avant de la locomotive. */
  head: number;
  /** Vitesse le long de la voie (m/s), positive vers l'avant de la locomotive. */
  speed: number;
  /** Sens de marche choisi (inverseur) : 1 en avant, -1 en arrière. */
  direction: Direction;
  /** Ouverture du régulateur et serrage du frein, de 0 à 1. */
  throttle: number;
  brake: number;
  emergency: boolean;
  /** Angle de rotation (radians) de chaque essieu, pour animer les roues sans glissement. */
  distance: number;
  /** Le train a touché un heurtoir pendant le dernier pas. */
  bumped: boolean;
}

export interface ForceBreakdown {
  traction: number;
  resistance: number;
  gravity: number;
  braking: number;
  mass: number;
}

export function initialState(head: number): TrainState {
  return { head, speed: 0, direction: 1, throttle: 0, brake: 0, emergency: false, distance: 0, bumped: false };
}

const approach = (value: number, target: number, up: number, down: number, dt: number) =>
  value < target ? Math.min(target, value + up * dt) : Math.max(target, value - down * dt);

/** Forces le long de la voie (N), positives vers l'avant de la locomotive, pour l'état et la composition donnés. */
export function forces(state: TrainState, consist: Consist, track: Track): ForceBreakdown {
  const mass = consistMass(consist);
  const v = Math.abs(state.speed);
  // Traction : min(adhérence, puissance / vitesse), réduite près de la vitesse maximale, dans le sens de l'inverseur.
  const governor = Math.max(0, Math.min(1, (PHYSICS.maxSpeed + 1 - v) / 2));
  const available = Math.min(PHYSICS.maxTractiveEffort, PHYSICS.power / Math.max(v, 1));
  const traction = state.emergency ? 0 : state.throttle * available * governor * state.direction;
  // Pente sous chaque véhicule (au milieu de sa longueur).
  let gravity = 0;
  vehicleFronts(consist, state.head).forEach((front, i) => {
    const vehicle = consist.vehicles[i];
    const grade = track.pointAt(front - vehicle.spec.length / 2).grade;
    gravity -= vehicleMass(vehicle) * G * (grade / Math.sqrt(1 + grade * grade));
  });
  const tonnes = mass / 1000;
  const davis = PHYSICS.davisA * tonnes + PHYSICS.davisB * tonnes * v + PHYSICS.davisC * v * v;
  const deceleration = state.emergency ? PHYSICS.emergencyBrake : PHYSICS.serviceBrake * state.brake;
  return { traction, resistance: davis, gravity, braking: deceleration * mass, mass };
}

/**
 * Un pas de simulation de dt secondes. Les frottements (résistance et freins) s'opposent toujours au mouvement et ne
 * peuvent pas le renverser : à l'arrêt, ils retiennent le train tant qu'ils suffisent à compenser la pente.
 */
export function stepTrain(state: TrainState, input: DriverInput, consist: Consist, track: Track, dt: number, minHead: number, maxHead: number): TrainState {
  const next: TrainState = { ...state, bumped: false };
  next.throttle = approach(state.throttle, input.throttle && !state.emergency ? 1 : 0, PHYSICS.throttleRate, PHYSICS.throttleRelease, dt);
  next.brake = approach(state.brake, input.brake ? 1 : 0, PHYSICS.brakeRate, PHYSICS.brakeRelease, dt);
  if (input.emergency) next.emergency = true;
  const f = forces(next, consist, track);
  const drive = f.traction + f.gravity;
  const friction = f.resistance + f.braking;
  let speed = state.speed;
  if (Math.abs(speed) < PHYSICS.rest && Math.abs(drive) <= friction) {
    // À l'arrêt et retenu : les frottements compensent la traction et la pente.
    speed = 0;
  } else {
    const sign = Math.abs(speed) >= PHYSICS.rest ? Math.sign(speed) : Math.sign(drive);
    const acceleration = (drive - sign * friction) / f.mass;
    const after = speed + acceleration * dt;
    // Les frottements arrêtent le train, ils ne le font pas repartir dans l'autre sens.
    speed = sign !== 0 && Math.sign(after) !== sign && Math.abs(drive) <= friction ? 0 : after;
  }
  if (next.emergency && speed === 0) next.emergency = false;
  let head = state.head + ((state.speed + speed) / 2) * dt;
  if (head > maxHead || head < minHead) {
    // Heurtoir : le train s'arrête net contre la butée.
    head = Math.max(minHead, Math.min(maxHead, head));
    speed = 0;
    next.bumped = true;
  }
  next.distance = state.distance + (head - state.head);
  next.head = head;
  next.speed = speed;
  return next;
}

/** Distance d'arrêt (m) depuis la vitesse v, au frein de service et à plat : v² / (2 a). */
export function brakingDistance(speed: number, emergency = false): number {
  const a = emergency ? PHYSICS.emergencyBrake : PHYSICS.serviceBrake;
  return (speed * speed) / (2 * a);
}

/** Changement de sens (inverseur) : permis seulement à l'arrêt. */
export function reverse(state: TrainState): TrainState {
  if (Math.abs(state.speed) > PHYSICS.rest) return state;
  return { ...state, direction: state.direction === 1 ? -1 : 1, throttle: 0 };
}
