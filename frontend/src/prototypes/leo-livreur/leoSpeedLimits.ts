// Limites de vitesse par zone du monde et vitesse souhaitée du trafic. Pur (sans Phaser).
//
// Chaque zone a une limite (km/h). Un conducteur roule à une fraction de cette limite selon son profil (prudent,
// normal, pressé). Avant d'entrer dans une zone plus lente, il ralentit progressivement (décélération confortable),
// pour arriver à la nouvelle limite au panneau ; en entrant dans une zone plus rapide, il ré-accélère.

import { WORLD_ZONE_WIDTH, zoneForWorldX, type WorldZoneKind } from "./leoWorldZones";
import { kmhToPx, metersToPx, mps2ToPx } from "./leoUnits";
import type { SpeedProfile } from "./leoVehicleCatalog";

/** Limite de vitesse de chaque zone (km/h). */
export const ZONE_SPEED_LIMITS_KMH: Record<WorldZoneKind, number> = {
  village: 50,
  bridge: 70,
  "city-entry": 50,
  residential: 50,
  market: 50,
  school: 30,
};

/** Fraction de la limite visée par chaque profil de conducteur : prudent, normal, pressé (léger excès). */
export const DRIVER_FACTORS: Record<SpeedProfile, readonly [number, number]> = {
  slow: [0.8, 0.9],
  normal: [0.9, 1.0],
  fast: [1.0, 1.08],
};

/**
 * Décélération prévue pour arriver à la limite d'une zone plus lente : 1,2 m/s² (douce).
 */
export const ANTICIPATION_DECELERATION = mps2ToPx(1.2);
/** Distance sur laquelle un conducteur regarde la limite suivante : 150 m. */
export const ANTICIPATION_DISTANCE = metersToPx(150);

/** Limite de vitesse (px/s) à l'abscisse x. */
export function speedLimitAt(x: number) {
  return kmhToPx(ZONE_SPEED_LIMITS_KMH[zoneForWorldX(x).kind]);
}

/**
 * Limite à respecter dès maintenant pour un véhicule en x roulant dans `direction` (+1 est, -1 ouest) : la limite de
 * la zone courante, et pour chaque changement de zone plus lent devant (jusqu'à ANTICIPATION_DISTANCE), la vitesse
 * qui permet d'y arriver à la nouvelle limite en freinant confortablement : √(limite² + 2 · b · d).
 */
export function anticipatedLimit(x: number, direction: 1 | -1) {
  let limit = speedLimitAt(x);
  const zone = zoneForWorldX(x);
  let boundary = direction > 0 ? zone.endX : zone.startX;
  while (Math.abs(boundary - x) <= ANTICIPATION_DISTANCE && boundary > 0) {
    const distance = Math.abs(boundary - x);
    const next = speedLimitAt(boundary + direction);
    limit = Math.min(limit, Math.sqrt(next * next + 2 * ANTICIPATION_DECELERATION * distance));
    boundary += direction * WORLD_ZONE_WIDTH;
  }
  return limit;
}

/** Facteur de conducteur tiré au hasard dans la plage de son profil. */
export function driverFactor(profile: SpeedProfile, random: () => number) {
  const [low, high] = DRIVER_FACTORS[profile];
  return low + random() * (high - low);
}
