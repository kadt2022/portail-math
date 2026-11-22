// Mise en page de l'écran de conduite. Pur (sans React ni Phaser), donc testable.
//
// Trois lignes empilées, sans aucun recouvrement, dans une grille haute de 100dvh (repli 100vh) :
//   A. tableau de bord (hauteur naturelle) ;
//   B. scène Phaser (1fr : tout l'espace restant) ;
//   C. panneau de commandes (hauteur naturelle, réservée en premier).
// La hauteur des commandes n'est pas devinée : la grille la mesure (ligne `auto`) et donne le reste à la scène.
// La scène n'est jamais étirée : Phaser (mode RESIZE) adapte la caméra à la taille réelle de la zone B, avec un
// zoom uniforme (`cameraZoomFor`). En portrait, la scène est limitée à la hauteur utile du monde (au-delà, la
// caméra ne montrerait que du vide).

import { cameraZoomFor, MIN_CAMERA_ZOOM } from "./leoBridgeLayout";
import { STREET_VIEW_HEIGHT, WORLD_HEIGHT } from "./leoGeometry";

export interface DrivingViewport {
  width: number;
  height: number;
  /** Écran tactile (pointeur grossier). */
  coarsePointer: boolean;
}

export type DrivingFormat = "desktop" | "landscape-compact" | "portrait";

export interface DrivingLayout {
  orientation: "portrait" | "landscape";
  format: DrivingFormat;
  /** Vrai sur écran tactile : sinon, une aide rappelle aussi le clavier. */
  touchControls: boolean;
  /** Diamètre des boutons (px CSS). */
  controlSize: number;
  /** Hauteur maximale utile de la scène (portrait) ; null : la scène prend tout l'espace restant. */
  sceneMaxHeight: number | null;
}

/** Hauteur d'écran sous laquelle la présentation compacte (téléphone couché, petit portable) est utilisée. */
export const COMPACT_MAX_HEIGHT = 520;
/** Taille minimale d'un bouton tactile (recommandations d'accessibilité : 44 à 48 px). */
export const MIN_CONTROL_SIZE = 48;
export const MAX_CONTROL_SIZE = 76;
const PANEL_PADDING = 8;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function drivingLayout(viewport: DrivingViewport): DrivingLayout {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const orientation = width >= height ? "landscape" : "portrait";
  const format: DrivingFormat = orientation === "portrait" ? "portrait" : height <= COMPACT_MAX_HEIGHT ? "landscape-compact" : "desktop";

  let controlSize: number;
  if (format === "portrait") {
    // Cinq boutons sur une ligne, sans débordement horizontal : (largeur − marges − 4 espaces − séparation) / 5.
    controlSize = Math.floor(clamp((width - 2 * PANEL_PADDING - 4 * 8 - 12) / 5, MIN_CONTROL_SIZE, MAX_CONTROL_SIZE));
  } else if (format === "landscape-compact") {
    controlSize = Math.round(clamp(height * 0.13, MIN_CONTROL_SIZE, 56));
  } else {
    // Ordinateur : boutons ronds assez grands pour lire l'icône et le libellé (1366 × 768 compris).
    controlSize = Math.round(clamp(height * 0.1, 68, 84));
  }

  // Portrait : la caméra est limitée par la largeur ; au-delà de WORLD_HEIGHT · zoom, elle ne montrerait que du vide.
  const sceneMaxHeight = format === "portrait" ? Math.floor(WORLD_HEIGHT * cameraZoomFor(width, height)) : null;

  return { orientation, format, touchControls: viewport.coarsePointer, controlSize, sceneMaxHeight };
}

// ---------------------------------------------------------------------------------------------
// Disposition dans le lecteur standard des jeux
//
// Dans le lecteur, Léo ne reçoit pas tout l'écran mais une scène (souvent 16/9) dont il doit retirer son panneau de
// conduite. Sur un téléphone, ce panneau posé sous la scène pouvait n'en laisser que 60 à 80 px : la rue était
// coupée. Quand la scène restante serait plus basse que la rue à l'échelle minimale de la caméra, le panneau se
// partage en deux colonnes, de part et d'autre de la scène (direction et klaxon à gauche, pédales à droite, sous le
// pouce de chaque main) ; seule la consigne reste sous la scène, sur une ligne.

export type PlayerDrivingFormat = DrivingFormat | "landscape-rails";

export interface PlayerDrivingLayout extends Omit<DrivingLayout, "format"> {
  format: PlayerDrivingFormat;
}

/** Largeur de scène sous laquelle direction, consigne et pédales ne tiennent plus sur une ligne. */
export const NARROW_STAGE_WIDTH = 640;
/** Espace entre deux boutons du panneau (voir panelLeft / panelRight). */
const PANEL_GAP = 8;
/** Plus grand bouton des colonnes latérales : celui du panneau compact. */
const MAX_RAIL_CONTROL_SIZE = 56;
/** Hauteur de scène sous laquelle la rue entière ne tient plus à l'échelle minimale de la caméra. */
export const MIN_STREET_SCENE_HEIGHT = Math.ceil(STREET_VIEW_HEIGHT * MIN_CAMERA_ZOOM);

export function playerDrivingLayout(stage: DrivingViewport): PlayerDrivingLayout {
  const width = Math.max(1, stage.width);
  const height = Math.max(1, stage.height);
  // Scène portrait : le panneau portrait du jeu (consigne, puis direction et pédales) laisse assez de hauteur.
  if (width < height) return drivingLayout(stage);
  // Scène paysage étroite : le panneau prend la disposition portrait (deux lignes), sinon ses boutons ne tiendraient pas.
  const narrow = width < NARROW_STAGE_WIDTH;
  const underScene = drivingLayout({ ...stage, height: narrow ? Math.max(height, width + 1) : height });
  const panelHeight = underScene.controlSize + 2 * PANEL_PADDING + (narrow ? MIN_CONTROL_SIZE + PANEL_GAP : 0);
  if (height - panelHeight >= MIN_STREET_SCENE_HEIGHT) return underScene;
  // Colonnes latérales : trois boutons empilés de chaque côté, sur toute la hauteur de la scène.
  const controlSize = Math.floor(clamp((height - 2 * PANEL_PADDING - 2 * PANEL_GAP) / 3, MIN_CONTROL_SIZE, MAX_RAIL_CONTROL_SIZE));
  return { orientation: "landscape", format: "landscape-rails", touchControls: stage.coarsePointer, controlSize, sceneMaxHeight: null };
}
