import mathPrimaryOneCover from "../assets/library-math-primary-one-cover.webp";
import mathPrimaryTwoCover from "../assets/library-math-primary-two-cover.webp";
import mathPrimaryThreeCover from "../assets/library-math-primary-three-cover.webp";

export interface LibraryBook {
  id: string;
  titleKey: string;
  descriptionKey: string;
  levelKey: string;
  subjectKey: string;
  formatKey: string;
  pages: number;
  cover: string;
  pdfPath: string;
}

export const libraryCatalogue: LibraryBook[] = [
  {
    id: "math-primary-one",
    titleKey: "books.mathPrimaryOne.title",
    descriptionKey: "books.mathPrimaryOne.description",
    levelKey: "books.mathPrimaryOne.level",
    subjectKey: "books.mathPrimaryOne.subject",
    formatKey: "books.mathPrimaryOne.format",
    pages: 75,
    cover: mathPrimaryOneCover,
    pdfPath: `${import.meta.env.BASE_URL}books/mbuyamba-1re-primaire-livre-complet.pdf`,
  },
  {
    id: "math-primary-two",
    titleKey: "books.mathPrimaryTwo.title",
    descriptionKey: "books.mathPrimaryTwo.description",
    levelKey: "books.mathPrimaryTwo.level",
    subjectKey: "books.mathPrimaryTwo.subject",
    formatKey: "books.mathPrimaryTwo.format",
    pages: 75,
    cover: mathPrimaryTwoCover,
    pdfPath: `${import.meta.env.BASE_URL}books/mbuyamba-2e-primaire-livre-complet.pdf`,
  },
  {
    id: "math-primary-three",
    titleKey: "books.mathPrimaryThree.title",
    descriptionKey: "books.mathPrimaryThree.description",
    levelKey: "books.mathPrimaryThree.level",
    subjectKey: "books.mathPrimaryThree.subject",
    formatKey: "books.mathPrimaryThree.format",
    pages: 75,
    cover: mathPrimaryThreeCover,
    pdfPath: `${import.meta.env.BASE_URL}books/mbuyamba-3e-primaire-livre-complet.pdf`,
  },
];
