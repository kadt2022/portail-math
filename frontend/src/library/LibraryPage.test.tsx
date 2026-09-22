import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LibraryPage } from "./LibraryPage";
import { mockLibraryCatalogue } from "./library-catalogue.fixture";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Bibliothèque", () => {
  it("présente les livres annoncés par le catalogue backend", async () => {
    const fetchMock = mockLibraryCatalogue();
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);

    expect(await screen.findByText("1re primaire")).toBeInTheDocument();
    expect(screen.getByText("2e primaire")).toBeInTheDocument();
    expect(screen.getByText("3e primaire")).toBeInTheDocument();
    expect(screen.getAllByText("96 pages")).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/resources", expect.anything());

    const [readLink] = screen.getAllByRole("link", { name: /lire le livre/i });
    expect(screen.getAllByRole("link", { name: /lire le livre/i })).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
    expect(readLink.getAttribute("href")).toMatch(
      /\/bibliotheque\/math-primary-one$/,
    );
  });

  it("prévient l'élève quand le catalogue est indisponible", async () => {
    mockLibraryCatalogue(undefined, false);
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La bibliothèque est momentanément indisponible",
    );
    expect(screen.queryByText("1re primaire")).not.toBeInTheDocument();
  });
});
