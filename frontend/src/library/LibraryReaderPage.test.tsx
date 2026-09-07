import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PdfReaderProps } from "@mbuyamba/pdf-reader";

import { LibraryReaderPage } from "./LibraryReaderPage";

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

function renderAt(path: string) {
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
  it("ouvre le livre demandé avec ses libellés traduits", () => {
    renderAt("/bibliotheque/math-primary-one");

    expect(screen.getByText("Je découvre les maths autour de moi")).toBeInTheDocument();
    expect(screen.getByText("Mathématiques · 1re primaire")).toBeInTheDocument();

    expect(lastProps.current?.url).toMatch(/mbuyamba-1re-primaire-livre-complet\.pdf$/);
    expect(lastProps.current?.labels.next).toBe("Page suivante");
    expect(lastProps.current?.labels.contentsUnavailable).toBe(
      "Sommaire non disponible pour ce livre.",
    );
  });

  it("renvoie vers la bibliothèque quand l'identifiant est inconnu", () => {
    renderAt("/bibliotheque/livre-fantome");

    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(screen.queryByText("Mathématiques · 1re primaire")).not.toBeInTheDocument();
  });

  it("revient à la bibliothèque depuis le bouton retour du lecteur", () => {
    renderAt("/bibliotheque/math-primary-two");

    fireEvent.click(screen.getByRole("button", { name: "Retour à la bibliothèque" }));

    expect(screen.getByText("Catalogue")).toBeInTheDocument();
  });
});
