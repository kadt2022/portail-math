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

export function colorOfPicture(picture: string): TileColor {
  const color = PICTURE_COLOR[picture];
  if (!color) throw new Error(`Illustration sans couleur de jeu : ${picture}`);
  return color;
}

/** Illustrations d'une couleur, dans l'ordre de la table. */
export function picturesOfColor(color: TileColor): string[] {
  return Object.keys(PICTURE_COLOR).filter((picture) => PICTURE_COLOR[picture] === color);
}
