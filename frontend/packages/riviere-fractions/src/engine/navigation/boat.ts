import { LANE_CENTERS, LANE_HALF_WIDTH, laneOf, type ForkLayout, type Lane, type RiverLayout } from "../geometry/layout";
import { clamp } from "../geometry/noise";

// Navigation du bateau en coordonnées de rivière. Avance assistée (la vitesse est une consigne que le jeu fixe),
// direction manuelle avec une inertie simple, et des bords doux : rien ne choque, rien ne coule. La voie est figée
// quand la proue franchit la ligne de décision : c'est la réponse de l'enfant.

export interface BoatTuning {
  cruiseSpeed: number;
  /** Vitesse avant un embranchement, pour laisser le temps de lire et de viser. */
  approachSpeed: number;
  acceleration: number;
  steerAcceleration: number;
  lateralDamping: number;
  maxLateralSpeed: number;
  /** Demi-largeur du bateau plus une marge, pour rester loin des berges. */
  clearance: number;
}

export const DEFAULT_TUNING: BoatTuning = {
  cruiseSpeed: 6.4,
  approachSpeed: 3.4,
  acceleration: 1.8,
  steerAcceleration: 12,
  lateralDamping: 3.6,
  maxLateralSpeed: 5.5,
  clearance: 2.1,
};

export interface BoatState {
  s: number;
  d: number;
  speed: number;
  lateral: number;
  /** Prochain embranchement à décider. */
  nextFork: number;
  /** Voie empruntée dans l'embranchement en cours, une fois la ligne franchie. */
  lane: Lane | null;
  /** Point d'arrêt (devant un barrage, ou au ponton d'arrivée). */
  stopAt: number | null;
  /** Le bateau attend au ponton (avant le départ). */
  moored: boolean;
}

export interface Obstacle {
  s: number;
  d: number;
  radius: number;
}

export interface LaneCrossing {
  fork: number;
  lane: Lane;
}

export function initialBoat(layout: RiverLayout): BoatState {
  return { s: layout.start, d: 0, speed: 0, lateral: 0, nextFork: 0, lane: null, stopAt: null, moored: true };
}

function targetSpeed(state: BoatState, layout: RiverLayout, tuning: BoatTuning): number {
  if (state.moored) return 0;
  const stop = state.stopAt ?? layout.finish;
  const braking = Math.max(0, (stop - state.s) * 0.55);
  const fork = layout.forks[state.nextFork];
  const slow = fork && state.s > fork.approachStart - 6 && state.s < fork.tip + 2;
  return Math.min(slow ? tuning.approachSpeed : tuning.cruiseSpeed, braking);
}

/** Limites latérales permises à l'abscisse s : tout le chenal, ou la voie empruntée entre les îlots. */
export function lateralBounds(state: BoatState, layout: RiverLayout, tuning: BoatTuning): [number, number] {
  const fork: ForkLayout | null = layout.forkAt(state.s);
  if (fork && state.lane !== null && state.s >= fork.tip && state.s <= fork.islandEnd) {
    const centre = LANE_CENTERS[state.lane];
    const room = LANE_HALF_WIDTH - tuning.clearance + 0.6;
    return [centre - room, centre + room];
  }
  const half = layout.halfWidth(state.s) - tuning.clearance;
  return [-half, half];
}

export interface BoatStep {
  state: BoatState;
  crossing: LaneCrossing | null;
}

/** Avance d'un pas de temps (secondes). `steer` va de -1 (gauche) à 1 (droite). */
export function stepBoat(previous: BoatState, steer: number, dt: number, layout: RiverLayout, obstacles: readonly Obstacle[] = [], tuning: BoatTuning = DEFAULT_TUNING): BoatStep {
  const state = { ...previous };
  const wanted = targetSpeed(state, layout, tuning);
  const change = clamp(wanted - state.speed, -tuning.acceleration * 1.6 * dt, tuning.acceleration * dt);
  state.speed = Math.max(0, state.speed + change);

  const input = state.moored ? 0 : clamp(steer, -1, 1);
  state.lateral += (input * tuning.steerAcceleration - state.lateral * tuning.lateralDamping) * dt;
  state.lateral = clamp(state.lateral, -tuning.maxLateralSpeed, tuning.maxLateralSpeed);

  // Autres bateaux : une poussée douce sur le côté, et un léger ralentissement.
  for (const obstacle of obstacles) {
    const ds = obstacle.s - state.s;
    const dd = state.d - obstacle.d;
    if (ds > -4 && ds < 8 && Math.abs(dd) < obstacle.radius + 2.2) {
      const push = (obstacle.radius + 2.2 - Math.abs(dd)) * (dd >= 0 ? 1 : -1);
      state.lateral += push * 3 * dt;
      state.speed *= 1 - 0.6 * dt;
    }
  }

  const before = state.s;
  state.s += state.speed * dt;
  state.d += state.lateral * dt;

  let crossing: LaneCrossing | null = null;
  const fork = layout.forks[state.nextFork];
  if (fork && before < fork.tip && state.s >= fork.tip) {
    state.lane = laneOf(state.d);
    state.nextFork += 1;
    crossing = { fork: fork.index, lane: state.lane };
  }
  const current = layout.forkAt(state.s);
  if (!current || state.s > current.islandEnd) state.lane = null;

  const [low, high] = lateralBounds(state, layout, tuning);
  const pull = Math.min(1, 5 * dt);
  if (state.d < low) {
    state.d += (low - state.d) * pull;
    state.lateral = Math.max(state.lateral, 0);
  } else if (state.d > high) {
    state.d += (high - state.d) * pull;
    state.lateral = Math.min(state.lateral, 0);
  }
  return { state, crossing };
}

/** Cap visuel du bateau par rapport au chenal (radians) : il tourne vers où il va. */
export function boatYaw(state: BoatState): number {
  return Math.atan2(state.lateral, Math.max(state.speed, 1.2)) * 0.85;
}

/** Point d'arrêt devant le barrage d'un embranchement. */
export function stopBeforeBarrier(fork: ForkLayout): number {
  return fork.barrier - 6;
}
