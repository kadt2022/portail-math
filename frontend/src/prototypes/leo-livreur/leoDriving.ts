// Modèle de conduite simplifié de Léo (bicyclette cinématique).
// Il ne connaît ni Phaser ni l'illustration : seulement une position, un cap,
// une vitesse et un angle de braquage. Rien n'y choisit l'itinéraire.

import { isVehicleOnRoad, normalizeAngle, type VehiclePose } from "./leoGeometry";
import { GRAVITY, REFERENCE_CAR, kmhToMps, kmhToPx, mps2ToPx } from "./leoUnits";

// Toutes les grandeurs sont déclarées en unités réelles puis converties en px (voir leoUnits).
// Les positions restent en px ; les vitesses en px/s ; les accélérations en px/s².

/**
 * Vitesse limite de la ROUTE en ville (panneau « MAX 50 » de l'illustration) : 50 km/h. C'est une règle, pas une
 * limite de la voiture : rien n'empêche mécaniquement de la dépasser (question pédagogique pour les élèves).
 */
export const CITY_SPEED_LIMIT_KMH = 50;
/** Vitesse maximale que la VOITURE de Léo peut atteindre dans le jeu : 120 km/h (la Fiat 500 monte à 160 km/h). */
export const CAR_MAX_SPEED_KMH = 120;
/** Vitesse maximale sur route libre ; elle s'adapte au trafic (voir `speedCap`). */
export const MAX_SPEED = kmhToPx(CAR_MAX_SPEED_KMH);
/** Vitesse limite de la route, en px/s. */
export const CITY_SPEED_LIMIT = kmhToPx(CITY_SPEED_LIMIT_KMH);
/** Marche arrière de manœuvre : 10 km/h au plus. */
export const MAX_REVERSE_SPEED = kmhToPx(10);
/** Vitesse maximale de la voiture de référence (sans limitation). */
export const CAR_TOP_SPEED = kmhToPx(REFERENCE_CAR.topSpeedKmh);
/**
 * Poussée du moteur à l'arrêt. Modèle : a(v) = A0 · (1 − v / Vmax). Il donne t(0 → v) = (Vmax / A0) · ln(1 / (1 − v / Vmax)) ;
 * A0 est choisi pour que la voiture de référence passe de 0 à 100 km/h en 12,9 s (fiche technique) : A0 ≈ 3,38 m/s².
 * Conséquence : 0 → 50 km/h en ≈ 4,9 s.
 */
export const ACCELERATION_MPS2 =
  (kmhToMps(REFERENCE_CAR.topSpeedKmh) * Math.log(1 / (1 - 100 / REFERENCE_CAR.topSpeedKmh))) / REFERENCE_CAR.zeroTo100Seconds;
export const ACCELERATION = mps2ToPx(ACCELERATION_MPS2);
/** Mise en mouvement en marche arrière : douce, 1,5 m/s². */
export const REVERSE_ACCELERATION = mps2ToPx(1.5);
/**
 * Pied levé (frein moteur et roulement) : 0,5 m/s² + 0,03 × v. À 50 km/h, environ 0,9 m/s².
 * Ordre de grandeur : roulement ≈ 0,1 à 0,15 m/s², air ≈ 0,1 m/s² à 50 km/h, frein moteur ≈ 0,5 m/s².
 */
export const DRAG_BASE = mps2ToPx(0.5);
export const DRAG_PER_SPEED = 0.03;
/**
 * Décélération maximale du frein, atteinte seulement une fois la pédale enfoncée : adhérence d'un pneu sur
 * asphalte sec, coefficient ≈ 0,8, soit 0,8 g ≈ 7,85 m/s².
 */
export const BRAKE_DECELERATION_MPS2 = 0.8 * GRAVITY;
export const BRAKE_DECELERATION = mps2ToPx(BRAKE_DECELERATION_MPS2);
/** Vitesse d'enfoncement de la pédale de frein : 0 → 1 en 0,4 s (la voiture ne bloque pas d'un coup). */
export const BRAKE_PEDAL_RATE = 2.5;
export const BRAKE_PEDAL_RELEASE_RATE = 8;
/** Sous ce seuil (≈ 0,6 km/h), la voiture qui freine s'immobilise (pas de reptation infinie). */
export const STOP_SPEED = kmhToPx(0.6);
/** Ralentissement appliqué quand la vitesse dépasse la limite imposée par le trafic devant : 7 m/s². */
export const TRAFFIC_SLOWING = mps2ToPx(7);
export const MAX_STEERING_ANGLE = Math.PI / 6;
export const WHEEL_BASE = 96;
export const STEERING_RATE = 3.8;
export const WALL_BOUNCE = 0.35;

export interface LeoMotionState {
  x: number;
  y: number;
  speed: number;
  heading: number;
  steeringAngle: number;
  /** Enfoncement de la pédale de frein, de 0 (relâchée) à 1 (à fond). */
  brakeLevel?: number;
}

export interface LeoMotionInput {
  left: boolean;
  right: boolean;
  forward: boolean;
  brake: boolean;
  /** Marche arrière : freine d'abord jusqu'à l'arrêt, puis recule. */
  reverse?: boolean;
}

export function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(current + amount, target);
  return Math.max(current - amount, target);
}

function steeringTarget(input: LeoMotionInput) {
  if (input.left === input.right) return 0;
  return input.left ? -MAX_STEERING_ANGLE : MAX_STEERING_ANGLE;
}

/**
 * Vitesse suivante. Rien n'est instantané : la pédale de frein s'enfonce
 * progressivement, la décélération monte avec elle, puis la voiture s'arrête.
 * `speedCap` est la vitesse maximale permise par le trafic devant (route libre : illimitée).
 */
function nextSpeed(state: LeoMotionState, input: LeoMotionInput, seconds: number, speedCap: number) {
  let speed = state.speed;
  const wantsReverse = Boolean(input.reverse) && !input.forward && !input.brake;
  const wantsBrake = input.brake || (Boolean(input.reverse) && speed > 0.5);
  const accelerating = input.forward && !input.brake && !input.reverse;
  const brakeLevel = wantsBrake
    ? Math.min(1, (state.brakeLevel ?? 0) + BRAKE_PEDAL_RATE * seconds)
    : Math.max(0, (state.brakeLevel ?? 0) - BRAKE_PEDAL_RELEASE_RATE * seconds);

  const drag = DRAG_BASE + DRAG_PER_SPEED * Math.abs(speed);
  const limit = Math.min(MAX_SPEED, Math.max(0, speedCap));

  if (wantsBrake) {
    // Le frein s'oppose toujours au sens de la marche, jusqu'à zéro.
    const deceleration = (BRAKE_DECELERATION * brakeLevel + drag) * seconds;
    speed = speed > 0 ? Math.max(0, speed - deceleration) : Math.min(0, speed + deceleration);
    if (Math.abs(speed) < STOP_SPEED) speed = 0;
  } else if (accelerating) {
    if (speed < 0) {
      speed = Math.min(0, speed + (BRAKE_DECELERATION * 0.6 + drag) * seconds);
    } else if (speed < limit) {
      const push = ACCELERATION * (1 - speed / CAR_TOP_SPEED) * seconds;
      speed = Math.min(limit, speed + push);
    }
  } else if (wantsReverse) {
    speed = Math.max(-MAX_REVERSE_SPEED, speed - REVERSE_ACCELERATION * seconds);
  } else {
    speed = approach(speed, 0, drag * seconds);
    if (Math.abs(speed) < 1) speed = 0;
  }
  // Trafic devant : la vitesse maximale baisse progressivement, jamais d'un coup.
  if (speed > limit) speed = Math.max(limit, speed - TRAFFIC_SLOWING * seconds);
  return { speed, brakeLevel };
}

/**
 * Fait avancer le véhicule d'un pas. Le cap ne change que si le véhicule roule :
 * aucune rotation sur place. L'assistance se limite à empêcher la sortie de
 * chaussée (glissement le long du bord, petit rebond) : elle ne tourne jamais
 * le volant à la place de l'enfant.
 */
/** Obstacle supplémentaire (véhicules du trafic) : vrai si la pose est occupée. */
export type LeoObstacleCheck = (pose: VehiclePose) => boolean;

export function updateLeoMotion(
  state: LeoMotionState,
  input: LeoMotionInput,
  deltaSeconds: number,
  isBlocked?: LeoObstacleCheck,
  speedCap = Number.POSITIVE_INFINITY,
): LeoMotionState {
  const isFree = (pose: VehiclePose) => isVehicleOnRoad(pose) && !(isBlocked?.(pose) ?? false);
  const seconds = Math.min(deltaSeconds, 0.05);
  const steeringAngle = approach(state.steeringAngle, steeringTarget(input), STEERING_RATE * seconds);
  const { speed, brakeLevel } = nextSpeed(state, input, seconds, speedCap);

  const heading = normalizeAngle(state.heading + (speed / WHEEL_BASE) * Math.tan(steeringAngle) * seconds);
  const dx = Math.cos(heading) * speed * seconds;
  const dy = Math.sin(heading) * speed * seconds;
  const candidates = [
    { x: state.x + dx, y: state.y + dy, heading },
    { x: state.x + dx, y: state.y, heading },
    { x: state.x, y: state.y + dy, heading },
  ];
  for (const pose of candidates) {
    if (isFree(pose)) return { ...pose, speed, steeringAngle, brakeLevel };
  }

  // Contre un bord : on reste sur place avec l'ancien cap, on recule un peu
  // et on garde assez d'élan pour pouvoir braquer et repartir.
  const backed = { x: state.x - dx * WALL_BOUNCE, y: state.y - dy * WALL_BOUNCE };
  const position = isFree({ ...backed, heading: state.heading }) ? backed : { x: state.x, y: state.y };
  const turned = isFree({ ...position, heading }) ? heading : state.heading;
  return { ...position, heading: turned, speed: speed * 0.5, steeringAngle, brakeLevel };
}
