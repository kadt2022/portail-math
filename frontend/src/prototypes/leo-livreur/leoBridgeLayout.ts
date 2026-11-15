// Mise en page du pont : tablier, trottoirs, garde-corps et arches, calés sur la chaussée
// physique (ROAD_Y, ROAD_WIDTH). Pur, sans Phaser : les positions sont testables.
//
// Pseudo-3D par couches (de l'arrière vers l'avant) :
//   1. ciel, pylônes et câbles (haut du calque de suspension)
//   2. garde-corps arrière avec lampadaires et jardinières, posé sur le trottoir arrière
//   3. tablier : trottoir arrière, chaussée (lignes blanches et jaune), trottoir avant
//   4. véhicules (profondeur 6 à 10)
//   5. garde-corps avant, devant les véhicules
//   6. arches, piles et rivière (bas du calque de suspension)

import { ROAD_HALF_WIDTH, ROAD_WIDTH, ROAD_Y } from "./leoGeometry";

/** Lignes de leo-world-bridge-deck-v1.webp (1024 × 341) mesurées sur l'image. */
export const DECK = {
  width: 1024,
  height: 341,
  /** Première et dernière lignes opaques : trottoir arrière → trottoir avant. */
  firstRow: 99,
  lastRow: 247,
  /** Asphalte entre les deux lignes blanches : c'est la chaussée du jeu. */
  asphaltTop: 134,
  asphaltBottom: 209,
} as const;

/** Lignes de leo-world-bridge-rail-v1.webp (1024 × 341). */
export const RAIL = {
  width: 1024,
  height: 341,
  /** Semelle de pierre (bas du garde-corps). */
  baseRow: 273,
  /** Haut des lampadaires, et rangée à partir de laquelle il ne reste que le garde-corps. */
  lampTopRow: 58,
  wallTopRow: 176,
} as const;

/** Lignes de leo-world-suspension-bridge-layer-v2.webp (2172 × 724), en fraction de la hauteur. */
export const SUSPENSION = {
  width: 2172,
  height: 724,
  /** Fin de la partie haute (ciel, pylônes, câbles) et début de la partie basse (arches, rivière). */
  topEnd: 0.42,
  bottomStart: 0.61,
} as const;

/** Échelle du garde-corps : un lampadaire ne dépasse pas deux fois la hauteur d'une voiture. */
export const RAIL_SCALE = 0.8;
/** Hauteur affichée du calque de suspension. */
export const SUSPENSION_DISPLAY_HEIGHT = 360;
/** Couleurs de bord du calque (ciel en haut, eau en bas) : prolongent le décor sur un écran haut (téléphone). */
export const SKY_COLOR = 0x53a6fa;
export const WATER_COLOR = 0x36719b;

/**
 * Zone du monde que la caméra veut montrer en entier : 1100 × 720 px. Elle contient la rangée de maisons
 * nord et sud, la route, le pont, les arches et la rivière. L'échelle s'adapte à la taille du cadre.
 */
export const VIEW_WORLD_WIDTH = 1100;
export const VIEW_WORLD_HEIGHT = 720;
/** Sur un petit écran on ne descend pas sous cette échelle : les voitures resteraient illisibles. */
export const MIN_CAMERA_ZOOM = 0.42;

/** Échelle de la caméra pour un cadre de `width` × `height` pixels : tout le décor visible, jamais d'agrandissement. */
export function cameraZoomFor(width: number, height: number) {
  const fit = Math.min(width / VIEW_WORLD_WIDTH, height / VIEW_WORLD_HEIGHT);
  return Math.max(MIN_CAMERA_ZOOM, Math.min(1, fit));
}

/** Décalage de caméra sur le pont pour montrer pylônes et lampadaires sans écraser la rivière. */
export const BRIDGE_CAMERA_OFFSET = 70;

export interface BridgeLayout {
  deckScale: number;
  deckTileWidth: number;
  /** Ordonnée écran de la rangée firstRow du tablier. */
  deckTop: number;
  deckBottom: number;
  railScale: number;
  railTileWidth: number;
  /** Ordonnée de la semelle des garde-corps arrière et avant. */
  backRailBase: number;
  frontRailBase: number;
  suspensionScale: number;
  suspensionWidth: number;
  /** Bas de la partie haute (derrière le garde-corps arrière) et haut de la partie basse (sous le tablier). */
  topPartBottom: number;
  bottomPartTop: number;
}

export function bridgeLayout(): BridgeLayout {
  const deckScale = ROAD_WIDTH / (DECK.asphaltBottom - DECK.asphaltTop);
  const asphaltTop = ROAD_Y - ROAD_HALF_WIDTH;
  const deckTop = asphaltTop - (DECK.asphaltTop - DECK.firstRow) * deckScale;
  const deckBottom = deckTop + (DECK.lastRow - DECK.firstRow + 1) * deckScale;
  const railScale = RAIL_SCALE;
  const sidewalkBackDepth = (DECK.asphaltTop - DECK.firstRow) * deckScale;
  const suspensionScale = SUSPENSION_DISPLAY_HEIGHT / SUSPENSION.height;
  return {
    deckScale,
    deckTileWidth: DECK.width * deckScale,
    deckTop,
    deckBottom,
    railScale,
    railTileWidth: RAIL.width * railScale,
    // Le garde-corps arrière laisse un peu de trottoir visible devant lui ; l'avant se tient au bord du tablier.
    backRailBase: deckTop + sidewalkBackDepth * 0.75,
    frontRailBase: deckBottom - 10,
    suspensionScale,
    suspensionWidth: SUSPENSION.width * suspensionScale,
    topPartBottom: deckTop + sidewalkBackDepth * 0.5,
    bottomPartTop: deckBottom,
  };
}

/** Intensité (0 à 1) de la vue « pont » selon la position de Léo : transition progressive aux deux bouts. */
export function bridgeBlend(x: number, bridgeStartX: number, bridgeEndX: number, ramp = 700) {
  const entering = (x - (bridgeStartX - ramp)) / ramp;
  const leaving = (bridgeEndX + ramp - x) / ramp;
  return Math.max(0, Math.min(1, entering, leaving));
}
