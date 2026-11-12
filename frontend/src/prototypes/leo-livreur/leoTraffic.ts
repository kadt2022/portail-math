/** Mécanique pure du trafic : indépendante de Phaser pour rester testable. */

export const TRAFFIC_WHEEL_RADIUS = 7;
export const TRAFFIC_MIN_GAP = 220;

export interface TrafficMotion {
  x: number;
  speed: number;
  wheelSpin: number;
}

/** Les véhicules opposés roulent vers la gauche : leur roue tourne en sens inverse. */
export function advanceTrafficMotion(state: TrafficMotion, seconds: number): TrafficMotion {
  const distance = state.speed * Math.max(0, seconds);
  return {
    x: state.x - distance,
    speed: state.speed,
    wheelSpin: state.wheelSpin - distance / TRAFFIC_WHEEL_RADIUS,
  };
}

/** Empêche le véhicule suivant de rattraper celui qui le précède. */
export function keepTrafficGap(previousX: number, nextX: number, minimumGap = TRAFFIC_MIN_GAP) {
  return Math.max(nextX, previousX + minimumGap);
}

export function trafficWheelIsMoving(speed: number) {
  return Math.abs(speed) > 0.5;
}
