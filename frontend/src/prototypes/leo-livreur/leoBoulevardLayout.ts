// Zone 4 : boulevard vivant. Mise en page pure, indépendante de Phaser.
//
// L'illustration fournie contient sa propre chaussée centrale. Comme pour la zone 3,
// cette chaussée n'est pas affichée : le haut et la promenade du bas sont raccordés
// à la route physique commune du jeu.

import { cityLayout } from "./leoCityLayout";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

export const BOULEVARD_REF = {
  width: 2172,
  height: 724,
  /** Dernière rangée de décor avant la ligne blanche nord de la chaussée peinte. */
  topRows: 425,
  /** Première rangée de la promenade sud, après la bordure de la chaussée. */
  bottomStartRow: 583,
  bottomRows: 141,
} as const;

/** Identifiant monde de la zone 4 jouable (après l'entrée de ville). */
export const BOULEVARD_ZONE_ID = 6;
/** Recouvrement visuel avec la zone précédente et la suivante. */
export const BOULEVARD_OVERLAP = 300;
/** Largeur de fondu aux deux extrémités du panneau. */
export const BOULEVARD_FADE = 320;

export interface BoulevardLayout {
  scale: number;
  panelX: number;
  panelEnd: number;
  panelWidth: number;
  topY: number;
  topBottom: number;
  bottomOriginY: number;
  bottomTop: number;
  bottomEnd: number;
}

export interface BoulevardSignal {
  /** Centre de la tête de feu déjà dessinée dans le panorama. */
  x: number;
  y: number;
  /** Lignes d'arrêt de la voie est et de la voie ouest. */
  stopLineEast: number;
  stopLineWest: number;
}

export function boulevardLayout(): BoulevardLayout {
  const city = cityLayout();
  // Une illustration = exactement une largeur de zone, sans étirement anisotrope.
  const scale = WORLD_ZONE_WIDTH / BOULEVARD_REF.width;
  // Le panneau commence dans les 300 derniers pixels de la zone 3 : les deux
  // illustrations se superposent réellement pendant le fondu, sans décor générique entre elles.
  const panelX = city.panelEnd - BOULEVARD_OVERLAP;
  const panelWidth = BOULEVARD_REF.width * scale;
  const topBottom = city.topBottom;
  const bottomTop = city.bottomTop;
  return {
    scale,
    panelX,
    panelEnd: panelX + panelWidth,
    panelWidth,
    topY: topBottom - BOULEVARD_REF.topRows * scale,
    topBottom,
    bottomOriginY: bottomTop - BOULEVARD_REF.bottomStartRow * scale,
    bottomTop,
    bottomEnd: bottomTop + BOULEVARD_REF.bottomRows * scale,
  };
}

/** Trois carrefours du boulevard : les boîtiers dessinés deviennent des feux réellement actifs. */
export function boulevardSignals(): BoulevardSignal[] {
  const boulevard = boulevardLayout();
  return [455, 1_310, 1_728].map((sourceX) => {
    const x = boulevard.panelX + sourceX * boulevard.scale;
    return {
      x,
      y: boulevard.topY + 165 * boulevard.scale,
      stopLineEast: x - 54,
      stopLineWest: x + 54,
    };
  });
}
