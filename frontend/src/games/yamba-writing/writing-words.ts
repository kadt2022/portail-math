// Catalogue pédagogique du jeu d'écriture : des données, pas du code. Ajouter un mot, c'est ajouter une ligne ici (et son illustration
// dans la bibliothèque d'illustrations) ; ajouter une langue, c'est ajouter une entrée dans `labels`. Le moteur n'en sait rien.

// Les catégories des illustrations sont celles de la bibliothèque commune (voir illustrations/catalogue) : ce catalogue n'y ajoute que les mots.
import { ILLUSTRATION_CATEGORY_ORDER, illustrationCategory, type IllustrationCategoryChoice, type IllustrationCategoryId } from "../../illustrations/catalogue";

export type WritingCategoryId = IllustrationCategoryId;

/** Choix de catégorie proposé à l'enfant : l'une des quatre, ou toutes. */
export type WritingCategoryChoice = IllustrationCategoryChoice;

export const WRITING_CATEGORY_ORDER = ILLUSTRATION_CATEGORY_ORDER;

export interface WritingWord {
  /** Identifiant stable, aussi nom du fichier d'illustration dans la bibliothèque (sans extension). */
  id: string;
  category: WritingCategoryId;
  /** Le mot à écrire, par langue (clé : code de langue). Les accents et les espaces font partie du mot. */
  labels: Partial<Record<string, string>>;
}

export const DEFAULT_WRITING_LOCALE = "fr";

const WORDS: Array<Omit<WritingWord, "category">> = [
  { id: "banane", labels: { fr: "banane" } },
  { id: "pomme", labels: { fr: "pomme" } },
  { id: "orange", labels: { fr: "orange" } },
  { id: "mangue", labels: { fr: "mangue" } },
  { id: "ananas", labels: { fr: "ananas" } },
  { id: "raisin", labels: { fr: "raisin" } },
  { id: "poire", labels: { fr: "poire" } },
  { id: "fraise", labels: { fr: "fraise" } },
  { id: "pasteque", labels: { fr: "pastèque" } },
  { id: "noix-de-coco", labels: { fr: "noix de coco" } },
  { id: "chat", labels: { fr: "chat" } },
  { id: "chien", labels: { fr: "chien" } },
  { id: "lapin", labels: { fr: "lapin" } },
  { id: "poule", labels: { fr: "poule" } },
  { id: "cheval", labels: { fr: "cheval" } },
  { id: "lion", labels: { fr: "lion" } },
  { id: "elephant", labels: { fr: "éléphant" } },
  { id: "girafe", labels: { fr: "girafe" } },
  { id: "zebre", labels: { fr: "zèbre" } },
  { id: "singe", labels: { fr: "singe" } },
  { id: "livre", labels: { fr: "livre" } },
  { id: "crayon", labels: { fr: "crayon" } },
  { id: "chaise", labels: { fr: "chaise" } },
  { id: "table", labels: { fr: "table" } },
  { id: "velo", labels: { fr: "vélo" } },
  { id: "ballon", labels: { fr: "ballon" } },
  { id: "chaussure", labels: { fr: "chaussure" } },
  { id: "tasse", labels: { fr: "tasse" } },
  { id: "cle", labels: { fr: "clé" } },
  { id: "brosse-a-dents", labels: { fr: "brosse à dents" } },
];

export const WRITING_WORDS: WritingWord[] = WORDS.map((word) => ({ ...word, category: illustrationCategory(word.id) }));

/** Mots d'une catégorie (ou de toutes), pour une langue donnée : les mots sans traduction dans cette langue sont écartés. */
export function wordsFor(choice: WritingCategoryChoice, locale: string = DEFAULT_WRITING_LOCALE, words: WritingWord[] = WRITING_WORDS): WritingWord[] {
  return words.filter((word) => (choice === "all" || word.category === choice) && word.labels[locale] !== undefined);
}
