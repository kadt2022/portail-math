// Voies du carrefour de la Zone 3 : chaque voie a une identité, un axe, une direction, une largeur et des
// connexions autorisées. Circulation à droite. Pur (sans Phaser).
//
// Règle fondamentale : la voie de sortie d'une manœuvre est connue AVANT le début du virage, par la table des
// connexions ci-dessous. Un véhicule ne choisit jamais sa voie d'après une approximation de sa position.

import { CITY_REF, cityLayout } from "./leoCityLayout";
import { LANE_WIDTH, MAIN_LANE_Y, MAIN_ROAD_X_MAX, MAIN_ROAD_X_MIN, ONCOMING_LANE_Y, ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";

export type LaneId = "MAIN_EAST" | "MAIN_WEST" | "AVENUE_SOUTH" | "AVENUE_NORTH";
export type LaneDirection = "EAST" | "WEST" | "NORTH" | "SOUTH";
export type Movement = "LEFT" | "RIGHT" | "STRAIGHT";

export interface Point {
  x: number;
  y: number;
}

export interface LaneConnection {
  movement: Movement;
  toLaneId: LaneId;
}

export interface Lane {
  id: LaneId;
  direction: LaneDirection;
  /** Largeur de la voie (px du monde) au niveau de la chaussée principale. */
  width: number;
  /** Axe de la voie : polyligne orientée dans le sens de circulation. */
  centerline: Point[];
  connections: LaneConnection[];
}

/** Manœuvre planifiée : voie d'entrée, mouvement, voie de sortie, trajectoire. Tout est fixé avant de tourner. */
export interface TurnPlan {
  fromLaneId: LaneId;
  toLaneId: LaneId;
  movement: Movement;
  pathId: string;
}

// ---------------------------------------------------------------------------------------------
// Perspective de l'avenue perpendiculaire
// ---------------------------------------------------------------------------------------------

export interface AvenueGeometry {
  /** Ordonnées du point de fuite et du bord de la chaussée principale : l'échelle des objets suit la perspective. */
  vanishY: number;
  mouthY: number;
  farY: number;
  stopY: number;
  edgeY: number;
  /** Largeur de l'avenue à une ordonnée donnée, et axes de ses deux voies. */
  width: (y: number) => number;
  southLaneX: (y: number) => number;
  northLaneX: (y: number) => number;
}

let avenue: AvenueGeometry | null = null;

/**
 * L'avenue de l'illustration converge vers (780, 330) et s'ouvre de 550 px à y = 470 : ses voies suivent cette
 * perspective, en diagonale. La voie descendante (vers le spectateur) est la moitié ouest, circulation à droite.
 */
export function avenueGeometry(): AvenueGeometry {
  if (avenue) return avenue;
  const city = cityLayout();
  const toX = (xImg: number) => city.panelX + xImg * city.scale;
  const toY = (yImg: number) => city.topY + yImg * city.scale;
  const vanishY = 330;
  const mouthY = 470;
  const centerX = (CITY_REF.avenueMouth.left + CITY_REF.avenueMouth.right) / 2;
  const mouthWidth = CITY_REF.avenueMouth.right - CITY_REF.avenueMouth.left;
  const widthImg = (yImg: number) => (mouthWidth * (yImg - vanishY)) / (mouthY - vanishY);
  const yImgOf = (y: number) => (y - city.topY) / city.scale;
  avenue = {
    vanishY: toY(vanishY),
    mouthY: toY(mouthY),
    farY: toY(vanishY + 6),
    stopY: toY(414),
    edgeY: ROAD_Y - ROAD_HALF_WIDTH - 12,
    width: (y) => widthImg(yImgOf(y)) * city.scale,
    southLaneX: (y) => toX(centerX - 0.25 * widthImg(yImgOf(y))),
    northLaneX: (y) => toX(centerX + 0.25 * widthImg(yImgOf(y))),
  };
  return avenue;
}

// ---------------------------------------------------------------------------------------------
// Table des voies
// ---------------------------------------------------------------------------------------------

let table: Record<LaneId, Lane> | null = null;

export function lanes(): Record<LaneId, Lane> {
  if (table) return table;
  const a = avenueGeometry();
  table = {
    MAIN_EAST: {
      id: "MAIN_EAST",
      direction: "EAST",
      width: LANE_WIDTH,
      centerline: [{ x: MAIN_ROAD_X_MIN, y: MAIN_LANE_Y }, { x: MAIN_ROAD_X_MAX, y: MAIN_LANE_Y }],
      connections: [],
    },
    MAIN_WEST: {
      id: "MAIN_WEST",
      direction: "WEST",
      width: LANE_WIDTH,
      centerline: [{ x: MAIN_ROAD_X_MAX, y: ONCOMING_LANE_Y }, { x: MAIN_ROAD_X_MIN, y: ONCOMING_LANE_Y }],
      connections: [],
    },
    AVENUE_SOUTH: {
      id: "AVENUE_SOUTH",
      direction: "SOUTH",
      width: a.width(a.edgeY) / 2,
      centerline: [{ x: a.southLaneX(a.farY), y: a.farY }, { x: a.southLaneX(a.edgeY), y: a.edgeY }],
      // Circulation à droite : depuis l'avenue, on tourne à droite vers la voie ouest, PARALLÈLE à celle de Léo.
      // Il n'existe volontairement aucune connexion vers la voie de Léo (MAIN_EAST) : jamais de virage à gauche.
      connections: [{ movement: "RIGHT", toLaneId: "MAIN_WEST" }],
    },
    AVENUE_NORTH: {
      id: "AVENUE_NORTH",
      direction: "NORTH",
      width: a.width(a.edgeY) / 2,
      centerline: [{ x: a.northLaneX(a.edgeY), y: a.edgeY }, { x: a.northLaneX(a.farY), y: a.farY }],
      connections: [],
    },
  };
  return table;
}

/** Voie principale correspondante pour le trafic ordinaire (pool de véhicules). */
export function mainLaneName(id: LaneId): "same" | "oncoming" | null {
  if (id === "MAIN_EAST") return "same";
  if (id === "MAIN_WEST") return "oncoming";
  return null;
}

/** Sens de circulation d'une voie principale : +1 est, -1 ouest. */
export function laneSign(id: LaneId): 1 | -1 {
  return lanes()[id].direction === "EAST" ? 1 : -1;
}

/**
 * Plan d'une manœuvre : la voie de sortie vient de la table des connexions, jamais de la position du véhicule.
 * Renvoie null si le mouvement n'est pas autorisé depuis cette voie.
 */
export function planTurn(fromLaneId: LaneId, movement: Movement): TurnPlan | null {
  const connection = lanes()[fromLaneId].connections.find((candidate) => candidate.movement === movement);
  if (!connection) return null;
  return { fromLaneId, toLaneId: connection.toLaneId, movement, pathId: `${fromLaneId}>${movement}>${connection.toLaneId}` };
}

/** Ordonnée de l'axe d'une voie principale. */
export function laneCenterY(id: LaneId) {
  return lanes()[id].centerline[0].y;
}
