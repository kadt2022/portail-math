// Placement de la bulle d'aide : elle ne doit jamais recouvrir une zone où l'enfant touche (cases, tuiles, lettres, boutons), ni la cible
// elle-même, ni la main. Fonction pure : le composant lui donne les mesures, elle rend l'endroit.
//
// Ordre : à droite de la cible, à gauche, au-dessus, en dessous. Si aucune place n'est libre (ou si l'écran est petit), la bulle devient un
// cartouche fixe, en haut ou en bas du cadre, à l'endroit où il gêne le moins.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Side = "right" | "left" | "top" | "bottom";

export type Placement =
  | { kind: "float"; side: Side; left: number; top: number; width: number }
  | { kind: "dock"; at: "top" | "bottom"; left: number; top: number; width: number };

export interface PlacementInput {
  /** Taille du cadre du jeu. */
  area: { width: number; height: number };
  /** Zone ciblée par la main. */
  target: Box;
  /** Zone occupée par la main elle-même. */
  hand: Box;
  /** Zones où l'enfant touche : la bulle ne les recouvre jamais quand une place libre existe. */
  forbidden: Box[];
  /** Hauteur de la bulle pour une largeur donnée (mesurée dans la page). */
  size: (width: number) => { width: number; height: number };
  /** Largeur naturelle de la consigne sur une ligne (le cartouche ne prend pas plus de place que son texte). */
  natural?: () => number;
  /** Petit écran : pas de bulle flottante, seulement le cartouche. */
  compact: boolean;
}

export const MARGIN = 6;
export const GAP = 10;
export const FLOAT_WIDTHS = [190, 132];
export const DOCK_MAX = 340;
const SIDES: Side[] = ["right", "left", "top", "bottom"];
const STEP = 8;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function overlapArea(a: Box, b: Box): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** Le petit écran : une grosse bulle flottante y gênerait toujours. */
export function isCompactArea(area: { width: number; height: number }): boolean {
  return area.width < 520 || area.height < 360;
}

interface Context {
  area: { width: number; height: number };
  blockers: Box[];
}

const costOf = (box: Box, blockers: Box[]) => blockers.reduce((sum, blocker) => sum + overlapArea(box, blocker), 0);

function isInside(box: Box, area: Context["area"]): boolean {
  return box.left >= MARGIN && box.top >= MARGIN && box.left + box.width <= area.width - MARGIN && box.top + box.height <= area.height - MARGIN;
}

/** Zone que prendrait la bulle contre un côté de la cible (sur l'autre axe, centrée sur la cible et gardée dans le cadre). */
function boxBeside(side: Side, target: Box, width: number, height: number, area: Context["area"]): Box {
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  if (side === "right") return { left: target.left + target.width + GAP, top: clamp(centerY - height / 2, MARGIN, area.height - height - MARGIN), width, height };
  if (side === "left") return { left: target.left - GAP - width, top: clamp(centerY - height / 2, MARGIN, area.height - height - MARGIN), width, height };
  const left = clamp(centerX - width / 2, MARGIN, area.width - width - MARGIN);
  return { left, top: side === "top" ? target.top - GAP - height : target.top + target.height + GAP, width, height };
}

function floatPlace(input: PlacementInput, { area, blockers }: Context): Placement | null {
  for (const side of SIDES) {
    for (const wanted of FLOAT_WIDTHS) {
      const width = Math.min(wanted, area.width / 2);
      const box = boxBeside(side, input.target, width, input.size(width).height, area);
      if (isInside(box, area) && costOf(box, blockers) === 0) return { kind: "float", side, left: box.left, top: box.top, width };
    }
  }
  return null;
}

/** Positions horizontales possibles, du centre vers les bords. */
function leftsAround(centered: number, maxLeft: number): number[] {
  const lefts = [centered];
  for (let offset = STEP; centered - offset >= MARGIN || centered + offset <= maxLeft; offset += STEP) {
    if (centered - offset >= MARGIN) lefts.push(centered - offset);
    if (centered + offset <= maxLeft) lefts.push(centered + offset);
  }
  return lefts;
}

/** Cartouche fixe : la bande du haut ou du bas, et dans la bande l'endroit le moins encombré (de préférence au centre). */
function dockPlace(input: PlacementInput, { area, blockers }: Context): Placement {
  const width = Math.max(0, Math.min(DOCK_MAX, area.width - 2 * MARGIN, input.natural?.() ?? DOCK_MAX));
  const { height } = input.size(width);
  const maxLeft = Math.max(MARGIN, area.width - width - MARGIN);
  const centered = clamp((area.width - width) / 2, MARGIN, maxLeft);
  const lefts = leftsAround(centered, maxLeft);
  let best: Placement = { kind: "dock", at: "top", left: centered, top: MARGIN, width };
  let bestCost = Number.POSITIVE_INFINITY;
  for (const at of ["top", "bottom"] as const) {
    const top = at === "top" ? MARGIN : Math.max(MARGIN, area.height - height - MARGIN);
    for (const left of lefts) {
      const total = costOf({ left, top, width, height }, blockers);
      if (total < bestCost) {
        bestCost = total;
        best = { kind: "dock", at, left, top, width };
      }
      if (total === 0) return best;
    }
  }
  return best;
}

export function chooseBubblePlace(input: PlacementInput): Placement {
  const context: Context = { area: input.area, blockers: [...input.forbidden, input.hand] };
  return (input.compact ? null : floatPlace(input, context)) ?? dockPlace(input, context);
}
