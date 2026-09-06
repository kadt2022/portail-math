import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryPage } from "./LibraryPage";

describe("Bibliothèque", () => {
  it("présente le livre et propose la lecture et le téléchargement du même PDF", () => {
    render(<LibraryPage />);

    expect(screen.getByText("1re primaire")).toBeInTheDocument();
    expect(screen.getByText("2e primaire")).toBeInTheDocument();
    expect(screen.getAllByText("75 pages")).toHaveLength(2);

    const [readLink] = screen.getAllByRole("link", { name: /lire le livre/i });
    const [downloadLink] = screen.getAllByRole("link", { name: /télécharger/i });
    expect(screen.getAllByRole("link", { name: /lire le livre/i })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /télécharger/i })).toHaveLength(2);
    expect(readLink.getAttribute("href")).toMatch(
      /\/books\/mbuyamba-1re-primaire-livre-complet\.pdf$/,
    );
    expect(readLink).toHaveAttribute("target", "_blank");
    expect(downloadLink).toHaveAttribute("href", readLink.getAttribute("href"));
    expect(downloadLink).toHaveAttribute("download");
  });
});
