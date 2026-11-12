// Géométrie du monde de Léo : chaussées, voies, destinations et empreinte du
// véhicule. Aucune dépendance à Phaser : tout est pur et testable.
//
// Repère : x vers la droite, y vers le bas (comme Phaser). Cap 0 = vers la droite,
// cap négatif = virage à gauche (sens antihoraire à l'écran).

// Le prototype représente maintenant un long parcours : 1 unité Phaser = 1 mètre.
// La caméra suit Léo, les destinations sont espacées comme de vraies étapes.
export const WORLD_WIDTH = 12000;
export const WORLD_HEIGHT = 900;

export const ROAD_Y = 600;
export const ROAD_WIDTH = 140;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
export const ROAD_EDGE_MARGIN = 8;
/** Marge issue de l'empreinte visuelle des roues, commune à tous les profils. */
export const WHEEL_CONTACT_OFFSET = 34;
/** Hauteur visuelle maximale des véhicules de trafic (famille : 58 px). */
export const TRAFFIC_VISUAL_HALF_HEIGHT = 29;
export const LANE_CENTER_OFFSET = Math.max(
  ROAD_HALF_WIDTH - WHEEL_CONTACT_OFFSET - ROAD_EDGE_MARGIN,
  TRAFFIC_VISUAL_HALF_HEIGHT + 1,
);
export const LANE_OFFSET = LANE_CENTER_OFFSET;
export const MAIN_LANE_Y = ROAD_Y + LANE_OFFSET;
export const ONCOMING_LANE_Y = ROAD_Y - LANE_OFFSET;
export const INTERSECTION_X = 930;
export const BRANCH_LANE_X = INTERSECTION_X + LANE_OFFSET;
export const BRANCH_TOP_Y = 220;
export const MAIN_ROAD_X_MIN = 40;
export const MAIN_ROAD_X_MAX = WORLD_WIDTH - 40;
export const ROUTE_LENGTH_METERS = MAIN_ROAD_X_MAX - MAIN_ROAD_X_MIN;

// Empreinte logique du véhicule (rectangle orienté), indépendante de l'illustration.
export const VEHICLE_LENGTH = 84;
export const VEHICLE_WIDTH = 40;

export type TrafficVehicleKind = "family" | "compact" | "sedan" | "city-bus" | "school-bus" | "taxi" | "minibus";

export interface TrafficVehicleSpec {
  kind: TrafficVehicleKind;
  assetKey: string;
  width: number;
  height: number;
  speed: number;
}

/** Catalogue léger : les dimensions visuelles sont séparées de l'empreinte de Léo. */
export const TRAFFIC_VEHICLES: readonly TrafficVehicleSpec[] = [
  { kind: "family", assetKey: "leo-traffic-family-blue", width: 128, height: 58, speed: 110 },
  { kind: "compact", assetKey: "leo-traffic-compact-green", width: 112, height: 56, speed: 128 },
  { kind: "sedan", assetKey: "leo-traffic-sedan-gray", width: 126, height: 56, speed: 118 },
  { kind: "city-bus", assetKey: "leo-traffic-city-bus", width: 190, height: 52, speed: 84 },
  { kind: "school-bus", assetKey: "leo-traffic-school-bus", width: 180, height: 54, speed: 92 },
  { kind: "taxi", assetKey: "leo-traffic-taxi", width: 116, height: 56, speed: 142 },
  { kind: "minibus", assetKey: "leo-traffic-minibus", width: 156, height: 52, speed: 102 },
];

export const START_POSITION = { x: 300, y: MAIN_LANE_Y } as const;

export interface LeoDestination {
  id: string;
  label: string;
  /** Centre de la zone d'arrêt, sur la chaussée. */
  stop: { x: number; y: number };
  radius: number;
  /** Position de l'illustration de la maison. */
  house: { x: number; y: number };
}

export const DESTINATIONS: readonly LeoDestination[] = [
  {
    id: "house-1",
    label: "Maison 1",
    stop: { x: BRANCH_LANE_X, y: 340 },
    radius: 70,
    house: { x: BRANCH_LANE_X, y: 265 },
  },
  {
    id: "house-2",
    label: "Maison 2",
    stop: { x: 1250, y: MAIN_LANE_Y },
    radius: 70,
    house: { x: 1250, y: 805 },
  },
  {
    id: "house-3",
    label: "Maison 3",
    stop: { x: 1560, y: MAIN_LANE_Y },
    radius: 70,
    house: { x: 1560, y: 805 },
  },
  ...[2600, 3800, 5100, 6400, 7700, 9000, 10300, 11600].map((x, index) => ({
    id: `house-${index + 4}`,
    label: `Maison ${index + 4}`,
    stop: { x, y: MAIN_LANE_Y },
    radius: 70,
    house: { x, y: 805 },
  })),
];

export interface VehiclePose {
  x: number;
  y: number;
  heading: number;
}

export function normalizeAngle(angle: number) {
  const full = Math.PI * 2;
  let value = (angle + Math.PI) % full;
  if (value < 0) value += full;
  return value - Math.PI;
}

/** Point situé sur une chaussée (route principale ou branche). */
export function isLeoRoadPoint(x: number, y: number) {
  const onMainRoad = x >= MAIN_ROAD_X_MIN && x <= MAIN_ROAD_X_MAX && Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH;
  const onBranch = y >= BRANCH_TOP_Y && y <= ROAD_Y + ROAD_HALF_WIDTH && Math.abs(x - INTERSECTION_X) <= ROAD_HALF_WIDTH;
  return onMainRoad || onBranch;
}

/** Empreinte rectangulaire d'un véhicule de trafic, calculée dans le même
 * repère que la chaussée et indépendante des marges transparentes du PNG. */
export function isTrafficVehicleOnRoad(x: number, y: number, width: number, height: number) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    [x - halfWidth, y - halfHeight],
    [x + halfWidth, y - halfHeight],
    [x + halfWidth, y + halfHeight],
    [x - halfWidth, y + halfHeight],
  ].every(([pointX, pointY]) => isLeoRoadPoint(pointX, pointY));
}

/** Les quatre coins du rectangle représentant le véhicule. */
export function vehicleCorners(pose: VehiclePose): Array<[number, number]> {
  const cos = Math.cos(pose.heading);
  const sin = Math.sin(pose.heading);
  const hl = VEHICLE_LENGTH / 2;
  const hw = VEHICLE_WIDTH / 2;
  return ([[hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]] as const).map(([lx, ly]) => [
    pose.x + lx * cos - ly * sin,
    pose.y + lx * sin + ly * cos,
  ]);
}

/** Vrai si toute l'empreinte du véhicule (coins et milieux des côtés) est sur la chaussée. */
export function isVehicleOnRoad(pose: VehiclePose) {
  const corners = vehicleCorners(pose);
  const points: Array<[number, number]> = [[pose.x, pose.y], ...corners];
  for (let index = 0; index < corners.length; index += 1) {
    const [ax, ay] = corners[index];
    const [bx, by] = corners[(index + 1) % corners.length];
    points.push([(ax + bx) / 2, (ay + by) / 2]);
  }
  return points.every(([x, y]) => isLeoRoadPoint(x, y));
}

export type LeoLane = "main-right" | "main-left" | "branch-right" | "branch-left" | "intersection" | "off-road";

/**
 * Voie occupée par le centre du véhicule. Circulation à droite : voie droite de la
 * route principale = moitié basse quand on roule vers la droite ; voie droite de la
 * branche = moitié droite quand on monte. Information seulement : aucune assistance
 * ne s'en sert pour décider à la place de l'enfant.
 */
export function laneAt(x: number, y: number): LeoLane {
  if (!isLeoRoadPoint(x, y)) return "off-road";
  const inJunction = Math.abs(x - INTERSECTION_X) <= ROAD_HALF_WIDTH && Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH;
  if (inJunction) return "intersection";
  if (Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH) return y >= ROAD_Y ? "main-right" : "main-left";
  return x >= INTERSECTION_X ? "branch-right" : "branch-left";
}

/** La voiture roule-t-elle dans le bon sens pour la voie qu'elle occupe ? */
export function isInCorrectLane(pose: VehiclePose) {
  const lane = laneAt(pose.x, pose.y);
  const east = Math.cos(pose.heading);
  const north = -Math.sin(pose.heading);
  if (lane === "main-right") return east >= 0;
  if (lane === "main-left") return east <= 0;
  if (lane === "branch-right") return north >= 0;
  if (lane === "branch-left") return north <= 0;
  return true;
}

export function distanceTo(x: number, y: number, target: { x: number; y: number }) {
  return Math.hypot(x - target.x, y - target.y);
}

export function isInsideDestination(x: number, y: number, destination: LeoDestination) {
  return distanceTo(x, y, destination.stop) <= destination.radius;
}

/** Destination à livrer quand `deliveredCount` maisons sont déjà servies. */
export function destinationAt(deliveredCount: number) {
  return DESTINATIONS[Math.min(deliveredCount, DESTINATIONS.length - 1)];
}

/**
 * La livraison n'est possible qu'à l'arrêt complet, dans la zone de la maison
 * en cours : arrêté devant une autre maison, elle ne compte pas.
 */
export function canDeliver(x: number, y: number, speed: number, deliveredCount: number) {
  if (deliveredCount >= DESTINATIONS.length) return false;
  return speed === 0 && isInsideDestination(x, y, destinationAt(deliveredCount));
}
