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
/** Ligne de base des façades côté bas : les maisons reposent sur le jardin derrière le trottoir. */
export const HOUSE_ROW_Y = 865;
export const HOUSE_ROW_NORTH_Y = ROAD_Y - (HOUSE_ROW_Y - ROAD_Y);
/** Façades du côté opposé (nord) : posées à 100 px derrière le bord de la chaussée, toutes à la même largeur. */
export const FAR_SIDE_HOUSE_BASE_Y = ROAD_Y - ROAD_HALF_WIDTH - 100;
export const FAR_SIDE_HOUSE_WIDTH = 210;
/** Façade nord la plus haute : la maison turquoise (image 720 × 480, à la largeur commune). */
export const FAR_SIDE_HOUSE_MAX_HEIGHT = (FAR_SIDE_HOUSE_WIDTH * 480) / 720;
/**
 * Bande de rue que l'enfant doit toujours voir en entier : du toit des maisons nord jusqu'au bas du monde (jardins et
 * maisons du côté sud). Plus basse que le cadre, la caméra coupait les maisons.
 */
export const STREET_VIEW_TOP = FAR_SIDE_HOUSE_BASE_Y - FAR_SIDE_HOUSE_MAX_HEIGHT;
export const STREET_VIEW_HEIGHT = WORLD_HEIGHT - STREET_VIEW_TOP;
export const ZONE1_HOUSE_COUNT = 32;
export const ZONE1_FIRST_HOUSE_X = 500;
export const ZONE1_HOUSE_SPACING = 210;
const ZONE1_SEGMENT_WIDTH = 2400;

/** Évite qu'un grand sprite de maison soit coupé exactement sur une frontière de zone. */
function awayFromZoneBoundary(x: number) {
  const boundary = Math.round(x / ZONE1_SEGMENT_WIDTH) * ZONE1_SEGMENT_WIDTH;
  if (boundary > 0 && Math.abs(x - boundary) < 130) return x + (x < boundary ? -150 : 150);
  return x;
}

export function zone1HouseX(index: number) {
  return awayFromZoneBoundary(ZONE1_FIRST_HOUSE_X + index * ZONE1_HOUSE_SPACING);
}

/**
 * Quartier qui suit la ville : il commence à la fin du panneau du boulevard (zone 4, voir leoBoulevardLayout) et
 * reprend sans fin le décor de la Zone 1 (jardins, arbres, maisons des deux côtés). Ses maisons sont numérotées à la
 * suite de celles de la Zone 1 : 33, 34, 35… Valeur fixée ici pour éviter une dépendance circulaire ; un test
 * vérifie qu'elle reste égale à la fin du panneau du boulevard.
 */
export const SUBURB_START_X = 15_912;
/** Première maison du quartier : assez loin du fondu du boulevard pour ne jamais se superposer à son illustration. */
export const SUBURB_FIRST_HOUSE_X = SUBURB_START_X + 300;

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

/** Les 32 maisons de la Zone 1, réparties avant le pont et dans l'ordre du parcours. */
const INITIAL_DESTINATIONS: readonly LeoDestination[] = Array.from(
  { length: ZONE1_HOUSE_COUNT },
  (_, index) => {
    const x = zone1HouseX(index);
    const houseY = index % 2 === 0 ? HOUSE_ROW_NORTH_Y : HOUSE_ROW_Y;
    return {
      id: `house-${index + 1}`,
      label: `Maison ${index + 1}`,
      stop: { x, y: MAIN_LANE_Y },
      radius: 90,
      house: { x, y: houseY },
    };
  },
);

export const DESTINATIONS: readonly LeoDestination[] = INITIAL_DESTINATIONS;

/**
 * Maison du quartier après la ville, par rang (0 = Maison 33). Même pas et même alternance que la Zone 1 :
 * numéro impair de l'autre côté de la route, numéro pair du côté de Léo.
 */
export function suburbHouse(rank: number): LeoDestination {
  const number = ZONE1_HOUSE_COUNT + rank + 1;
  const x = awayFromZoneBoundary(SUBURB_FIRST_HOUSE_X + rank * ZONE1_HOUSE_SPACING);
  return {
    id: `house-${number}`,
    label: `Maison ${number}`,
    stop: { x, y: MAIN_LANE_Y },
    radius: 90,
    house: { x, y: number % 2 === 1 ? HOUSE_ROW_NORTH_Y : HOUSE_ROW_Y },
  };
}

/** Maisons du quartier dont l'illustration est centrée dans [startX, endX[. */
export function suburbHousesBetween(startX: number, endX: number): LeoDestination[] {
  const first = Math.max(0, Math.floor((startX - SUBURB_FIRST_HOUSE_X - 150) / ZONE1_HOUSE_SPACING));
  const last = Math.floor((endX - SUBURB_FIRST_HOUSE_X + 150) / ZONE1_HOUSE_SPACING);
  const houses: LeoDestination[] = [];
  for (let rank = first; rank <= last; rank += 1) {
    const house = suburbHouse(rank);
    if (house.house.x >= startX && house.house.x < endX) houses.push(house);
  }
  return houses;
}

/** Après les 32 maisons de la Zone 1, les livraisons continuent dans le quartier qui suit la ville. */
export function destinationForDelivery(deliveryIndex: number): LeoDestination {
  if (deliveryIndex < INITIAL_DESTINATIONS.length) return INITIAL_DESTINATIONS[deliveryIndex];
  return suburbHouse(deliveryIndex - INITIAL_DESTINATIONS.length);
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
