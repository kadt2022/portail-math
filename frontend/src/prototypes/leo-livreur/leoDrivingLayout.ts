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

import { cameraZoomFor } from "./leoBridgeLayout";
import { WORLD_HEIGHT } from "./leoGeometry";

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
