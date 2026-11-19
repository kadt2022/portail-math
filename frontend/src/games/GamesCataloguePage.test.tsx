import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { availableCategories, featuredGame, gameCatalogue, playableGames } from "./game-catalogue";
import { GamesCataloguePage } from "./GamesCataloguePage";

function renderPage() {
  return render(
    <MemoryRouter>
      <GamesCataloguePage />
    </MemoryRouter>,
  );
}

describe("GamesCataloguePage", () => {
  it("annonce l'espace des jeux avec son sous-titre", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Les jeux" })).toBeInTheDocument();
    expect(screen.getByText("Découvre, joue et apprends avec nos jeux éducatifs")).toBeInTheDocument();
  });

  it("met Léo à la une avec une bannière entièrement cliquable", () => {
    renderPage();
    const banner = screen.getAllByRole("link", { name: "Jouer à Conduire avec Léo" })[0];
    expect(banner).toHaveAttribute("href", "/jeux/conduire-avec-leo");
    // La bannière ne porte plus de pastilles (« Jeu éducatif », catégorie) : seulement le titre et l'accroche.
    expect(within(banner).queryByText("Jeu éducatif")).not.toBeInTheDocument();
    expect(within(banner).getByText("Conduire avec Léo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Jouer/ })).not.toBeInTheDocument();
  });

  it("n'affiche que les jeux jouables, chaque carte étant un lien vers le jeu", () => {
    renderPage();
    // Léo a sa bannière et reste aussi dans la galerie : bannière + une carte par jeu jouable.
    const cards = screen.getAllByRole("link", { name: /^Jouer à/ });
    expect(cards).toHaveLength(playableGames.length + 1);
    const hrefs = cards.map((card) => card.getAttribute("href"));
    expect(hrefs.filter((href) => href === "/jeux/conduire-avec-leo")).toHaveLength(2);
    const grid = hrefs.slice(1);
    expect(grid.at(-2)).toBe("/jeux/conduire-avec-leo");
    expect(screen.queryByText("Nouveau jeu")).not.toBeInTheDocument();
    expect(playableGames.every((game) => game.availability !== "coming-soon")).toBe(true);
    expect(gameCatalogue.some((game) => game.availability === "coming-soon")).toBe(true);
  });

  it("ne propose que des catégories contenant au moins un jeu", () => {
    renderPage();
    const filters = screen.getByRole("group", { name: "Filtrer par univers" });
    expect(within(filters).getAllByRole("button").filter((button) => button.hasAttribute("aria-pressed"))).toHaveLength(availableCategories.length + 1);
    for (const category of availableCategories) {
      expect(playableGames.some((game) => game.categoryId === category.id)).toBe(true);
    }
  });

  it("filtre par catégorie", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Logique" }));
    const cards = screen.getAllByRole("link", { name: /^Jouer à/ });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName("Jouer à Les Tuiles magiques");
    expect(screen.getByRole("button", { name: "Logique" })).toHaveAttribute("aria-pressed", "true");
  });

  it("recherche un jeu par son nom sans tenir compte des accents", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole("searchbox", { name: "Chercher un jeu" }), "riviere");
    const cards = screen.getAllByRole("link", { name: /^Jouer à/ });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName("Jouer à La Rivière des fractions");
  });

  it("explique l'absence de résultat", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole("searchbox", { name: "Chercher un jeu" }), "zzz");
    expect(screen.queryAllByRole("link", { name: /^Jouer à/ })).toHaveLength(0);
    expect(screen.getByText(/Aucun jeu ne porte ce nom/)).toBeInTheDocument();
  });

  it("a exactement un jeu à la une, jouable", () => {
    expect(gameCatalogue.filter((game) => game.featured)).toHaveLength(1);
    expect(featuredGame?.availability).not.toBe("coming-soon");
  });

  it("n'écrit aucun cache persistant", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    sessionStorage.clear();
    renderPage();
    await user.type(screen.getByRole("searchbox", { name: "Chercher un jeu" }), "leo");
    await user.click(screen.getByRole("button", { name: "Conduite" }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe("Barre basse mobile des jeux", () => {
  it("propose Accueil, Recherche, Filtres et Mes jeux, et ouvre recherche et filtres", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><GamesCataloguePage /></MemoryRouter>);
    const bar = screen.getByRole("navigation", { name: "Navigation des jeux" });
    expect(within(bar).getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
    const search = within(bar).getByRole("button", { name: "Recherche" });
    await user.click(search);
    expect(search).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("searchbox", { name: "Chercher un jeu" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(search).toHaveAttribute("aria-expanded", "false");
    const filters = within(bar).getByRole("button", { name: "Filtres" });
    await user.click(filters);
    expect(filters).toHaveAttribute("aria-expanded", "true");
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await user.click(within(bar).getByRole("button", { name: "Mes jeux" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(filters).toHaveAttribute("aria-expanded", "false");
  });
});
