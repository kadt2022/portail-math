import type { LibraryBook } from "./library-catalogue";

// Les filtres portent sur le texte affiché (traduit) : plusieurs livres ont chacun leur clé de matière
// (« Mathématiques » existe une fois par livre) mais un seul filtre « Mathématiques » doit apparaître.
export interface LibraryFilters {
  subject: string | null;
  level: string | null;
  collection: string | null;
  query: string;
}

export const noLibraryFilters: LibraryFilters = { subject: null, level: null, collection: null, query: "" };

// Compare sans tenir compte des accents ni de la casse : « maths » trouve « Mathématiques ».
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Valeurs distinctes (textes affichés), dans l'ordre du catalogue : seules des valeurs réelles deviennent des filtres. */
export function distinctValues(books: LibraryBook[], pick: (book: LibraryBook) => string): string[] {
  return [...new Set(books.map(pick))];
}

/**
 * Livres correspondant aux filtres. `label` donne le texte affiché (traduit) d'une clé :
 * la recherche porte sur le titre, le niveau et la matière tels que l'enfant les lit.
 */
export function filterBooks(books: LibraryBook[], filters: LibraryFilters, label: (key: string) => string): LibraryBook[] {
  const needle = normalizeText(filters.query);
  return books.filter((book) => {
    if (filters.subject && label(book.subjectKey) !== filters.subject) return false;
    if (filters.level && label(book.levelKey) !== filters.level) return false;
    if (filters.collection && label(book.collectionKey) !== filters.collection) return false;
    if (!needle) return true;
    const haystack = normalizeText([label(book.titleKey), label(book.levelKey), label(book.subjectKey)].join(" "));
    return haystack.includes(needle);
  });
}
