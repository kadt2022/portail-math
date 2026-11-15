// Unités physiques de Léo le livreur. Pur (sans Phaser).
//
// Le monde du jeu reste en pixels (positions des maisons, des feux, des carrefours : inchangées). Toutes les
// grandeurs physiques sont DÉCLARÉES en unités réelles (m, s, m/s, m/s², km/h) puis converties ici, à la source.
//
// Échelle : 1 m = PX_PER_METER px, déduite de la voiture de Léo (132 px) et de la longueur de la voiture de
// référence. Vérifiée sur les autres véhicules dessinés à la même échelle (voir assets/leo-units-v1.md).

import { LEO_LENGTH_PX } from "./leoVehicleCatalog";

/**
 * Voiture de référence de Léo : Fiat 500 1.2 69 ch (génération 312, restylée 2015).
 * Fiches techniques consultées : auto-data.net (longueur 3 571 mm, 0-100 km/h 12,9 s, 160 km/h, 865 kg à vide),
 * L'argus et La Centrale (longueur 3,57 m ; masse 865 à 960 kg selon la finition).
 */
export const REFERENCE_CAR = {
  name: "Fiat 500 1.2 69 ch (312, 2015)",
  lengthMeters: 3.571,
  zeroTo100Seconds: 12.9,
  topSpeedKmh: 160,
  massKg: 865,
} as const;

/** Pixels du monde par mètre réel (≈ 36,96). */
export const PX_PER_METER = LEO_LENGTH_PX / REFERENCE_CAR.lengthMeters;
/** Accélération de la pesanteur (m/s²). */
export const GRAVITY = 9.81;

export const metersToPx = (meters: number) => meters * PX_PER_METER;
export const pxToMeters = (px: number) => px / PX_PER_METER;
/** m/s -> px/s. */
export const mpsToPx = (metersPerSecond: number) => metersPerSecond * PX_PER_METER;
/** m/s² -> px/s². */
export const mps2ToPx = (metersPerSecondSquared: number) => metersPerSecondSquared * PX_PER_METER;
export const kmhToMps = (kmh: number) => kmh / 3.6;
export const mpsToKmh = (metersPerSecond: number) => metersPerSecond * 3.6;
/** km/h -> px/s. */
export const kmhToPx = (kmh: number) => mpsToPx(kmhToMps(kmh));
/** px/s -> km/h. */
export const pxToKmh = (pxPerSecond: number) => mpsToKmh(pxToMeters(pxPerSecond));
