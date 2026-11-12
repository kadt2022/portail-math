// Modèle de conduite simplifié de Léo (bicyclette cinématique).
// Il ne connaît ni Phaser ni l'illustration : seulement une position, un cap,
// une vitesse et un angle de braquage. Rien n'y choisit l'itinéraire.

import { isVehicleOnRoad, normalizeAngle } from "./leoGeometry";

export const MAX_SPEED = 260;
export const MAX_REVERSE_SPEED = 70;
export const ACCELERATION = 280;
export const COAST_DECELERATION = 90;
export const BRAKE_DECELERATION = 520;
export const MAX_STEERING_ANGLE = Math.PI / 6;
export const WHEEL_BASE = 96;
export const STEERING_RATE = 3.8;
/** Durée d'arrêt avec Freiner maintenu avant d'enclencher la marche arrière. */
export const REVERSE_DELAY = 0.35;
export const WALL_BOUNCE = 0.35;

export interface LeoMotionState {
  x: number;
  y: number;
  speed: number;
  heading: number;
  steeringAngle: number;
  /** Temps pendant lequel Freiner est maintenu à l'arrêt. */
  brakeHold?: number;
}

export interface LeoMotionInput {
  left: boolean;
  right: boolean;
  forward: boolean;
  brake: boolean;
}

export function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(current + amount, target);
  return Math.max(current - amount, target);
}

function steeringTarget(input: LeoMotionInput) {
  if (input.left === input.right) return 0;
  return input.left ? -MAX_STEERING_ANGLE : MAX_STEERING_ANGLE;
}

function nextSpeed(state: LeoMotionState, input: LeoMotionInput, seconds: number) {
  let speed = state.speed;
  const braking = input.brake && !input.forward;
  // Compte le temps d'arrêt (ou de recul) avec Freiner maintenu : la marche arrière
  // ne s'enclenche qu'après une vraie immobilisation, jamais en freinant en roulant.
  const brakeHold = braking && speed <= 0 ? (state.brakeHold ?? 0) + seconds : 0;
  if (input.forward && !input.brake) {
    speed = speed < 0 ? approach(speed, 0, BRAKE_DECELERATION * seconds) : Math.min(MAX_SPEED, speed + ACCELERATION * seconds);
  } else if (input.brake) {
    if (speed > 0) speed = Math.max(0, speed - BRAKE_DECELERATION * seconds);
    else if (brakeHold >= REVERSE_DELAY) speed = Math.max(-MAX_REVERSE_SPEED, speed - ACCELERATION * 0.5 * seconds);
    else speed = approach(speed, 0, BRAKE_DECELERATION * seconds);
  } else {
    speed = approach(speed, 0, COAST_DECELERATION * seconds);
  }
  if (Math.abs(speed) < 0.5) speed = 0;
  return { speed, brakeHold };
}

/**
 * Fait avancer le véhicule d'un pas. Le cap ne change que si le véhicule roule :
 * aucune rotation sur place. L'assistance se limite à empêcher la sortie de
 * chaussée (glissement le long du bord, petit rebond) : elle ne tourne jamais
 * le volant à la place de l'enfant.
 */
export function updateLeoMotion(state: LeoMotionState, input: LeoMotionInput, deltaSeconds: number): LeoMotionState {
  const seconds = Math.min(deltaSeconds, 0.05);
  const steeringAngle = approach(state.steeringAngle, steeringTarget(input), STEERING_RATE * seconds);
  const { speed, brakeHold } = nextSpeed(state, input, seconds);

  const heading = normalizeAngle(state.heading + (speed / WHEEL_BASE) * Math.tan(steeringAngle) * seconds);
  const dx = Math.cos(heading) * speed * seconds;
  const dy = Math.sin(heading) * speed * seconds;
  const candidates = [
    { x: state.x + dx, y: state.y + dy, heading },
    { x: state.x + dx, y: state.y, heading },
    { x: state.x, y: state.y + dy, heading },
  ];
  for (const pose of candidates) {
    if (isVehicleOnRoad(pose)) return { ...pose, speed, steeringAngle, brakeHold };
  }

  // Contre un bord : on reste sur place avec l'ancien cap, on recule un peu
  // et on garde assez d'élan pour pouvoir braquer et repartir.
  const backed = { x: state.x - dx * WALL_BOUNCE, y: state.y - dy * WALL_BOUNCE };
  const position = isVehicleOnRoad({ ...backed, heading: state.heading }) ? backed : { x: state.x, y: state.y };
  const turned = isVehicleOnRoad({ ...position, heading }) ? heading : state.heading;
  return { ...position, heading: turned, speed: speed * 0.5, steeringAngle, brakeHold };
}
