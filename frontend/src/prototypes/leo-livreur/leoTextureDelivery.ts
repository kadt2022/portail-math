// Textures livrées allégées (LEO-PERF-01). Certaines illustrations sont affichées bien plus petites que leur fichier
// d'origine : on télécharge une version réduite, puis, dès son arrivée, elle est redessinée à sa taille logique (celle de
// l'illustration d'origine). Toutes les mesures du jeu (échelles, découpes des planches, roues) restent donc exprimées en
// pixels de l'illustration d'origine : seul le téléchargement change.
//
// Facteurs choisis d'après l'échelle d'affichage maximale mesurée dans le jeu (écran 5K, densité 2), avec au moins 15 %
// de marge : la version livrée n'est jamais agrandie à l'écran au-delà de sa propre résolution.

export interface LogicalSize {
  width: number;
  height: number;
}

/** Taille logique (illustration d'origine) des textures livrées réduites, par clé de texture. */
export const DELIVERED_TEXTURE_SIZES: Readonly<Record<string, LogicalSize>> = {
  "leo-pedestrian-man-sheet": { width: 2172, height: 724 },
  "leo-pedestrian-woman-sheet": { width: 2172, height: 724 },
  "leo-pedestrian-child-sheet": { width: 2172, height: 724 },
  "leo-pedestrian-depth-front-sheet": { width: 2172, height: 724 },
  "leo-pedestrian-depth-back-sheet": { width: 2172, height: 724 },
  "leo-house": { width: 720, height: 480 },
  "leo-traffic-family-blue": { width: 640, height: 320 },
  "leo-traffic-compact-green": { width: 640, height: 320 },
  "leo-traffic-sedan-gray": { width: 640, height: 320 },
  "leo-traffic-taxi-occupied": { width: 640, height: 320 },
  "leo-traffic-minibus": { width: 640, height: 320 },
  "leo-car-right": { width: 502, height: 364 },
  "leo-car-left": { width: 505, height: 364 },
};

/**
 * Échelle d'affichage maximale mesurée dans le jeu (pixels de rendu par pixel de l'illustration d'origine, tout le monde
 * parcouru, téléphones, tablette, ordinateurs, jusqu'à l'écran 5K en densité 2). La version livrée doit garder au moins
 * 15 % de marge au-dessus.
 */
export const MEASURED_DISPLAY_SCALE: Readonly<Record<string, number>> = {
  "leo-pedestrian-man-sheet": 0.226,
  "leo-pedestrian-woman-sheet": 0.218,
  "leo-pedestrian-child-sheet": 0.194,
  "leo-pedestrian-depth-front-sheet": 0.255,
  "leo-pedestrian-depth-back-sheet": 0.323,
  "leo-house": 0.472,
  "leo-traffic-family-blue": 0.476,
  "leo-traffic-compact-green": 0.419,
  "leo-traffic-sedan-gray": 0.524,
  "leo-traffic-taxi-occupied": 0.513,
  "leo-traffic-minibus": 0.516,
  "leo-car-right": 0.425,
  "leo-car-left": 0.425,
};

/** Marge minimale de la version livrée au-dessus de l'échelle d'affichage maximale mesurée. */
export const DELIVERY_MARGIN = 1.15;

/**
 * Taille à laquelle redessiner une texture reçue, ou null si elle est déjà à sa taille logique (texture non concernée,
 * ou fichier d'origine livré tel quel).
 */
export function logicalSizeFor(key: string, received: LogicalSize): LogicalSize | null {
  const logical = DELIVERED_TEXTURE_SIZES[key];
  if (!logical) return null;
  if (received.width === logical.width && received.height === logical.height) return null;
  return logical;
}
