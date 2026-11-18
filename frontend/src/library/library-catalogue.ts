import { useEffect, useState } from "react";

// Miniatures 420 px (35-47 Ko) : les couvertures d'origine (834 px, 84-105 Ko) ne servent qu'à les produire.
import mathPrimaryFiveCover from "./assets/cover-five.webp";
import mathPrimaryOneCover from "./assets/cover-one.webp";
import mathPrimaryThreeCover from "./assets/cover-three.webp";
import mathPrimaryTwoCover from "./assets/cover-two.webp";

export interface LibraryBook {
  id: string;
  titleKey: string;
  descriptionKey: string;
  levelKey: string;
  subjectKey: string;
  /** Collection du livre : pas encore fournie par le backend, tous les livres sont de la collection Mbuyamba. */
  collectionKey: string;
  formatKey: string;
  pages: number;
  cover?: string;
  pdfUrl: string;
  readerPath: string;
}

interface LibraryBookDto {
  id: string;
  titleKey: string;
  descriptionKey: string;
  levelKey: string;
  subjectKey: string;
  formatKey: string;
  pages: number;
  fileUrl: string;
}

interface ResourceCatalogueDto {
  books: LibraryBookDto[];
}

interface LibraryCatalogueState {
  books: LibraryBook[];
  loading: boolean;
  error: boolean;
}

// Les couvertures restent des assets génériques du portail : le backend
// distribue le contenu pédagogique, pas l'habillage. Un livre publié sans
// couverture connue reste lisible, il s'affiche seulement sans visuel.
const covers: Record<string, string> = {
  "math-primary-one": mathPrimaryOneCover,
  "math-primary-two": mathPrimaryTwoCover,
  "math-primary-three": mathPrimaryThreeCover,
  "math-primary-five": mathPrimaryFiveCover,
};

function toBook(dto: LibraryBookDto): LibraryBook {
  return {
    id: dto.id,
    titleKey: dto.titleKey,
    descriptionKey: dto.descriptionKey,
    levelKey: dto.levelKey,
    subjectKey: dto.subjectKey,
    collectionKey: "book.collection",
    formatKey: dto.formatKey,
    pages: dto.pages,
    ...(covers[dto.id] ? { cover: covers[dto.id] } : {}),
    pdfUrl: dto.fileUrl,
    readerPath: `/bibliotheque/${dto.id}`,
  };
}

export async function loadLibraryCatalogue(signal?: AbortSignal): Promise<LibraryBook[]> {
  const response = await fetch("/api/v1/resources", { signal });
  if (!response.ok) {
    throw new Error(`Le catalogue de la bibliothèque est indisponible (${response.status}).`);
  }
  const catalogue = (await response.json()) as ResourceCatalogueDto;
  if (!Array.isArray(catalogue.books)) {
    throw new TypeError("Le catalogue de la bibliothèque est invalide.");
  }
  return catalogue.books.map(toBook);
}

export function useLibraryCatalogue(): LibraryCatalogueState {
  const [state, setState] = useState<LibraryCatalogueState>({ books: [], loading: true, error: false });

  useEffect(() => {
    const controller = new AbortController();
    loadLibraryCatalogue(controller.signal).then(
      (books) => setState({ books, loading: false, error: false }),
      (error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setState({ books: [], loading: false, error: true });
        }
      },
    );
    return () => controller.abort();
  }, []);

  return state;
}
