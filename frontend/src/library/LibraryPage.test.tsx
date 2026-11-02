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
    expect(screen.getByText("5e primaire")).toBeInTheDocument();
    expect(screen.getAllByText("96 pages")).toHaveLength(3);
    expect(screen.getByText("93 pages")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/resources", expect.anything());

    const [readLink] = screen.getAllByRole("link", { name: /lire le livre/i });
    expect(screen.getAllByRole("link", { name: /lire le livre/i })).toHaveLength(4);
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
    expect(readLink.getAttribute("href")).toMatch(
      /\/bibliotheque\/math-primary-one$/,
    );
  });

  it("annonce le livre de 5e comme premier volume, avec sa couverture et son lecteur", async () => {
    mockLibraryCatalogue();
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);

    expect(await screen.findByRole("img", { name: /Volume 1/ })).toBeInTheDocument();
    expect(screen.getByText(/Nombres et calcul/)).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Couverture/i })).toHaveLength(4);
    const links = screen.getAllByRole("link", { name: /lire le livre/i });
    expect(links.at(-1)?.getAttribute("href")).toContain("/bibliotheque/math-primary-five");
  });

  it("ancre les libellés masqués des métadonnées dans leur carte, sans créer de second ascenseur", async () => {
    mockLibraryCatalogue();
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    await screen.findByText("1re primaire");

    const terms = document.querySelectorAll("dt");
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) {
      // Un élément en position absolue se place par rapport à son premier ancêtre positionné. S'il n'y en a
      // aucun dans la carte, il se repère sur la page entière : il échappe au conteneur de défilement du portail
      // et allonge le document, ce qui ajoute une seconde barre de défilement à droite.
      let anchor = term.parentElement;
      while (anchor && getComputedStyle(anchor).position === "static") {
        anchor = anchor.parentElement;
      }
      const card = term.closest("article");
      expect(anchor).not.toBeNull();
      expect(card?.contains(anchor)).toBe(true);
    }
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
