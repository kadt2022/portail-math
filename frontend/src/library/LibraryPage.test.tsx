import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { LibraryPage } from "./LibraryPage";

describe("Bibliothèque", () => {
  it("présente les livres et propose la lecture du PDF", () => {
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);

    expect(screen.getByText("1re primaire")).toBeInTheDocument();
    expect(screen.getByText("2e primaire")).toBeInTheDocument();
    expect(screen.getByText("3e primaire")).toBeInTheDocument();
    expect(screen.getAllByText("96 pages")).toHaveLength(2);
    expect(screen.getByText("75 pages")).toBeInTheDocument();

    const [readLink] = screen.getAllByRole("link", { name: /lire le livre/i });
    expect(screen.getAllByRole("link", { name: /lire le livre/i })).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
    expect(readLink.getAttribute("href")).toMatch(
      /\/bibliotheque\/math-primary-one$/,
    );
  });
});

