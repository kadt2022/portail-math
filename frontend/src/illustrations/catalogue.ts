// Métadonnées de la bibliothèque d'illustrations : à quelle catégorie appartient chaque illustration. Elles sont communes à tous les
// jeux et disciplines (Yamba écrit, Raster Puzzle…) : un jeu ne garde que ce qui lui est propre (les mots d'un jeu d'écriture, par exemple).

export type IllustrationCategoryId = "fruits" | "domestic-animals" | "wild-animals" | "objects";

/** Choix de catégorie proposé à l'enfant : l'une des quatre, ou toutes. */
export type IllustrationCategoryChoice = IllustrationCategoryId | "all";

export const ILLUSTRATION_CATEGORY_ORDER: IllustrationCategoryId[] = ["fruits", "domestic-animals", "wild-animals", "objects"];

/** Illustrations de la bibliothèque, par catégorie (l'identifiant est aussi le nom du fichier, sans extension). */
export const ILLUSTRATION_CATALOGUE: Record<IllustrationCategoryId, string[]> = {
  fruits: ["banane", "pomme", "orange", "mangue", "ananas", "raisin", "poire", "fraise", "pasteque", "noix-de-coco"],
  "domestic-animals": ["chat", "chien", "lapin", "poule", "cheval"],
  "wild-animals": ["lion", "elephant", "girafe", "zebre", "singe"],
  objects: ["livre", "crayon", "chaise", "table", "velo", "ballon", "chaussure", "tasse", "cle", "brosse-a-dents"],
};

/** Catégorie d'une illustration. */
export function illustrationCategory(id: string): IllustrationCategoryId {
  const found = ILLUSTRATION_CATEGORY_ORDER.find((category) => ILLUSTRATION_CATALOGUE[category].includes(id));
  if (!found) throw new Error(`Illustration inconnue : ${id}`);
  return found;
}

/** Identifiants d'une catégorie, ou de toutes. */
export function illustrationsOf(choice: IllustrationCategoryChoice): string[] {
  return choice === "all" ? ILLUSTRATION_CATEGORY_ORDER.flatMap((category) => ILLUSTRATION_CATALOGUE[category]) : ILLUSTRATION_CATALOGUE[choice];
}
