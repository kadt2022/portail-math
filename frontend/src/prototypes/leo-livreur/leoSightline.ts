// Visibilité des feux : distance à voir, cadrage de la caméra et indicateur d'approche. Pur (sans Phaser).
//
// Principe : l'enfant doit apercevoir le feu AVANT d'atteindre sa distance de freinage. La distance
// nécessaire se calcule avec la vraie physique de la voiture (le modèle de conduite lui-même, pas une
// formule approchée), un temps de réaction d'enfant et une marge de sécurité. La physique n'est jamais
// modifiée pour y parvenir : on ajuste le cadrage.

import { CITY_SPEED_LIMIT, MAX_SPEED, updateLeoMotion } from "./leoDriving";
import { MAIN_LANE_Y, VEHICLE_LENGTH, WORLD_HEIGHT } from "./leoGeometry";
import type { LightState } from "./leoTrafficLight";
import { pxToMeters } from "./leoUnits";

/** Temps de réaction d'un enfant avant d'appuyer sur Freiner (un adulte : environ 0,75 s). */
export const CHILD_REACTION_SECONDS = 1.2;
/** Marge de sécurité ajoutée à la distance d'arrêt : 2,7 m (100 px du monde). */
export const SIGHT_MARGIN = 100;

const brakingCache = new Map<number, number>();

/**
 * Distance parcourue par la voiture de Léo pour s'immobiliser en freinant à fond depuis `speed`, en incluant
 * l'enfoncement progressif de la pédale. Mesurée en faisant tourner le modèle de conduite réel.
 */
export function brakingDistance(speed: number) {
  const key = Math.round(Math.max(0, speed) / 5) * 5;
  const cached = brakingCache.get(key);
  if (cached !== undefined) return cached;
  let state = { x: 1000, y: MAIN_LANE_Y, speed: key, heading: 0, steeringAngle: 0, brakeLevel: 0 };
  let distance = 0;
  for (let frame = 0; frame < 3000 && state.speed > 0; frame += 1) {
    const next = updateLeoMotion(state, { left: false, right: false, forward: false, brake: true, reverse: false }, 1 / 60);
    distance += next.x - state.x;
    state = { ...next, brakeLevel: next.brakeLevel ?? 0 };
  }
  brakingCache.set(key, distance);
  return distance;
}

const reactionCache = new Map<number, { distance: number; speed: number }>();

/**
 * Ce que fait la voiture pendant que l'enfant réagit : il garde Avancer enfoncé (cas le plus défavorable) et la
 * voiture continue d'accélérer. Mesuré, lui aussi, avec le vrai modèle de conduite.
 */
export function reactionPhase(speed: number) {
  const key = Math.round(Math.max(0, speed) / 5) * 5;
  const cached = reactionCache.get(key);
  if (cached) return cached;
  let state = { x: 1000, y: MAIN_LANE_Y, speed: key, heading: 0, steeringAngle: 0, brakeLevel: 0 };
  const start = state.x;
  for (let frame = 0; frame < Math.round(CHILD_REACTION_SECONDS * 60); frame += 1) {
    const next = updateLeoMotion(state, { left: false, right: false, forward: true, brake: false, reverse: false }, 1 / 60);
    state = { ...next, brakeLevel: next.brakeLevel ?? 0 };
  }
  const result = { distance: state.x - start, speed: state.speed };
  reactionCache.set(key, result);
  return result;
}

/**
 * Distance (du pare-chocs avant à la ligne d'arrêt) à laquelle le feu doit être visible pour pouvoir s'arrêter :
 * distance parcourue pendant la réaction (voiture qui accélère encore), puis freinage à fond depuis la vitesse
 * atteinte, plus une marge de sécurité.
 */
export function requiredSightDistance(speed: number) {
  const reaction = reactionPhase(Math.max(0, speed));
  return reaction.distance + brakingDistance(reaction.speed) + SIGHT_MARGIN;
}

/** La plus grande distance utile : vitesse maximale de la voiture. L’indicateur d’approche s’affiche dès cette distance. */
export const MAX_SIGHT_DISTANCE = requiredSightDistance(MAX_SPEED);

/** Vitesse jusqu’à laquelle la caméra garantit de voir le feu à temps : la limite de la route (50 km/h). */
export const FRAMED_SPEED = CITY_SPEED_LIMIT;

/** Position de Léo dans l'écran quand il avance (fraction de la largeur, depuis le bord dans son sens de marche). */
export const LOOK_AHEAD_RATIO = 0.3;
/** Léo peut être poussé jusqu'ici quand la route devant doit être vue de plus loin. */
export const MIN_LOOK_RATIO = 0.15;
/**
 * Le cadrage ne dézoome jamais au-delà de ce facteur. Avec un freinage réaliste (0,8 g) et une voiture qui peut
 * dépasser 50 km/h pendant le temps de réaction (Avancer encore enfoncé), il faut voir le feu à environ 41 m à la
 * limite de la route : sur un mobile étroit, la caméra doit pouvoir dézoomer jusqu’à 0,5.
 */
export const MIN_LOOK_ZOOM = 0.5;

export interface Framing {
  /** Fraction de la largeur de l'écran, depuis le bord opposé au sens de marche, où se trouve Léo. */
  ratio: number;
  /** Facteur de zoom (≤ 1) pour élargir le champ quand le recadrage seul ne suffit pas. */
  zoomFactor: number;
}

/**
 * Cadrage à anticiper : Léo à 30 % de l'écran quand il roule, davantage de route devant. À grande vitesse,
 * si la distance de visibilité nécessaire ne tient pas dans l'écran, Léo recule vers le bord (jusqu'à 15 %)
 * puis le champ s'élargit un peu (jusqu'à 0,7), sans jamais toucher à la vitesse ni au freinage.
 * `viewWidth` est la largeur du monde visible avec le zoom de base, avant cet ajustement.
 */
export function lookAheadFraming(speed: number, viewWidth: number): Framing {
  // La caméra garantit la vue jusqu’à la vitesse limite de la route. Au-delà (voiture jusqu’à 120 km/h), la distance
  // d’arrêt dépasse ce qu’un écran peut montrer : c’est la conséquence physique d’un excès de vitesse, signalée par
  // l’indicateur d’approche (READOUT_RANGE), qui annonce le feu dès la distance d’arrêt à 120 km/h.
  const needed = requiredSightDistance(Math.min(speed, FRAMED_SPEED)) + VEHICLE_LENGTH / 2;
  if ((1 - LOOK_AHEAD_RATIO) * viewWidth >= needed) return { ratio: LOOK_AHEAD_RATIO, zoomFactor: 1 };
  const ratio = Math.max(MIN_LOOK_RATIO, 1 - needed / viewWidth);
  if ((1 - ratio) * viewWidth >= needed) return { ratio, zoomFactor: 1 };
  const zoomFactor = Math.max(MIN_LOOK_ZOOM, Math.min(1, ((1 - MIN_LOOK_RATIO) * viewWidth) / needed));
  return { ratio: MIN_LOOK_RATIO, zoomFactor };
}

/**
 * Cadrage de jeu : le zoom ne dépend JAMAIS de la vitesse (Avancer ne dézoome pas, Freiner ne rezoome pas). Il est
 * fixé une fois pour la taille de l'écran : celui qui permet de voir le feu à temps à la limite de la route. Seule la
 * position de Léo dans l'écran glisse doucement (davantage de route devant quand il roule plus vite).
 */
export function steadyFraming(speed: number, viewWidth: number, viewHeight?: number): Framing {
  // Jamais plus de recul que la hauteur du monde : sinon la scène se remplit de vide et tout devient minuscule
  // (téléphone en portrait). Sur ces écrans, le feu est alors annoncé par l'indicateur avant d'être visible.
  const fillHeight = viewHeight === undefined ? 0 : Math.min(1, viewHeight / WORLD_HEIGHT);
  const zoomFactor = Math.max(lookAheadFraming(FRAMED_SPEED, viewWidth).zoomFactor, fillHeight);
  const width = viewWidth / zoomFactor;
  const needed = requiredSightDistance(Math.min(Math.max(speed, 0), FRAMED_SPEED)) + VEHICLE_LENGTH / 2;
  const ratio = Math.min(LOOK_AHEAD_RATIO, Math.max(MIN_LOOK_RATIO, 1 - needed / width));
  return { ratio, zoomFactor };
}

/** Distance du monde visible devant Léo, du centre du véhicule au bord de l'écran dans son sens de marche. */
export function visibleAhead(framing: Framing, viewWidth: number) {
  return ((1 - framing.ratio) * viewWidth) / framing.zoomFactor;
}

/** Rapproche `current` de `target` sans à-coup (lissage exponentiel indépendant du nombre d'images par seconde). */
export function smoothToward(current: number, target: number, rate: number, seconds: number) {
  const k = 1 - Math.exp(-rate * Math.max(0, seconds));
  return current + (target - current) * k;
}

/** Sens de la route à montrer : +1 vers l'est (Léo avance), -1 vers l'ouest (il recule). Reste en l'état à l'arrêt. */
export function lookDirection(previous: 1 | -1, speedAlongRoad: number, threshold = 25): 1 | -1 {
  if (speedAlongRoad > threshold) return 1;
  if (speedAlongRoad < -threshold) return -1;
  return previous;
}

/**
 * Abscisse du monde à garder chargée devant (ou derrière) Léo selon le cadrage : le chargement des zones se fait
 * à partir de la vue réelle, pas seulement de la position de la voiture.
 */
export function framedViewRange(leoX: number, direction: 1 | -1, framing: Framing, viewWidth: number) {
  const width = viewWidth / framing.zoomFactor;
  const left = direction > 0 ? leoX - framing.ratio * width : leoX - (1 - framing.ratio) * width;
  return { minX: left, maxX: left + width };
}

// ---------------------------------------------------------------------------------------------
// Indicateur d'approche d'un feu
// ---------------------------------------------------------------------------------------------

export interface SignalReadout {
  /** Distance réelle jusqu’à la ligne d’arrêt, en mètres (arrondie au mètre). */
  distance: number;
  state: LightState;
  /** Vrai quand l'enfant doit se préparer à freiner (feu rouge ou orange, à distance de freinage utile). */
  prepare: boolean;
}

/** Distance à partir de laquelle l'indicateur apparaît : un peu avant la plus longue distance de freinage utile. */
export const READOUT_RANGE = MAX_SIGHT_DISTANCE + 100;

/**
 * Indicateur discret à l'approche du feu. `front` est l'abscisse du pare-chocs avant de Léo (vers l'est),
 * `lineX` celle de la ligne d'arrêt. Rien n'est affiché une fois la ligne dépassée ou si le feu est trop loin.
 */
export function signalReadout(front: number, lineX: number, state: LightState, speed: number): SignalReadout | null {
  const raw = lineX - front;
  if (raw <= 0 || raw > READOUT_RANGE) return null;
  const distance = Math.max(1, Math.round(pxToMeters(raw)));
  // On prévient dès que le feu n'est pas vert et que la distance de freinage utile est en vue.
  const prepare = state !== "GREEN" && raw <= Math.max(requiredSightDistance(Math.max(speed, 120)), 400) + 1;
  return { distance, state, prepare };
}
