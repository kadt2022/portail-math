// Catalogue des véhicules de Léo : une seule échelle commune.
//
// La voiture de Léo sert de référence (rapport de longueur 1). Chaque véhicule
// est défini par un rapport de longueur à Léo, jamais par une taille posée à l'œil
// pour « tenir dans la voie ». Les mesures de chaque illustration (boîte
// englobante, roues, sol) viennent des sprites eux-mêmes : on ne déforme rien
// (une seule échelle uniforme par sprite) et les roues animées sont les roues dessinées.

/** Longueur affichée de Léo (px Phaser) : c'est l'unité de l'échelle commune. */
export const LEO_LENGTH_PX = 132;
/** L'empreinte au sol est un peu plus courte que le sprite (pare-chocs, rétros). */
export const FOOTPRINT_LENGTH_RATIO = 0.94;

export type VehicleKind =
  | "leo"
  | "compact"
  | "family"
  | "sedan"
  | "taxi"
  | "minibus"
  | "school-bus"
  | "city-bus"
  | "limousine"
  | "black-bus"
  | "suv"
  | "sport"
  | "black-sedan";

export type SpeedProfile = "slow" | "normal" | "fast";

/**
 * [x du centre, y du centre, rayon extérieur du pneu], en pixels de l'image source.
 * Le centre est celui de la JANTE (centroïde des pixels clairs, mesuré sur chaque sprite) :
 * c'est l'axe réel autour duquel le disque doit tourner, sinon la roue « danse ».
 */
export type SourceWheel = readonly [number, number, number];

export interface VehicleSpec {
  kind: VehicleKind;
  label: string;
  textureKey: string;
  /** Taille de l'image source (px). */
  source: { width: number; height: number };
  /** Boîte englobante opaque de la carrosserie dans l'image source : [x0, y0, x1, y1]. */
  bbox: readonly [number, number, number, number];
  /** Ordonnée du sol (bas des pneus) dans l'image source. */
  ground: number;
  wheels: readonly [SourceWheel, SourceWheel];
  /** Longueur de la carrosserie relative à la voiture de Léo. */
  lengthRatio: number;
  /** Profondeur de l'empreinte au sol (px) : bus plus larges que les voitures. */
  depth: number;
  /** Sens vers lequel l'illustration est tournée (par défaut la gauche, comme les profils du trafic). */
  facing?: "left" | "right";
  /** Poids de tirage : les petites voitures sont plus fréquentes que les bus. */
  weight: number;
  profiles: readonly SpeedProfile[];
}

export const LEO_SPEC_RIGHT: VehicleSpec = {
  kind: "leo",
  label: "Léo (profil droit)",
  textureKey: "leo-car-right",
  source: { width: 502, height: 364 },
  bbox: [0, 0, 501, 363],
  ground: 363,
  wheels: [[114.5, 309.8, 57], [382, 309.8, 57]],
  lengthRatio: 1,
  depth: 36,
  weight: 0,
  profiles: [],
};

export const LEO_SPEC_LEFT: VehicleSpec = {
  ...LEO_SPEC_RIGHT,
  label: "Léo (profil gauche)",
  textureKey: "leo-car-left",
  source: { width: 505, height: 364 },
  bbox: [0, 0, 504, 363],
  wheels: [[120.6, 310.1, 57], [389.2, 310.1, 57]],
};

/** Véhicules du trafic. Toutes les illustrations sont des profils tournés vers la gauche. */
export const TRAFFIC_SPECS: readonly VehicleSpec[] = [
  {
    kind: "compact",
    label: "Compacte verte",
    textureKey: "leo-traffic-compact-green",
    source: { width: 640, height: 320 },
    bbox: [25, 31, 614, 313],
    ground: 313,
    wheels: [[147.6, 258.4, 62], [523.6, 258.3, 62]],
    lengthRatio: 1.2,
    depth: 36,
    weight: 3,
    profiles: ["normal", "fast"],
  },
  {
    kind: "family",
    label: "Familiale bleue",
    textureKey: "leo-traffic-family-blue",
    source: { width: 640, height: 320 },
    bbox: [17, 32, 622, 319],
    ground: 319,
    wheels: [[148.8, 265.7, 60], [501.8, 265.7, 60]],
    lengthRatio: 1.4,
    depth: 36,
    weight: 3,
    profiles: ["slow", "normal"],
  },
  {
    kind: "sedan",
    label: "Berline grise",
    textureKey: "leo-traffic-sedan-gray",
    source: { width: 640, height: 320 },
    bbox: [15, 58, 625, 307],
    ground: 307,
    wheels: [[147, 253.9, 62], [503.8, 253.9, 60]],
    lengthRatio: 1.5,
    depth: 36,
    weight: 2,
    profiles: ["normal", "fast"],
  },
  {
    kind: "taxi",
    label: "Taxi (chauffeur et passagère)",
    textureKey: "leo-traffic-taxi-occupied",
    source: { width: 640, height: 320 },
    bbox: [71, 18, 569, 318],
    ground: 318,
    wheels: [[177.5, 265.6, 56], [467.3, 265.6, 56]],
    lengthRatio: 1.2,
    depth: 36,
    weight: 2,
    profiles: ["normal", "fast"],
  },
  {
    kind: "minibus",
    label: "Minibus",
    textureKey: "leo-traffic-minibus",
    source: { width: 640, height: 320 },
    bbox: [16, 29, 623, 311],
    ground: 311,
    wheels: [[135.2, 269.7, 46], [475.5, 272.3, 38]],
    lengthRatio: 1.8,
    depth: 40,
    weight: 2,
    profiles: ["slow", "normal"],
  },
  {
    kind: "school-bus",
    label: "Bus scolaire (chauffeur et enfants)",
    textureKey: "leo-traffic-school-bus-occupied",
    source: { width: 640, height: 320 },
    bbox: [11, 29, 628, 306],
    ground: 306,
    wheels: [[142.6, 253.3, 40], [485.6, 253.4, 40]],
    lengthRatio: 2.4,
    depth: 44,
    weight: 1,
    profiles: ["slow"],
  },
  {
    kind: "city-bus",
    label: "Autobus urbain",
    textureKey: "leo-traffic-city-bus",
    source: { width: 640, height: 213 },
    bbox: [32, 13, 607, 205],
    ground: 205,
    wheels: [[204.2, 171.2, 29], [470.6, 170.7, 29]],
    lengthRatio: 3,
    depth: 44,
    weight: 1,
    profiles: ["slow", "normal"],
  },
];

/**
 * Véhicules de la rue perpendiculaire (illustrations fournies par le Capitaine Pi, réduites à 640 px de large,
 * fond transparent). Leurs profils sont tournés vers la DROITE : on les retourne pour rouler vers l'ouest.
 * Poids 0 : ils n'entrent pas dans le tirage aléatoire du trafic principal ; ils y entrent seulement en tournant.
 */
const crossSpec = (spec: Omit<VehicleSpec, "facing" | "weight" | "source">): VehicleSpec => ({
  ...spec,
  facing: "right",
  weight: 0,
  source: { width: 640, height: 213 },
});

export const CROSS_SPECS: readonly VehicleSpec[] = [
  crossSpec({
    kind: "limousine",
    label: "Limousine noire",
    textureKey: "leo-cross-limousine",
    bbox: [2, 42, 639, 198],
    ground: 198,
    wheels: [[114.1, 158.5, 35.8], [557, 158.4, 35.8]],
    lengthRatio: 1.95,
    depth: 38,
    profiles: ["slow", "normal"],
  }),
  crossSpec({
    kind: "black-bus",
    label: "Autocar noir et or (chauffeur et passagers)",
    textureKey: "leo-cross-bus",
    bbox: [4, 4, 636, 211],
    ground: 211,
    wheels: [[154.1, 183.5, 32], [467.7, 183.5, 32]],
    lengthRatio: 2.9,
    depth: 44,
    profiles: ["slow", "normal"],
  }),
  crossSpec({
    kind: "suv",
    label: "SUV noir",
    textureKey: "leo-cross-suv",
    bbox: [29, 2, 611, 213],
    ground: 213,
    wheels: [[158.6, 168.6, 47], [508, 168.5, 47]],
    lengthRatio: 1.55,
    depth: 38,
    profiles: ["normal"],
  }),
  crossSpec({
    kind: "sport",
    label: "Coupé sport noir (conducteur)",
    textureKey: "leo-cross-sport",
    bbox: [6, 6, 633, 210],
    ground: 210,
    wheels: [[148.8, 156.2, 47.4], [522.5, 155.9, 48]],
    lengthRatio: 1.4,
    depth: 36,
    profiles: ["normal"],
  }),
  crossSpec({
    kind: "black-sedan",
    label: "Berline noire (conducteur)",
    textureKey: "leo-cross-sedan",
    bbox: [3, 8, 638, 213],
    ground: 213,
    wheels: [[144.2, 165, 45.4], [533.2, 164.6, 45.4]],
    lengthRatio: 1.6,
    depth: 36,
    profiles: ["normal"],
  }),
];

/** Vitesses (px/s) par profil : environ +25 % par rapport au palier initial,
 * avec des écarts visibles entre lent, normal et rapide. */
export const SPEED_PROFILES: Record<SpeedProfile, readonly [number, number]> = {
  slow: [215, 265],
  normal: [300, 375],
  fast: [415, 475],
};

/**
 * Part du rayon du pneu réellement tournée : la jante et un peu de pneu sombre. Le contour
 * extérieur du pneu (jamais tout à fait circulaire à l'écran) reste fixe, seul ce qui est
 * rond autour de l'axe tourne, et le bord du disque tombe dans une zone sombre uniforme.
 */
export const WHEEL_DISC_RATIO = 0.68;

/** Rayon (px source, entier) du disque découpé : la texture et l'affichage utilisent la même valeur. */
export function wheelDiscSourceRadius(tireRadius: number) {
  return Math.round(tireRadius * WHEEL_DISC_RATIO);
}

export interface VehicleDisplay {
  /** Échelle uniforme source → écran. */
  scale: number;
  /** Taille affichée de l'image entière (même échelle sur les deux axes : aucune déformation). */
  width: number;
  height: number;
  /** Longueur et profondeur de l'empreinte au sol. */
  footprintLength: number;
  footprintDepth: number;
  /** Origine de l'image (fractions) : le centre de la boîte englobante. */
  origin: { x: number; y: number };
  /** Décalage vertical du centre de la boîte par rapport au centre logique (sol). */
  offsetY: number;
  /** Roues : position relative au centre de la boîte, rayon du disque tournant et rayon de roulement. */
  wheels: ReadonlyArray<{ x: number; y: number; discRadius: number; rollRadius: number }>;
}

/**
 * Dimensions affichées d'un véhicule. Le point logique est le centre de l'empreinte
 * au sol, donc le centre de la voie ; les pneus touchent le bord de l'empreinte le
 * plus proche du spectateur (profondeur / 2 sous le centre logique).
 */
export function vehicleDisplay(spec: VehicleSpec): VehicleDisplay {
  const [x0, y0, x1, y1] = spec.bbox;
  const bodyWidth = x1 - x0 + 1;
  const bodyHeight = y1 - y0 + 1;
  const length = spec.lengthRatio * LEO_LENGTH_PX;
  const scale = length / bodyWidth;
  const centerX = x0 + bodyWidth / 2;
  const centerY = y0 + bodyHeight / 2;
  return {
    scale,
    width: spec.source.width * scale,
    height: spec.source.height * scale,
    footprintLength: length * FOOTPRINT_LENGTH_RATIO,
    footprintDepth: spec.depth,
    origin: { x: centerX / spec.source.width, y: centerY / spec.source.height },
    offsetY: spec.depth / 2 - (spec.ground - centerY) * scale,
    wheels: spec.wheels.map(([wx, wy, wr]) => ({
      x: (wx - centerX) * scale,
      y: (wy - centerY) * scale,
      discRadius: wheelDiscSourceRadius(wr) * scale,
      rollRadius: wr * 0.95 * scale,
    })),
  };
}

/** Hauteur affichée de la carrosserie (utile pour contrôler les proportions). */
export function bodyHeightPx(spec: VehicleSpec) {
  const [, y0, , y1] = spec.bbox;
  return (y1 - y0 + 1) * vehicleDisplay(spec).scale;
}

export function bodyLengthPx(spec: VehicleSpec) {
  return spec.lengthRatio * LEO_LENGTH_PX;
}

/**
 * Loi de roulement unique : Δθ = Δdistance / r, au signe du déplacement.
 * `signedDistance` est positive quand le véhicule roule vers la droite de l'écran.
 */
export function rollAngle(signedDistance: number, rollRadius: number) {
  return signedDistance / rollRadius;
}

/**
 * Position d'une roue, relative au centre logique du véhicule : FIXE. Elle ne dépend que de la
 * géométrie du sprite (et de son miroir), jamais de la vitesse ni de l'angle de rotation.
 */
export function wheelOffset(display: VehicleDisplay, wheelIndex: number, flipped: boolean) {
  const wheel = display.wheels[wheelIndex];
  return { x: flipped ? -wheel.x : wheel.x, y: display.offsetY + wheel.y };
}

/**
 * Faut-il retourner (miroir) l'illustration pour que le véhicule roule dans ce sens ? Les profils du trafic
 * regardent à gauche, ceux de la rue perpendiculaire à droite : le miroir dépend de l'orientation d'origine.
 */
export function needsMirror(spec: VehicleSpec, movingEast: boolean) {
  const native = spec.facing ?? "left";
  return native === "left" ? movingEast : !movingEast;
}
