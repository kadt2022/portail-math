import { vi } from "vitest";

// Réponse du catalogue backend (/api/v1/resources) telle que la bibliothèque la
// consomme. Partagée par les tests des deux pages pour qu'elles ne dérivent pas
// l'une de l'autre.
export const catalogueResponse = {
  books: [
    {
      id: "math-primary-one",
      titleKey: "books.mathPrimaryOne.title",
      descriptionKey: "books.mathPrimaryOne.description",
      levelKey: "books.mathPrimaryOne.level",
      subjectKey: "books.mathPrimaryOne.subject",
      formatKey: "books.mathPrimaryOne.format",
      pages: 96,
      fileUrl: "/api/v1/resources/books/math-primary-one/file",
    },
    {
      id: "math-primary-two",
      titleKey: "books.mathPrimaryTwo.title",
      descriptionKey: "books.mathPrimaryTwo.description",
      levelKey: "books.mathPrimaryTwo.level",
      subjectKey: "books.mathPrimaryTwo.subject",
      formatKey: "books.mathPrimaryTwo.format",
      pages: 96,
      fileUrl: "/api/v1/resources/books/math-primary-two/file",
    },
    {
      id: "math-primary-three",
      titleKey: "books.mathPrimaryThree.title",
      descriptionKey: "books.mathPrimaryThree.description",
      levelKey: "books.mathPrimaryThree.level",
      subjectKey: "books.mathPrimaryThree.subject",
      formatKey: "books.mathPrimaryThree.format",
      pages: 96,
      fileUrl: "/api/v1/resources/books/math-primary-three/file",
    },
  ],
  gameQuestionBanks: [],
};

export function mockLibraryCatalogue(response: unknown = catalogueResponse, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    json: async () => response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
