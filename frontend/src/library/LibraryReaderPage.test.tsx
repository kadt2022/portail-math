import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PdfReaderProps } from "@mbuyamba/pdf-reader";

import { LibraryReaderPage } from "./LibraryReaderPage";
import { mockLibraryCatalogue } from "./library-catalogue.fixture";

// Le lecteur PDF réel initialise pdfjs-dist et son worker : hors sujet ici, où
// l'on vérifie seulement que la page résout le livre, compose les libellés et
// câble le retour. Le stub expose les props utiles au test.
const lastProps: { current: PdfReaderProps | null } = { current: null };
vi.mock("@mbuyamba/pdf-reader", () => ({
  PdfReader: (props: PdfReaderProps) => {
    lastProps.current = props;
    return (
      <div>
        <p>{props.title}</p>
        <p>{props.subtitle}</p>
        <button type="button" onClick={props.onBack}>
          {props.backLabel}
        </button>
      </div>
    );
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  mockLibraryCatalogue();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bibliotheque" element={<p>Catalogue</p>} />
        <Route path="/bibliotheque/:bookId" element={<LibraryReaderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Lecteur de la bibliothèque", () => {
  it("ouvre le livre demandé avec ses libellés traduits", async () => {
    renderAt("/bibliotheque/math-primary-one");

    expect(await screen.findByText("Je découvre les maths autour de moi")).toBeInTheDocument();
    expect(screen.getByText("Mathématiques · 1re primaire")).toBeInTheDocument();

    expect(lastProps.current?.url).toBe("/api/v1/resources/books/math-primary-one/file");
    expect(lastProps.current?.labels.next).toBe("Page suivante");
    expect(lastProps.current?.labels.contentsUnavailable).toBe(
      "Sommaire non disponible pour ce livre.",
    );
  });

  it("renvoie vers la bibliothèque quand l'identifiant est inconnu", async () => {
    renderAt("/bibliotheque/livre-fantome");

    expect(await screen.findByText("Catalogue")).toBeInTheDocument();
    expect(screen.queryByText("Mathématiques · 1re primaire")).not.toBeInTheDocument();
  });

  it("revient à la bibliothèque depuis le bouton retour du lecteur", async () => {
    renderAt("/bibliotheque/math-primary-two");

    fireEvent.click(await screen.findByRole("button", { name: "Retour à la bibliothèque" }));

    expect(screen.getByText("Catalogue")).toBeInTheDocument();
  });
});
