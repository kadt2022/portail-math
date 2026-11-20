import type { LibraryBook } from "./library-catalogue";

// Un filtre mémorise une CLÉ de traduction (indépendante de la langue) ; son texte est traduit à l'affichage et à la
// comparaison. Plusieurs livres ont chacun leur clé de matière (« Mathématiques » existe une fois par livre) mais un
// seul filtre « Mathématiques » doit apparaître : on déduplique sur le texte traduit.
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

/** Options de filtre : une par texte affiché distinct, avec la première clé qui le porte, dans l'ordre du catalogue. */
export interface FilterOption {
  key: string;
  label: string;
}

export function filterOptions(books: LibraryBook[], keyOf: (book: LibraryBook) => string, label: (key: string) => string): FilterOption[] {
  const seen = new Map<string, FilterOption>();
  for (const book of books) {
    const key = keyOf(book);
    const text = label(key);
    if (!seen.has(text)) seen.set(text, { key, label: text });
  }
  return [...seen.values()];
}

/** Valeurs distinctes (textes affichés), dans l'ordre du catalogue : seules des valeurs réelles deviennent des filtres. */
export function distinctValues(books: LibraryBook[], pick: (book: LibraryBook) => string): string[] {
  return [...new Set(books.map(pick))];
}

/**
 * Livres correspondant aux filtres (clés). `label` donne le texte affiché (traduit) d'une clé :
 * la recherche porte sur le titre, le niveau et la matière tels que l'enfant les lit.
 */
export function filterBooks(books: LibraryBook[], filters: LibraryFilters, label: (key: string) => string): LibraryBook[] {
  const needle = normalizeText(filters.query);
  return books.filter((book) => {
    if (filters.subject && label(book.subjectKey) !== label(filters.subject)) return false;
    if (filters.level && label(book.levelKey) !== label(filters.level)) return false;
    if (filters.collection && label(book.collectionKey) !== label(filters.collection)) return false;
    if (!needle) return true;
    const haystack = normalizeText([label(book.titleKey), label(book.levelKey), label(book.subjectKey)].join(" "));
    return haystack.includes(needle);
  });
}
