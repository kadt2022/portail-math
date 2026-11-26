import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { RasterPuzzlePage } from "./RasterPuzzlePage";

describe("Page autonome de Raster Puzzle", () => {
  it("affiche le titre de niveau 1, le jeu et le lien de retour vers les jeux", () => {
    render(
      <MemoryRouter>
        <RasterPuzzlePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Raster Puzzle" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Jeu Raster Puzzle" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour aux jeux" })).toHaveAttribute("href", "/jeux");
  });
});
