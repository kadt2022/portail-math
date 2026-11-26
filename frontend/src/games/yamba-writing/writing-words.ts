// Catalogue pédagogique du jeu d'écriture : des données, pas du code. Ajouter un mot, c'est ajouter une ligne ici (et son illustration
// dans la bibliothèque d'illustrations) ; ajouter une langue, c'est ajouter une entrée dans `labels`. Le moteur n'en sait rien.

export type WritingCategoryId = "fruits" | "domestic-animals" | "wild-animals" | "objects";

/** Choix de catégorie proposé à l'enfant : l'une des quatre, ou toutes. */
export type WritingCategoryChoice = WritingCategoryId | "all";

export const WRITING_CATEGORY_ORDER: WritingCategoryId[] = ["fruits", "domestic-animals", "wild-animals", "objects"];

export interface WritingWord {
  /** Identifiant stable, aussi nom du fichier d'illustration dans la bibliothèque (sans extension). */
  id: string;
  category: WritingCategoryId;
  /** Le mot à écrire, par langue (clé : code de langue). Les accents et les espaces font partie du mot. */
  labels: Partial<Record<string, string>>;
}

export const DEFAULT_WRITING_LOCALE = "fr";

export const WRITING_WORDS: WritingWord[] = [
  { id: "banane", category: "fruits", labels: { fr: "banane" } },
  { id: "pomme", category: "fruits", labels: { fr: "pomme" } },
  { id: "orange", category: "fruits", labels: { fr: "orange" } },
  { id: "mangue", category: "fruits", labels: { fr: "mangue" } },
  { id: "ananas", category: "fruits", labels: { fr: "ananas" } },
  { id: "raisin", category: "fruits", labels: { fr: "raisin" } },
  { id: "poire", category: "fruits", labels: { fr: "poire" } },
  { id: "fraise", category: "fruits", labels: { fr: "fraise" } },
  { id: "pasteque", category: "fruits", labels: { fr: "pastèque" } },
  { id: "noix-de-coco", category: "fruits", labels: { fr: "noix de coco" } },
  { id: "chat", category: "domestic-animals", labels: { fr: "chat" } },
  { id: "chien", category: "domestic-animals", labels: { fr: "chien" } },
  { id: "lapin", category: "domestic-animals", labels: { fr: "lapin" } },
  { id: "poule", category: "domestic-animals", labels: { fr: "poule" } },
  { id: "cheval", category: "domestic-animals", labels: { fr: "cheval" } },
  { id: "lion", category: "wild-animals", labels: { fr: "lion" } },
  { id: "elephant", category: "wild-animals", labels: { fr: "éléphant" } },
  { id: "girafe", category: "wild-animals", labels: { fr: "girafe" } },
  { id: "zebre", category: "wild-animals", labels: { fr: "zèbre" } },
  { id: "singe", category: "wild-animals", labels: { fr: "singe" } },
  { id: "livre", category: "objects", labels: { fr: "livre" } },
  { id: "crayon", category: "objects", labels: { fr: "crayon" } },
  { id: "chaise", category: "objects", labels: { fr: "chaise" } },
  { id: "table", category: "objects", labels: { fr: "table" } },
  { id: "velo", category: "objects", labels: { fr: "vélo" } },
  { id: "ballon", category: "objects", labels: { fr: "ballon" } },
  { id: "chaussure", category: "objects", labels: { fr: "chaussure" } },
  { id: "tasse", category: "objects", labels: { fr: "tasse" } },
  { id: "cle", category: "objects", labels: { fr: "clé" } },
  { id: "brosse-a-dents", category: "objects", labels: { fr: "brosse à dents" } },
];

/** Mots d'une catégorie (ou de toutes), pour une langue donnée : les mots sans traduction dans cette langue sont écartés. */
export function wordsFor(choice: WritingCategoryChoice, locale: string = DEFAULT_WRITING_LOCALE, words: WritingWord[] = WRITING_WORDS): WritingWord[] {
  return words.filter((word) => (choice === "all" || word.category === choice) && word.labels[locale] !== undefined);
}
