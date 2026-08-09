import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { DashboardPage } from "./DashboardPage";

function renderDashboard() {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>,
  );
}

describe("Tableau de bord", () => {
  it("ne porte qu'un seul h1", () => {
    renderDashboard();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("les jeux historiques pointent vers leurs coquilles statiques", () => {
    renderDashboard();
    const links = screen.getAllByRole("link", { name: /jouer/i });
    const standaloneLinks = links.filter((link) => link.getAttribute("href")?.endsWith(".html"));
    const hrefs = standaloneLinks.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/games/multiplication-train.html");
    expect(hrefs).toContain("/games/fraction-river.html");
    expect(standaloneLinks.every((link) => link.hasAttribute("data-game-direct-launch"))).toBe(true);
  });

  it("la Grille magique pointe vers sa route React, sans lancement direct", () => {
    renderDashboard();
    const gameLink = screen
      .getAllByRole("link", { name: /jouer/i })
      .find((candidate) => candidate.getAttribute("href") === "/jeux/grille-magique");
    expect(gameLink).toBeDefined();
    expect(gameLink).not.toHaveAttribute("data-game-direct-launch");
  });

  it("le nouveau jeu n'a pas de bouton actif tant qu'il n'est pas développé", () => {
    renderDashboard();
    expect(screen.getByText(/bientôt disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /nouvelle aventure/i })).not.toBeInTheDocument();
  });

  it("la progression n'affiche aucun chiffre inventé", () => {
    renderDashboard();
    expect(screen.getByText(/défis terminés/i)).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });
});
