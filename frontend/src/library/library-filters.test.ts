import { describe, expect, it } from "vitest";

import { distinctValues, filterBooks, noLibraryFilters, normalizeText } from "./library-filters";
import type { LibraryBook } from "./library-catalogue";

const book = (id: string, levelKey: string, subjectKey = "subject.math", collectionKey = "collection.a"): LibraryBook => ({
  id,
  titleKey: `title.${id}`,
  descriptionKey: "d",
  levelKey,
  subjectKey,
  collectionKey,
  formatKey: "f",
  pages: 10,
  pdfUrl: "",
  readerPath: `/${id}`,
});
const books = [book("one", "level.1"), book("two", "level.2"), book("sci", "level.2", "subject.science", "collection.b")];
const labels: Record<string, string> = {
  "title.one": "Les nombres",
  "title.two": "Les Formes",
  "title.sci": "Le Corps humain",
  "level.1": "1re primaire",
  "level.2": "2e primaire",
  "subject.math": "Mathématiques",
  "subject.science": "Sciences",
};
const label = (key: string) => labels[key] ?? key;

describe("filtres de la bibliothèque", () => {
  it("normalise accents et casse", () => {
    expect(normalizeText("  Mathématiques ")).toBe("mathematiques");
  });

  it("ne liste que les valeurs réellement présentes, dans l'ordre du catalogue", () => {
    expect(distinctValues(books, (b) => label(b.levelKey))).toEqual(["1re primaire", "2e primaire"]);
    // Deux clés de matière différentes avec le même texte ne donnent qu'un seul filtre.
    expect(distinctValues([book("a", "level.1", "subject.math"), book("b", "level.1", "subject.math2")], (b) => label(b.subjectKey === "subject.math2" ? "subject.math" : b.subjectKey))).toEqual(["Mathématiques"]);
    expect(distinctValues(books, (b) => b.collectionKey)).toEqual(["collection.a", "collection.b"]);
  });

  it("sans filtre, renvoie tous les livres", () => {
    expect(filterBooks(books, noLibraryFilters, label)).toHaveLength(3);
  });

  it("combine matière, niveau et collection", () => {
    expect(filterBooks(books, { ...noLibraryFilters, level: "2e primaire" }, label).map((b) => b.id)).toEqual(["two", "sci"]);
    expect(filterBooks(books, { ...noLibraryFilters, level: "2e primaire", subject: "Mathématiques" }, label).map((b) => b.id)).toEqual(["two"]);
    expect(filterBooks(books, { ...noLibraryFilters, collection: "collection.b" }, label).map((b) => b.id)).toEqual(["sci"]);
  });

  it("recherche dans le titre, le niveau et la matière", () => {
    expect(filterBooks(books, { ...noLibraryFilters, query: "corps" }, label).map((b) => b.id)).toEqual(["sci"]);
    expect(filterBooks(books, { ...noLibraryFilters, query: "MATHEMATIQUES" }, label).map((b) => b.id)).toEqual(["one", "two"]);
    expect(filterBooks(books, { ...noLibraryFilters, query: "1re" }, label).map((b) => b.id)).toEqual(["one"]);
    expect(filterBooks(books, { ...noLibraryFilters, query: "zzz" }, label)).toEqual([]);
  });
});
