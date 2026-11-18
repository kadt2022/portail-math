// Composition de la galerie : calcule, pour un nombre de jeux et une largeur disponibles,
// combien de cartes occupent chaque rangée, puis la place de chacune sur une grille de
// 60 colonnes (divisible par 1, 2, 3, 4, 5 et 6). Aucune mise en page n'est écrite pour un
// nombre de jeux précis : les rangées sont équilibrées, jamais de colonne vide.

export const GALLERY_COLUMNS = 12;

/** Nombre maximal de cartes par rangée selon la largeur réelle de la galerie (en px). */
export function maxCardsPerRow(width: number): number {
  if (width < 560) return 1;
  if (width < 860) return 2;
  if (width < 1200) return 3;
  return 4;
}

/**
 * Répartit `count` cartes en rangées équilibrées de `maxPerRow` cartes au plus.
 * 5 jeux, 3 max : [3, 2] ; 6 jeux : [3, 3] ; 4 jeux, 3 max : [2, 2] ; 7 jeux, 4 max : [4, 3].
 * 5 jeux, 2 max : [1, 2, 2] (une grande carte puis deux paires). Sinon, les rangées les plus remplies viennent en premier.
 */
export function distributeRows(count: number, maxPerRow: number): number[] {
  if (count <= 0) return [];
  const max = Math.max(1, Math.floor(maxPerRow));
  const rows = Math.ceil(count / max);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  const distribution = Array.from({ length: rows }, (_, index) => base + (index < extra ? 1 : 0));
  // Une rangée d'une seule carte (nombre impair avec 2 cartes par rangée) passe en tête : elle devient
  // la grande carte mise en avant, suivie de paires, plutôt qu'une carte orpheline en dernière ligne.
  if (rows > 1 && max > 1 && distribution[rows - 1] === 1) distribution.unshift(distribution.pop() as number);
  return distribution;
}

export interface CardPlacement {
  /** Colonnes occupées sur GALLERY_COLUMNS. */
  span: number;
  /** Colonne de départ (1-indexée) : seulement pour centrer une carte seule sur grand écran. */
  start?: number;
  /** Cartes dans la rangée de cette carte. */
  perRow: number;
  /** Proportions de la carte : identiques dans toute une rangée, donc hauteur cohérente. */
  ratio: string;
}

// Plus il y a de cartes par rangée, plus elles sont étroites : le cadre se rapproche du carré.
const RATIOS: Record<number, string> = { 1: "16 / 10", 2: "2 / 1", 3: "3 / 2", 4: "4 / 3" };
// Carte pleine largeur placée en tête d'une galerie à plusieurs colonnes : plus basse pour rester une bannière.
const LEAD_RATIO = "21 / 9";

export function galleryPlacements(count: number, maxPerRow: number): CardPlacement[] {
  // Une carte seule n'est pas étirée sur toute la largeur : elle occupe la moitié, centrée.
  if (count === 1 && maxPerRow >= 2) {
    return [{ span: GALLERY_COLUMNS / 2, start: GALLERY_COLUMNS / 4 + 1, perRow: 1, ratio: RATIOS[1] }];
  }
  const placements: CardPlacement[] = [];
  for (const perRow of distributeRows(count, maxPerRow)) {
    for (let index = 0; index < perRow; index += 1) {
      const lead = perRow === 1 && maxPerRow >= 2;
      placements.push({ span: GALLERY_COLUMNS / perRow, perRow, ratio: lead ? LEAD_RATIO : RATIOS[Math.min(perRow, 4)] });
    }
  }
  return placements;
}
