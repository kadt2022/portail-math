// Passants de la zone 4. Le mouvement est volontairement indépendant du trafic :
// chaque sprite avance seulement sur son trottoir et ne participe pas à la physique routière.

import { ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";
import { boulevardLayout } from "./leoBoulevardLayout";

export const PEDESTRIAN_FRAME = { width: 543, height: 724 } as const;
export const PEDESTRIAN_FRAMES = [0, 1, 2, 1] as const;

export interface PedestrianSpec {
  textureKey: string;
  /** Sens du dessin non-miroir : les planches homme/enfant regardent à droite, femme à gauche. */
  nativeDirection: 1 | -1;
  x: number;
  groundY: number;
  /** Sortie de scène définitive : un passant ne fait jamais demi-tour. */
  exitX: number;
  /** Feu à franchir : le passant attend si l'axe principal est ouvert aux voitures. */
  waitAtX?: number;
  speed: number;
  phase: number;
  scale: number;
}

/** Passant d'une rue perpendiculaire : sa taille suit sa progression vers ou loin de l'avenue. */
export interface DepthPedestrianSpec {
  textureKey: string;
  x: number;
  y: number;
  exitY: number;
  waitY: number;
  speed: number;
  startScale: number;
  endScale: number;
  phase: number;
}

export interface SeatedPedestrianSpec {
  textureKey: string;
  x: number;
  y: number;
  scale: number;
  phase: number;
}

/** Trois allures et trois silhouettes, à l'intérieur des seuls trottoirs du boulevard. */
export function boulevardPedestrians(): PedestrianSpec[] {
  const boulevard = boulevardLayout();
  return [
    {
      textureKey: "leo-pedestrian-man",
      nativeDirection: 1,
      x: boulevard.panelX + 360,
      groundY: ROAD_Y - ROAD_HALF_WIDTH - 14,
      exitX: boulevard.panelEnd + 180,
      waitAtX: boulevard.panelX + 1_310 * boulevard.scale - 95,
      speed: 24,
      phase: 0,
      scale: 0.14,
    },
    {
      textureKey: "leo-pedestrian-woman",
      nativeDirection: -1,
      x: boulevard.panelEnd - 300,
      groundY: ROAD_Y - ROAD_HALF_WIDTH - 12,
      exitX: boulevard.panelX - 180,
      waitAtX: boulevard.panelX + 1_310 * boulevard.scale + 95,
      speed: -19,
      phase: 2,
      scale: 0.135,
    },
    {
      textureKey: "leo-pedestrian-child",
      nativeDirection: 1,
      x: boulevard.panelX + 1_710,
      groundY: ROAD_Y + ROAD_HALF_WIDTH + 77,
      exitX: boulevard.panelEnd + 180,
      speed: 28,
      phase: 1,
      scale: 0.12,
    },
  ];
}

/** Opacité à la sortie : le passant se fond hors champ plutôt que de réapparaître. */
export function pedestrianExitAlpha(x: number, spec: Pick<PedestrianSpec, "exitX" | "speed">) {
  const distance = Math.abs(spec.exitX - x);
  return Math.max(0, Math.min(1, distance / 115));
}

/** Deux personnes venant des rues qui s'enfoncent dans le décor, dans les deux sens de profondeur. */
export function boulevardDepthPedestrians(): DepthPedestrianSpec[] {
  const boulevard = boulevardLayout();
  const atStreet = (sourceX: number) => boulevard.panelX + sourceX * boulevard.scale;
  return [
    {
      textureKey: "leo-pedestrian-depth-front",
      // Trottoir gauche de la rue des Fleurs : jamais sur son axe asphalté.
      x: atStreet(455) - 70 * boulevard.scale,
      y: boulevard.topY + 310 * boulevard.scale,
      waitY: boulevard.topY + 385 * boulevard.scale,
      exitY: boulevard.topY + 432 * boulevard.scale,
      speed: 15,
      startScale: 0.13,
      endScale: 0.21,
      phase: 1,
    },
    {
      textureKey: "leo-pedestrian-depth-back",
      // Trottoir droit de l'avenue des Manguier : l'offset suit la bordure de la voie.
      x: atStreet(1_310) + 70 * boulevard.scale,
      y: boulevard.topY + 405 * boulevard.scale,
      waitY: boulevard.topY + 370 * boulevard.scale,
      exitY: boulevard.topY + 230 * boulevard.scale,
      speed: -14,
      startScale: 0.2,
      endScale: 0.1,
      phase: 3,
    },
    {
      textureKey: "leo-pedestrian-depth-front",
      x: atStreet(1_728) - 68 * boulevard.scale,
      y: boulevard.topY + 325 * boulevard.scale,
      waitY: boulevard.topY + 390 * boulevard.scale,
      exitY: boulevard.topY + 432 * boulevard.scale,
      speed: 13,
      startScale: 0.12,
      endScale: 0.2,
      phase: 2,
    },
    {
      textureKey: "leo-pedestrian-depth-back",
      x: atStreet(455) + 68 * boulevard.scale,
      y: boulevard.topY + 400 * boulevard.scale,
      waitY: boulevard.topY + 365 * boulevard.scale,
      exitY: boulevard.topY + 235 * boulevard.scale,
      speed: -12,
      startScale: 0.19,
      endScale: 0.1,
      phase: 0,
    },
  ];
}

/** Deux personnes réellement posées sur le banc de la promenade au premier plan. */
export function boulevardSeatedPedestrians(): SeatedPedestrianSpec[] {
  const boulevard = boulevardLayout();
  return [
    // Pieds devant le piètement, bassin exactement sur l'assise : pas sur l'herbe au premier plan.
    { textureKey: "leo-pedestrian-seated", x: boulevard.panelX + 1_340 * boulevard.scale, y: 840, scale: 0.105, phase: 0 },
    { textureKey: "leo-pedestrian-seated-woman", x: boulevard.panelX + 1_450 * boulevard.scale, y: 840, scale: 0.105, phase: 2 },
  ];
}
