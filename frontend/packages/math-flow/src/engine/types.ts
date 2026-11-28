// Types communs du moteur Math Flow. Aucune dépendance : ni React, ni DOM, ni rendu.

/** Couleurs de jeu : un alignement se forme par couleur, quelle que soit l'illustration. */
export const TILE_COLORS = ["red", "yellow", "orange", "green", "purple", "brown"] as const;
export type TileColor = (typeof TILE_COLORS)[number];

/** Tuile imagée (fruit ou animal) : elle peut être permutée et détruite par un alignement. */
export interface ImageTile {
  readonly kind: "image";
  readonly id: number;
  /** Identifiant de l'illustration (par exemple « pomme »). */
  readonly picture: string;
  readonly color: TileColor;
}

/** Tuile numérique : jamais permutée par le joueur, jamais détruite. */
export interface NumberTile {
  readonly kind: "number";
  readonly id: number;
  readonly value: number;
}

export type Tile = ImageTile | NumberTile;

/** Une case : une tuile, ou null lorsqu'elle est libre (un chemin de circulation pour les nombres). */
export type Cell = Tile | null;

/** Plateau immuable : toute opération en renvoie un nouveau. Les cases sont rangées ligne après ligne. */
export interface Board {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly Cell[];
}

export interface Position {
  readonly row: number;
  readonly col: number;
}
