// Zone 3 : entrée de ville. Mise en page pure (sans Phaser), calée sur la chaussée du jeu.
//
// L'illustration de référence (1920 × 819, perspective à trois plans) est découpée en deux
// ressources : le HAUT (immeubles, arbres, avenue secondaire, panneaux, feu, de y = 0 à 470) et
// le BAS (trottoir de premier plan, de y = 651 à 818). La chaussée de l'illustration n'est PAS
// reprise : on garde celle du jeu (tablier, voies, lignes), seule la décoration est adaptée.

import { bridgeBlend, bridgeLayout, DECK } from "./leoBridgeLayout";
import { ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

/** Mesures de l'illustration de référence (pixels de l'image source). */
export const CITY_REF = {
  width: 1920,
  /** Haut conservé : jusqu'à la ligne blanche du bord nord de la chaussée (exclue). */
  topRows: 471,
  /** Bas conservé : à partir du trottoir sud, sous la ligne blanche du bord sud. */
  bottomStartRow: 651,
  bottomRows: 168,
  /** Bouche de l'avenue secondaire sur la chaussée principale (x). */
  avenueMouth: { left: 505, right: 1055 },
  /** Tête du feu tricolore : rectangle et centres des trois lampes. */
  lightHead: { x: 803, y: 74, width: 48, height: 105 },
  lamps: { x: 827, red: 97.5, yellow: 127.5, green: 157.5, radius: 11 },
} as const;

/** Échelle d'affichage : immeubles lisibles sans sortir du haut du monde. */
export const CITY_SCALE = 1.1;
/** La ville commence avant la fin du pont (fondu croisé) : 300 px de recouvrement. */
export const CITY_OVERLAP = 300;
/** Largeur du fondu à chaque bord du panneau. */
export const CITY_FADE = 430;
/** Marge entre le pare-chocs et la ligne d'arrêt. */
export const STOP_LINE_MARGIN = 70;

export const BRIDGE_START_X = 3 * WORLD_ZONE_WIDTH;
export const BRIDGE_END_X = 5 * WORLD_ZONE_WIDTH;

/** Réglages de caméra sur la ville : un peu plus haut et plus large, pour voir les immeubles en entier. */
export const CITY_CAMERA_OFFSET = 180;
export const CITY_ZOOM_FACTOR = 0.82;

export interface CityLayout {
  scale: number;
  /** Abscisse du bord gauche et droit du panneau. */
  panelX: number;
  panelEnd: number;
  panelWidth: number;
  /** Ordonnée du haut de l'image du haut, et ordonnée où elle rejoint la chaussée. */
  topY: number;
  topBottom: number;
  /** Ordonnée où l'image du bas commence (sous la chaussée) et où elle finit. */
  bottomTop: number;
  bottomEnd: number;
  /** Bouche de l'avenue secondaire, en abscisses monde. */
  mouthLeft: number;
  mouthRight: number;
  /** Lignes d'arrêt : vers l'est (voie de Léo) et vers l'ouest (voie opposée). */
  stopLineEast: number;
  stopLineWest: number;
  /** Tête de feu en coordonnées monde (centre et taille). */
  lightX: number;
  lightY: number;
  lightWidth: number;
  lightHeight: number;
  lampOffsets: { red: number; yellow: number; green: number; radius: number };
}

export function cityLayout(): CityLayout {
  const bridge = bridgeLayout();
  const s = CITY_SCALE;
  const panelX = BRIDGE_END_X - CITY_OVERLAP;
  const panelWidth = CITY_REF.width * s;
  // La chaussée du jeu commence à la rangée 127 du tablier : l'image du haut s'arrête là.
  const topBottom = ROAD_Y - ROAD_HALF_WIDTH - (DECK.asphaltTop - 127) * bridge.deckScale;
  const topY = topBottom - CITY_REF.topRows * s;
  const bottomTop = ROAD_Y - ROAD_HALF_WIDTH + (211 - DECK.asphaltTop) * bridge.deckScale;
  const head = CITY_REF.lightHead;
  const toWorldX = (x: number) => panelX + x * s;
  const mouthLeft = toWorldX(CITY_REF.avenueMouth.left);
  const mouthRight = toWorldX(CITY_REF.avenueMouth.right);
  return {
    scale: s,
    panelX,
    panelEnd: panelX + panelWidth,
    panelWidth,
    topY,
    topBottom,
    bottomTop,
    bottomEnd: bottomTop + CITY_REF.bottomRows * s,
    mouthLeft,
    mouthRight,
    stopLineEast: mouthLeft - STOP_LINE_MARGIN,
    stopLineWest: mouthRight + STOP_LINE_MARGIN,
    lightX: toWorldX(head.x + head.width / 2),
    lightY: topY + (head.y + head.height / 2) * s,
    lightWidth: head.width * s,
    lightHeight: head.height * s,
    lampOffsets: {
      red: (CITY_REF.lamps.red - (head.y + head.height / 2)) * s,
      yellow: (CITY_REF.lamps.yellow - (head.y + head.height / 2)) * s,
      green: (CITY_REF.lamps.green - (head.y + head.height / 2)) * s,
      radius: CITY_REF.lamps.radius * s,
    },
  };
}

/**
 * Profil de caméra selon la position de Léo : (décalage vertical, facteur de zoom). Il se compose en
 * douceur : campagne (rien), pont (regarde plus haut), ville (plus haut et plus large).
 */
export function cameraProfile(x: number, bridgeOffset: number) {
  const city = cityLayout();
  const bridge = bridgeBlend(x, BRIDGE_START_X, BRIDGE_END_X);
  const town = bridgeBlend(x, BRIDGE_END_X, city.panelEnd, 800);
  return {
    offset: bridgeOffset * bridge * (1 - town) + CITY_CAMERA_OFFSET * town,
    zoomFactor: 1 - (1 - CITY_ZOOM_FACTOR) * town,
  };
}
