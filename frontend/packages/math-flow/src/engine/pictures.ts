import type { TileColor } from "./types";

/**
 * Couleur de chaque illustration de fruit de la bibliothèque Yamba (les fruits seulement : aucun animal sur les tuiles). La couleur est celle de la tuile : c'est elle,
 * et non l'illustration, qui permet de former un alignement. Les animaux et les objets de la bibliothèque ne sont pas utilisés.
 */
export const PICTURE_COLOR: Readonly<Record<string, TileColor>> = {
  // Fruits
  pomme: "red",
  fraise: "red",
  banane: "yellow",
  ananas: "yellow",
  orange: "orange",
  mangue: "orange",
  poire: "green",
  pasteque: "green",
  raisin: "purple",
  "noix-de-coco": "brown",
};

/** Ordre d'apparition des images : une image de plus à chaque palier, de couleurs bien distinctes d'abord. */
export const LEVEL_PICTURES: readonly string[] = ["pomme", "banane", "orange", "pasteque", "raisin", "noix-de-coco", "fraise", "ananas", "mangue", "poire"];

export function colorOfPicture(picture: string): TileColor {
  const color = PICTURE_COLOR[picture];
  if (!color) throw new Error(`Illustration sans couleur de jeu : ${picture}`);
  return color;
}

/** Illustrations d'une couleur, dans l'ordre de la table. */
export function picturesOfColor(color: TileColor): string[] {
  return Object.keys(PICTURE_COLOR).filter((picture) => PICTURE_COLOR[picture] === color);
}
