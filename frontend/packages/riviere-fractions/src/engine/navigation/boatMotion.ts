// Animation du bateau du joueur, en TypeScript pur : elle ne change rien à la navigation (vitesse, cap, voie), elle
// donne seulement vie à ce qu'on voit. Le bateau se cabre un peu quand il accélère et pique quand il ralentit, se
// penche doucement dans les virages, se balance sur l'eau calme ; l'hélice tourne quand le moteur pousse et le moteur
// hors-bord s'oriente dans le sens du virage. Des ressorts amortis donnent des mouvements souples, sans à-coups.

export interface BoatMotionInput {
  /** Pas de temps (s). */
  dt: number;
  /** Temps écoulé (s), pour le balancement. */
  time: number;
  /** Vitesse d'avance (m/s) et vitesse latérale (m/s, positive vers tribord), données par la navigation. */
  speed: number;
  lateral: number;
  /** Direction demandée par l'enfant, de -1 (bâbord) à 1 (tribord). */
  steer: number;
  /** Amarré au ponton : moteur au point mort. */
  moored: boolean;
  /** Assiette imposée par les vagues (rad) : tangage (négatif = proue levée) et roulis (positif = tribord levé). */
  wavePitch: number;
  waveRoll: number;
}

export interface BoatMotion {
  /** Tangage (rad, rotation autour de x : négatif = proue levée). */
  pitch: number;
  pitchRate: number;
  /** Roulis (rad, rotation autour de z : positif = tribord levé). */
  roll: number;
  rollRate: number;
  /** Pilonnement (m) autour de la surface de l'eau. */
  heave: number;
  heaveRate: number;
  /** Angle de l'hélice (rad) et sa vitesse de rotation (rad/s). */
  propeller: number;
  propellerSpeed: number;
  /** Orientation du moteur hors-bord (rad, rotation autour de y du repère du bateau). */
  outboardYaw: number;
  /** Accélération filtrée (m/s²) et vitesse du pas précédent. */
  acceleration: number;
  lastSpeed: number;
}

export interface BoatMotionTuning {
  /** Proue levée en croisière, à pleine vitesse (rad). */
  cruiseTrim: number;
  /** Proue levée par m/s² d'accélération (rad). */
  accelerationTrim: number;
  /** Inclinaison dans les virages par m/s de vitesse latérale (rad), et inclinaison maximale. */
  lean: number;
  maxLean: number;
  /** Braquage maximal du moteur hors-bord (rad). */
  maxOutboardYaw: number;
  /** Rotation de l'hélice : au ralenti et par m/s d'avance (rad/s), plafonnée pour rester lisible à l'écran. */
  propellerIdle: number;
  propellerPerSpeed: number;
  maxPropellerSpeed: number;
  /** Amplitude du balancement sur l'eau calme : roulis, tangage (rad), pilonnement (m). */
  swayRoll: number;
  swayPitch: number;
  swayHeave: number;
}

export const MOTION_TUNING: BoatMotionTuning = {
  cruiseTrim: 0.04,
  accelerationTrim: 0.025,
  lean: 0.026,
  maxLean: 0.12,
  maxOutboardYaw: 0.42,
  propellerIdle: 9,
  propellerPerSpeed: 2.2,
  maxPropellerSpeed: 24,
  swayRoll: 0.012,
  swayPitch: 0.006,
  swayHeave: 0.018,
};

/** Croisière de la navigation (m/s) : la référence de l'assiette de croisière. */
const CRUISE_SPEED = 6.4;
const MAX_STEP = 1 / 60;

export function initialMotion(): BoatMotion {
  return { pitch: 0, pitchRate: 0, roll: 0, rollRate: 0, heave: 0, heaveRate: 0, propeller: 0, propellerSpeed: 0, outboardYaw: 0, acceleration: 0, lastSpeed: 0 };
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Ressort amorti (intégration semi-implicite) : renvoie la nouvelle valeur et sa vitesse. */
function spring(value: number, rate: number, target: number, stiffness: number, damping: number, dt: number): [number, number] {
  const nextRate = rate + (stiffness * (target - value) - damping * rate) * dt;
  return [value + nextRate * dt, nextRate];
}

/** Rapproche `value` de `target` avec une constante de temps (s). */
const approach = (value: number, target: number, timeConstant: number, dt: number) => value + (target - value) * (1 - Math.exp(-dt / timeConstant));

/** Avance l'animation d'un pas de temps. La navigation n'en dépend pas : c'est uniquement visuel. */
export function stepMotion(previous: BoatMotion, input: BoatMotionInput, tuning: BoatMotionTuning = MOTION_TUNING): BoatMotion {
  const state = { ...previous };
  if (input.dt <= 0) return state;
  const steps = Math.max(1, Math.ceil(input.dt / MAX_STEP));
  const dt = input.dt / steps;
  const rawAcceleration = (input.speed - state.lastSpeed) / input.dt;
  state.lastSpeed = input.speed;
  state.acceleration = approach(state.acceleration, clamp(rawAcceleration, -4, 4), 0.25, input.dt);

  const underway = !input.moored && input.speed > 0.05;
  const speedShare = clamp(input.speed / CRUISE_SPEED, 0, 1);
  const pitchTarget = clamp(input.wavePitch - tuning.cruiseTrim * speedShare - tuning.accelerationTrim * state.acceleration, -0.14, 0.1);
  const leanShare = clamp(input.speed / 3, 0.3, 1);
  const rollTarget = input.waveRoll + clamp(-tuning.lean * input.lateral * leanShare, -tuning.maxLean, tuning.maxLean);
  const steerTarget = input.moored ? 0 : -clamp(input.steer, -1, 1) * tuning.maxOutboardYaw;
  const spinTarget = underway ? Math.min(tuning.maxPropellerSpeed, tuning.propellerIdle + tuning.propellerPerSpeed * input.speed) : 0;

  for (let i = 0; i < steps; i += 1) {
    const t = input.time - input.dt + (i + 1) * dt;
    const swayPitch = tuning.swayPitch * Math.sin(t * 0.93 + 1.1);
    const swayRoll = tuning.swayRoll * Math.sin(t * 1.17);
    const swayHeave = tuning.swayHeave * Math.sin(t * 1.6 + 0.4);
    [state.pitch, state.pitchRate] = spring(state.pitch, state.pitchRate, pitchTarget + swayPitch, 26, 7, dt);
    [state.roll, state.rollRate] = spring(state.roll, state.rollRate, rollTarget + swayRoll, 20, 5.2, dt);
    [state.heave, state.heaveRate] = spring(state.heave, state.heaveRate, swayHeave, 30, 9, dt);
    state.outboardYaw = approach(state.outboardYaw, steerTarget, 0.18, dt);
    state.propellerSpeed = approach(state.propellerSpeed, spinTarget, spinTarget > state.propellerSpeed ? 0.45 : 0.8, dt);
    state.propeller = (state.propeller + state.propellerSpeed * dt) % (Math.PI * 2);
  }
  return state;
}
