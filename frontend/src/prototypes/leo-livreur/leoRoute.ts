// Navigation de Léo : distance restante par le réseau routier et odomètre. Pur (sans Phaser).
//
// Le réseau est un graphe de nœuds (points de la ligne centrale) reliés par des segments praticables. La distance
// restante est le plus court chemin dans ce graphe (Dijkstra), jamais une distance à vol d'oiseau. Le monde actuel n'a
// qu'une chaussée principale, mais le calcul accepte tout réseau : une route secondaire s'ajoute sans changer l'algorithme.

import { MAIN_ROAD_X_MIN, ROAD_Y, WORLD_WIDTH } from "./leoGeometry";
import { metersToPx } from "./leoUnits";

export interface RoadNode {
  id: string;
  x: number;
  y: number;
}

export interface RoadNetwork {
  nodes: readonly RoadNode[];
  /** Segments praticables dans les deux sens, par identifiants de nœuds. */
  segments: ReadonlyArray<readonly [string, string]>;
}

interface Point {
  x: number;
  y: number;
}

/** Réseau du monde actuel : la chaussée principale, du restaurant jusqu'au bout du monde. */
export const MAIN_ROAD_NETWORK: RoadNetwork = {
  nodes: [
    { id: "ouest", x: MAIN_ROAD_X_MIN, y: ROAD_Y },
    { id: "est", x: WORLD_WIDTH, y: ROAD_Y },
  ],
  segments: [["ouest", "est"]],
};

interface Projection {
  segment: number;
  /** Distance depuis le premier nœud du segment, le long du segment. */
  along: number;
  length: number;
  gap: number;
}

function project(network: RoadNetwork, byId: Map<string, RoadNode>, point: Point): Projection {
  let best: Projection | null = null;
  network.segments.forEach(([fromId, toId], segment) => {
    const a = byId.get(fromId);
    const b = byId.get(toId);
    if (!a || !b) throw new Error(`segment ${fromId}-${toId} inconnu`);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length)));
    const gap = Math.hypot(a.x + dx * t - point.x, a.y + dy * t - point.y);
    if (!best || gap < best.gap) best = { segment, along: t * length, length, gap };
  });
  if (!best) throw new Error("réseau routier vide");
  return best;
}

/**
 * Longueur (px) du plus court chemin routier entre deux points, chacun ramené sur le segment le plus proche.
 * Déterministe ; Dijkstra simple, suffisant pour quelques dizaines de nœuds.
 */
export function roadDistance(network: RoadNetwork, from: Point, to: Point): number {
  const byId = new Map(network.nodes.map((node) => [node.id, node]));
  const start = project(network, byId, from);
  const end = project(network, byId, to);
  if (start.segment === end.segment) return Math.abs(start.along - end.along);

  const [startA, startB] = network.segments[start.segment];
  const [endA, endB] = network.segments[end.segment];
  const distances = new Map<string, number>([
    [startA, start.along],
    [startB, start.length - start.along],
  ]);
  if (startA === startB) distances.set(startA, Math.min(start.along, start.length - start.along));
  const done = new Set<string>();
  const length = (a: string, b: string) => {
    const na = byId.get(a) as RoadNode;
    const nb = byId.get(b) as RoadNode;
    return Math.hypot(nb.x - na.x, nb.y - na.y);
  };
  for (;;) {
    let current: string | null = null;
    for (const [id, distance] of distances) {
      if (!done.has(id) && (current === null || distance < (distances.get(current) as number))) current = id;
    }
    if (current === null) break;
    done.add(current);
    const base = distances.get(current) as number;
    for (const [a, b] of network.segments) {
      const next = a === current ? b : b === current ? a : null;
      if (next === null || done.has(next)) continue;
      const candidate = base + length(current, next);
      if (candidate < (distances.get(next) ?? Number.POSITIVE_INFINITY)) distances.set(next, candidate);
    }
  }
  const viaA = (distances.get(endA) ?? Number.POSITIVE_INFINITY) + end.along;
  const viaB = (distances.get(endB) ?? Number.POSITIVE_INFINITY) + (end.length - end.along);
  return Math.min(viaA, viaB);
}

/**
 * Odomètre : il ne compte que le déplacement réel du véhicule, en avant comme en arrière. Il avance par pas d'au moins
 * ODOMETER_STEP depuis le dernier point retenu : les petits allers-retours du rebond contre un obstacle (quelques
 * centimètres) ne s'additionnent donc jamais en kilomètres fictifs. Erreur maximale : un pas (1 m).
 */
export const ODOMETER_STEP = metersToPx(1);

export interface OdometerState {
  /** Distance cumulée retenue, en px. */
  total: number;
  anchorX: number;
  anchorY: number;
}

export function createOdometer(x: number, y: number): OdometerState {
  return { total: 0, anchorX: x, anchorY: y };
}

export function advanceOdometer(state: OdometerState, x: number, y: number): OdometerState {
  const step = Math.hypot(x - state.anchorX, y - state.anchorY);
  if (step < ODOMETER_STEP) return state;
  return { total: state.total + step, anchorX: x, anchorY: y };
}

/** Point repris ailleurs sans rouler (retour automatique au restaurant) : rien n'est compté. */
export function moveOdometerAnchor(state: OdometerState, x: number, y: number): OdometerState {
  return { ...state, anchorX: x, anchorY: y };
}

/**
 * Décalage signé le long de la route, de `from` vers `to` : positif quand `to` est devant (sens de la tournée, vers
 * l'est sur la chaussée principale), négatif quand il est derrière. Sur deux segments différents, le réseau ne
 * définit pas de sens commun : on renvoie alors la distance routière (positive).
 */
export function signedRoadOffset(network: RoadNetwork, from: Point, to: Point): number {
  const byId = new Map(network.nodes.map((node) => [node.id, node]));
  const start = project(network, byId, from);
  const end = project(network, byId, to);
  if (start.segment === end.segment) return end.along - start.along;
  return roadDistance(network, from, to);
}

// ---------------------------------------------------------------- Destination et zone de livraison

/** Position de la destination par rapport à Léo : devant, dans la zone de livraison, ou entièrement dépassée. */
export type DestinationStatus = "ahead" | "zone" | "passed";

export interface DeliveryZoneTarget {
  /** Centre de la zone de livraison, sur la chaussée. */
  stop: Point;
  /** Demi-longueur de la zone le long de la route (px). */
  radius: number;
}

export interface DestinationProgress {
  status: DestinationStatus;
  /** Distance (px) jusqu'à l'entrée de la zone ; 0 dans la zone et après. Jamais négative. */
  remainingPx: number;
  /** Décalage signé (px) du centre de la zone par rapport au centre de Léo : négatif quand il est derrière. */
  offsetPx: number;
}

/** Tolérance (px) des calculs le long de la route : l'arrondi de la projection sur la très longue chaussée. */
const ROUTE_EPSILON = 1e-3;

/**
 * Où en est Léo par rapport à une destination, d'après sa seule position (aucune mémoire) : le dépassement est donc
 * reconnu même si une seule mise à jour fait sauter la voiture par-dessus toute la zone.
 * - devant : le centre de Léo n'a pas atteint l'entrée de la zone ;
 * - zone : il l'a atteinte, et l'arrière de la voiture n'a pas encore quitté la zone ;
 * - dépassée : l'arrière de la voiture a franchi la fin de la zone.
 * Atteindre la zone ne livre rien : la livraison demande l'arrêt complet puis LIVRER.
 */
export function destinationProgress(network: RoadNetwork, car: Point, target: DeliveryZoneTarget, vehicleLength: number): DestinationProgress {
  const offsetPx = signedRoadOffset(network, car, target.stop);
  const toEntry = offsetPx - target.radius;
  if (toEntry > ROUTE_EPSILON) return { status: "ahead", remainingPx: toEntry, offsetPx };
  const rearBeyondEnd = -offsetPx - target.radius - vehicleLength / 2;
  return { status: rearBeyondEnd > ROUTE_EPSILON ? "passed" : "zone", remainingPx: 0, offsetPx };
}

/**
 * Nombre de destinations, prises dans l'ordre de la tournée, que Léo a entièrement dépassées à cette position. On
 * s'arrête à la première qui ne l'est pas : une maison plus loin n'est jamais comptée avant celle qui la précède.
 */
export function passedInOrder(network: RoadNetwork, car: Point, targets: readonly DeliveryZoneTarget[], vehicleLength: number) {
  let count = 0;
  while (count < targets.length && destinationProgress(network, car, targets[count], vehicleLength).status === "passed") count += 1;
  return count;
}
