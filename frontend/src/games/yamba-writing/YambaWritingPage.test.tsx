import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { YambaWritingPage } from "./YambaWritingPage";

describe("Page autonome de Yamba écrit", () => {
  it("affiche le titre de niveau 1, le jeu et le lien de retour vers les jeux", () => {
    render(
      <MemoryRouter>
        <YambaWritingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Yamba écrit" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Jeu Yamba écrit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour aux jeux" })).toHaveAttribute("href", "/jeux");
  });
});
