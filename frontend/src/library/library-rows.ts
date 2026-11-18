// Mise en rangées de la galerie de la bibliothèque.

/** Découpe une liste en rangées de tailles données (voir distributeRows). */
export function chunkRows<T>(items: T[], sizes: number[]): T[][] {
  const rows: T[][] = [];
  let start = 0;
  for (const size of sizes) {
    rows.push(items.slice(start, start + size));
    start += size;
  }
  return rows;
}

/**
 * Nombre de colonnes partagé par toutes les rangées : la rangée la plus longue. Se baser sur la première rangée
 * serait faux quand un livre isolé est placé en tête (3 livres, 2 par rangée : [1, 2]).
 */
export function sharedColumns(rows: unknown[][]): number {
  return Math.max(1, ...rows.map((row) => row.length));
}
