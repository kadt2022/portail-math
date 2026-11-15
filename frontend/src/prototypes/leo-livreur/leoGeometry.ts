// Géométrie du monde de Léo : chaussées, voies, destinations et empreinte du
// véhicule. Aucune dépendance à Phaser : tout est pur et testable.
//
// Repère : x vers la droite, y vers le bas (comme Phaser). Cap 0 = vers la droite,
// cap négatif = virage à gauche (sens antihoraire à l'écran).

// Le prototype représente maintenant un long parcours : 1 unité Phaser = 1 mètre.
// La caméra suit Léo, les destinations sont espacées comme de vraies étapes.
export const WORLD_WIDTH = 1_000_000_000;
export const WORLD_HEIGHT = 960;

export const ROAD_Y = 600;
/**
 * Largeur de la chaussée principale, identique pour toute sa longueur.
 */
export const ROAD_WIDTH = 200;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
export const LANE_WIDTH = ROAD_HALF_WIDTH;
/** Centre d'une voie : à mi-chemin entre la ligne centrale et la bordure. */
export const LANE_OFFSET = LANE_WIDTH / 2;
export const MAIN_LANE_Y = ROAD_Y + LANE_OFFSET;
export const ONCOMING_LANE_Y = ROAD_Y - LANE_OFFSET;
export const MAIN_ROAD_X_MIN = 40;
export const MAIN_ROAD_X_MAX = WORLD_WIDTH;
/** Le parcours n'a pas de destination finale; valeur infinie réservée à l'affichage HUD. */
export const ROUTE_LENGTH_METERS = Number.POSITIVE_INFINITY;

/**
 * Empreinte au sol de Léo (rectangle orienté), indépendante de l'illustration.
 * Le point logique est le centre de cette empreinte, donc le centre de la voie ;
 * les pneus du sprite touchent le bord inférieur de l'empreinte (voir leoVehicleCatalog).
 */
export const VEHICLE_LENGTH = 124;
export const VEHICLE_WIDTH = 36;

/** Maisons rapprochées du bord, en conservant une marge hors chaussée. */
export const HOUSE_ROW_Y = 880;

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

const INITIAL_DESTINATIONS: readonly LeoDestination[] = [
  {
    id: "house-1",
    label: "Maison 1",
    stop: { x: 750, y: MAIN_LANE_Y },
    radius: 90,
    house: { x: 750, y: HOUSE_ROW_Y },
  },
  {
    id: "house-2",
    label: "Maison 2",
    stop: { x: 1050, y: MAIN_LANE_Y },
    radius: 90,
    house: { x: 1050, y: HOUSE_ROW_Y },
  },
  {
    id: "house-3",
    label: "Maison 3",
    stop: { x: 1350, y: MAIN_LANE_Y },
    radius: 90,
    house: { x: 1350, y: HOUSE_ROW_Y },
  },
  {
    id: "house-4",
    label: "Maison 4",
    stop: { x: 1650, y: MAIN_LANE_Y },
    radius: 90,
    house: { x: 1650, y: HOUSE_ROW_Y },
  },
  ...[2600, 3800, 5100, 6400, 7700, 9000, 10300, 11600].map((x, index) => ({
    id: `house-${index + 5}`,
    label: `Maison ${index + 5}`,
    stop: { x, y: MAIN_LANE_Y },
    radius: 90,
    house: { x, y: HOUSE_ROW_Y },
  })),
];

export const DESTINATIONS: readonly LeoDestination[] = INITIAL_DESTINATIONS;

const REPEAT_DELIVERY_SPACING = 1050;
export function destinationForDelivery(deliveryIndex: number): LeoDestination {
  if (deliveryIndex < INITIAL_DESTINATIONS.length) return INITIAL_DESTINATIONS[deliveryIndex];
  const repeatIndex = deliveryIndex - INITIAL_DESTINATIONS.length;
  const x = 12800 + repeatIndex * REPEAT_DELIVERY_SPACING;
  return {
    id: `delivery-${deliveryIndex + 1}`,
    label: `Maison ${deliveryIndex + 1}`,
    stop: { x, y: MAIN_LANE_Y },
    radius: 90,
    house: { x, y: HOUSE_ROW_Y },
  };
}

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

/** Point situé sur la chaussée principale, sans route secondaire. */
export function isLeoRoadPoint(x: number, y: number) {
  const onMainRoad = x >= MAIN_ROAD_X_MIN && Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH;
  return onMainRoad;
}

/** Un rectangle au sol (centre, longueur, profondeur) tient-il dans une voie horizontale ? */
export function isFootprintInLane(centerY: number, depth: number, laneY: number, margin = 0) {
  return Math.abs(centerY - laneY) + depth / 2 + margin <= LANE_WIDTH / 2;
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

export type LeoLane = "main-right" | "main-left" | "off-road";

/**
 * Voie occupée par le centre du véhicule. Circulation à droite : voie droite de la
 * route principale = moitié basse quand on roule vers la droite. Information seulement.
 */
export function laneAt(x: number, y: number): LeoLane {
  if (!isLeoRoadPoint(x, y)) return "off-road";
  if (Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH) return y >= ROAD_Y ? "main-right" : "main-left";
  return "off-road";
}

/** La voiture roule-t-elle dans le bon sens pour la voie qu'elle occupe ? */
export function isInCorrectLane(pose: VehiclePose) {
  const lane = laneAt(pose.x, pose.y);
  const east = Math.cos(pose.heading);
  if (lane === "main-right") return east >= 0;
  if (lane === "main-left") return east <= 0;
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
  return destinationForDelivery(deliveredCount);
}

/**
 * La livraison n'est possible qu'à l'arrêt complet, dans la zone de la maison
 * en cours : arrêté devant une autre maison, elle ne compte pas.
 */
export function canDeliver(x: number, y: number, speed: number, deliveredCount: number) {
  return speed === 0 && isInsideDestination(x, y, destinationAt(deliveredCount));
}
