// Grille adaptative du catalogue : aucune largeur n'est écrite pour un appareil, aucun point de rupture. Le nombre de colonnes
// découle de la largeur réelle du conteneur de la galerie (le menu latéral lui en retire une partie) :
//
//   grid-template-columns: repeat(auto-fill, minmax(min(100%, carteMin), 1fr))
//   carteMin = min(base + pente × largeur, base2 + pente2 × largeur)
//
// La carte minimale grandit vite sur petit écran puis plus lentement : les cartes restent grandes (illustrations immersives) et
// le nombre de colonnes n'augmente que si elles ne rétrécissent pas. Ces valeurs sont reprises à l'identique dans
// GamesCataloguePage.module.css (un test le vérifie).

/** Écart entre les cartes, horizontal et vertical (px). */
export const CATALOGUE_GAP = 16;
/** Première droite : prime sur petit écran. Seconde droite : plafond qui croît moins vite sur grand écran. */
export const CARD_MIN_BASE = 92;
export const CARD_MIN_SLOPE = 0.21;
export const CARD_MIN_BASE_2 = 250;
export const CARD_MIN_SLOPE_2 = 0.06;

export const cardMinWidth = (containerWidth: number): number => Math.min(CARD_MIN_BASE + CARD_MIN_SLOPE * containerWidth, CARD_MIN_BASE_2 + CARD_MIN_SLOPE_2 * containerWidth);

/** Nombre de colonnes que CSS Grid (auto-fill) place dans un conteneur de cette largeur. */
export function columnsFor(containerWidth: number): number {
  const min = cardMinWidth(containerWidth);
  return Math.max(1, Math.floor((containerWidth + CATALOGUE_GAP) / (min + CATALOGUE_GAP)));
}

/** Largeur d'une carte une fois les colonnes réparties (les colonnes se partagent l'espace : 1fr). */
export function cardWidth(containerWidth: number): number {
  const columns = columnsFor(containerWidth);
  return (containerWidth - (columns - 1) * CATALOGUE_GAP) / columns;
}
