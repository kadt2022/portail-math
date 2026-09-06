import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryPage } from "./LibraryPage";

describe("Bibliothèque", () => {
  it("présente les livres et propose la lecture du PDF", () => {
    render(<LibraryPage />);

    expect(screen.getByText("1re primaire")).toBeInTheDocument();
    expect(screen.getByText("2e primaire")).toBeInTheDocument();
    expect(screen.getByText("3e primaire")).toBeInTheDocument();
    expect(screen.getAllByText("75 pages")).toHaveLength(3);

    const [readLink] = screen.getAllByRole("link", { name: /lire le livre/i });
    expect(screen.getAllByRole("link", { name: /lire le livre/i })).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
    expect(readLink.getAttribute("href")).toMatch(
      /\/books\/mbuyamba-1re-primaire-livre-complet\.pdf$/,
    );
    expect(readLink).toHaveAttribute("target", "_blank");
  });
});
