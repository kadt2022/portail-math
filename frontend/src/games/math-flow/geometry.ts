// Géométrie du plateau Multipli'Flow : voisinage et placement des opérations. Pure (sans React), testée à part.

export type Direction = "up" | "down" | "left" | "right";

/** Case voisine dans une direction, ou null au bord du plateau. */
export function neighbour(rows: number, cols: number, index: number, direction: Direction): number | null {
  const row = Math.floor(index / cols);
  const col = index % cols;
  if (direction === "up") return row > 0 ? index - cols : null;
  if (direction === "down") return row < rows - 1 ? index + cols : null;
  if (direction === "left") return col > 0 ? index - 1 : null;
  return col < cols - 1 ? index + 1 : null;
}

/** Direction d'un glissement de doigt (axe dominant) ; null tant que le doigt n'a pas dépassé le seuil. */
export function dragDirection(dx: number, dy: number, threshold: number): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export const KEY_DIRECTION: Readonly<Record<string, Direction>> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

/** Une opération occupe cinq cases d'une ligne du second tableau : opérande, signe, opérande, « = », résultat. */
export const EXPRESSION_WIDTH = 5;

/** Colonne de départ d'une opération, centrée dans le second tableau (jamais négative). */
export function expressionOffset(cols: number): number {
  return Math.max(0, Math.floor((cols - EXPRESSION_WIDTH) / 2));
}

/** Première tuile imagée rencontrée en partant d'une case dans une direction (navigation au clavier), ou null. */
export function scanFrom(rows: number, cols: number, index: number, direction: Direction, accepts: (candidate: number) => boolean): number | null {
  let current = neighbour(rows, cols, index, direction);
  while (current !== null) {
    if (accepts(current)) return current;
    current = neighbour(rows, cols, current, direction);
  }
  return null;
}
