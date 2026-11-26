import type { Color } from "./kit";

// Couleurs du monde ferroviaire. Le train reste classique : locomotive rouge et noire filetée d'or (d'après les
// maquettes du Capitaine), wagons de bois brun à ferrures sombres. Les infrastructures sont modernes et nettes :
// béton architectonique clair et pierre de taille grise pour les viaducs et les tunnels, acier peint bleu ardoise et
// garde-corps galvanisés pour le pont métallique, gares blanches à toits d'ardoise, ferronneries vert profond et
// pavillons de brique, quais de béton clair à bordure blanche et bande d'éveil jaune. Un seul endroit pour les régler.
//
// Écrit pour Yamba.

/** Familles de matériau (stockées avec chaque couleur de sommet) : chacune a son matériau PBR. */
export const MATERIAL = {
  /** Béton, pierre de taille, ballast, quais, terrain : mat et minéral. */
  mineral: 0,
  /** Surfaces peintes ou laquées : caisse de la locomotive, acier peint du pont, ferronneries, signaux. */
  paint: 1,
  /** Acier nu, fonte, rails, garde-corps galvanisés : métal. */
  metal: 2,
  /** Laiton et dorures : métal poli. */
  brass: 3,
  /** Bois traité des wagons, traverses, bancs. */
  wood: 4,
  /** Verre (vitres, lanternes) : lisse et réfléchissant. */
  glass: 5,
  /** Charbon, suie, rouille : tout à fait mat. */
  matte: 6,
  /** Mangues : peau satinée. */
  fruit: 7,
} as const;

export type MaterialClass = (typeof MATERIAL)[keyof typeof MATERIAL];
export const MATERIAL_COUNT = 8;

export const PALETTE = {
  // Locomotive.
  red: [0.72, 0.09, 0.07, MATERIAL.paint] as Color,
  redDark: [0.46, 0.05, 0.04, MATERIAL.paint] as Color,
  redLight: [0.86, 0.2, 0.12, MATERIAL.paint] as Color,
  black: [0.08, 0.08, 0.09, MATERIAL.paint] as Color,
  blackSoft: [0.16, 0.16, 0.18, MATERIAL.paint] as Color,
  graphite: [0.22, 0.23, 0.25, MATERIAL.metal] as Color,
  gold: [0.93, 0.68, 0.22, MATERIAL.brass] as Color,
  goldDark: [0.66, 0.44, 0.12, MATERIAL.brass] as Color,
  brass: [0.86, 0.66, 0.3, MATERIAL.brass] as Color,
  copper: [0.78, 0.42, 0.2, MATERIAL.brass] as Color,
  steel: [0.58, 0.6, 0.63, MATERIAL.metal] as Color,
  steelDark: [0.34, 0.35, 0.38, MATERIAL.metal] as Color,
  steelBright: [0.82, 0.84, 0.86, MATERIAL.metal] as Color,
  glass: [0.55, 0.72, 0.82, MATERIAL.glass] as Color,
  lamp: [1, 0.94, 0.7, MATERIAL.glass] as Color,
  fire: [1, 0.55, 0.15, MATERIAL.matte] as Color,
  coal: [0.1, 0.1, 0.11, MATERIAL.matte] as Color,
  // Bois et métal des wagons.
  wood: [0.5, 0.29, 0.15, MATERIAL.wood] as Color,
  woodLight: [0.62, 0.38, 0.2, MATERIAL.wood] as Color,
  woodDark: [0.32, 0.18, 0.09, MATERIAL.wood] as Color,
  crate: [0.78, 0.6, 0.36, MATERIAL.wood] as Color,
  crateDark: [0.6, 0.43, 0.24, MATERIAL.wood] as Color,
  iron: [0.2, 0.2, 0.22, MATERIAL.metal] as Color,
  // Mangues : du vert au rouge en passant par le jaune.
  mangoGreen: [0.5, 0.66, 0.16, MATERIAL.fruit] as Color,
  mangoYellow: [0.98, 0.78, 0.2, MATERIAL.fruit] as Color,
  mangoOrange: [0.98, 0.55, 0.14, MATERIAL.fruit] as Color,
  mangoRed: [0.86, 0.26, 0.14, MATERIAL.fruit] as Color,
  // Voie.
  rail: [0.46, 0.42, 0.4, MATERIAL.metal] as Color,
  railTop: [0.8, 0.8, 0.82, MATERIAL.metal] as Color,
  rust: [0.48, 0.3, 0.2, MATERIAL.matte] as Color,
  sleeper: [0.42, 0.3, 0.2, MATERIAL.wood] as Color,
  sleeperDark: [0.3, 0.21, 0.14, MATERIAL.wood] as Color,
  ballast: [0.58, 0.56, 0.53, MATERIAL.mineral] as Color,
  ballastDark: [0.44, 0.42, 0.4, MATERIAL.mineral] as Color,
  // Ouvrages.
  stone: [0.73, 0.72, 0.69, MATERIAL.mineral] as Color,
  stoneDark: [0.55, 0.55, 0.55, MATERIAL.mineral] as Color,
  stoneLight: [0.84, 0.83, 0.8, MATERIAL.mineral] as Color,
  stoneGrey: [0.62, 0.63, 0.64, MATERIAL.mineral] as Color,
  concrete: [0.71, 0.71, 0.7, MATERIAL.mineral] as Color,
  concreteDark: [0.52, 0.53, 0.55, MATERIAL.mineral] as Color,
  soot: [0.18, 0.16, 0.15, MATERIAL.matte] as Color,
  rock: [0.5, 0.5, 0.5, MATERIAL.mineral] as Color,
  rockDark: [0.36, 0.37, 0.39, MATERIAL.mineral] as Color,
  rockWarm: [0.56, 0.53, 0.5, MATERIAL.mineral] as Color,
  truss: [0.24, 0.35, 0.47, MATERIAL.paint] as Color,
  trussLight: [0.33, 0.46, 0.6, MATERIAL.paint] as Color,
  galvanized: [0.76, 0.78, 0.8, MATERIAL.metal] as Color,
  graniteDark: [0.26, 0.27, 0.29, MATERIAL.mineral] as Color,
  // Gares.
  ochre: [0.95, 0.94, 0.91, MATERIAL.mineral] as Color,
  ochreDark: [0.62, 0.27, 0.19, MATERIAL.mineral] as Color,
  cream: [0.96, 0.94, 0.88, MATERIAL.mineral] as Color,
  white: [0.95, 0.94, 0.9, MATERIAL.paint] as Color,
  tile: [0.33, 0.36, 0.41, MATERIAL.mineral] as Color,
  tileDark: [0.24, 0.26, 0.3, MATERIAL.mineral] as Color,
  shutter: [0.2, 0.42, 0.62, MATERIAL.paint] as Color,
  green: [0.12, 0.38, 0.26, MATERIAL.paint] as Color,
  platform: [0.76, 0.77, 0.78, MATERIAL.mineral] as Color,
  platformDark: [0.58, 0.59, 0.61, MATERIAL.mineral] as Color,
  safety: [0.98, 0.82, 0.12, MATERIAL.paint] as Color,
  // Terrain neutre (sera remplacé par l'habillage de la nature).
  ground: [0.5, 0.48, 0.43, MATERIAL.mineral] as Color,
  groundDark: [0.41, 0.4, 0.37, MATERIAL.mineral] as Color,
  water: [0.2, 0.5, 0.62, MATERIAL.glass] as Color,
} as const;
