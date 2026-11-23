// Gestionnaires d'intention d'une carte de jeu : seul le survol à la souris compte (sur un écran tactile, aucun
// préchargement spéculatif : le toucher ouvre le jeu, qui se charge normalement). La sortie du pointeur met fin à
// l'intention. Les cartes restent de simples liens ; la décision de précharger appartient à intentPreloader.

import type { PointerEvent } from "react";

/** Dernière position du pointeur sur chaque carte (relevée par les seuls écouteurs de la carte, aucun écouteur global). */
const lastPointer = new WeakMap<Element, { x: number; y: number }>();

/** Relève la position du pointeur sur la carte (entrée, déplacement). */
export function trackPointer(event: PointerEvent<Element>) {
  lastPointer.set(event.currentTarget, { x: event.clientX, y: event.clientY });
}

/**
 * La carte est-elle encore sous le pointeur ? Pendant un défilement, le pointeur reste au même endroit de l'écran et la
 * page glisse dessous, sans toujours signaler la sortie de la carte : on regarde ce qui est réellement sous sa dernière
 * position connue.
 */
export function stillUnderPointer(card: Element): () => boolean {
  return () => {
    const position = lastPointer.get(card);
    if (!position || typeof document.elementFromPoint !== "function") return true;
    const under = document.elementFromPoint(position.x, position.y);
    return !!under && card.contains(under);
  };
}

export function intentHandlers(
  gameId: string,
  onIntent?: (gameId: string, stillHovered: () => boolean) => void,
  onIntentEnd?: (gameId: string) => void,
) {
  if (!onIntent) return {};
  return {
    onPointerEnter: (event: PointerEvent<Element>) => {
      if (event.pointerType !== "mouse") return;
      trackPointer(event);
      onIntent(gameId, stillUnderPointer(event.currentTarget));
    },
    onPointerMove: (event: PointerEvent<Element>) => {
      if (event.pointerType === "mouse") trackPointer(event);
    },
    onPointerLeave: () => onIntentEnd?.(gameId),
  };
}
