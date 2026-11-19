import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

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

// --- Les Tuiles magiques jouables dans la page Jeux (ordinateur) et en plein écran immersif (téléphone) ---

function stubDevice(immersive: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: immersive,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const tilesLink = () => screen.getByRole("link", { name: "Jouer à Les Tuiles magiques" });
// Le jeu est chargé à la demande : on laisse le temps au chargement du module même sur une machine chargée.
const gameRegion = () => screen.findByRole("region", { name: "Jeu Les Tuiles magiques" }, { timeout: 8000 });
const movesOf = (region: HTMLElement) => within(region).getAllByRole("term").find((t) => t.textContent === "Déplacements")?.nextElementSibling?.textContent;

describe("Les Tuiles magiques dans la page Jeux", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("garde un vrai lien vers l'adresse du jeu, ouvert sur place au clic simple", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    expect(tilesLink()).toHaveAttribute("href", "/jeux/grille-magique");
    expect(screen.queryByRole("region", { name: "Jeu Les Tuiles magiques" })).not.toBeInTheDocument();
    await user.click(tilesLink());
    expect(await gameRegion()).toBeInTheDocument();
  });

  it("ne détourne pas le clic avec un modificateur (nouvel onglet) : le lien normal s'applique", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.keyboard("{Control>}");
    await user.click(tilesLink());
    await user.keyboard("{/Control}");
    expect(screen.queryByRole("region", { name: "Jeu Les Tuiles magiques" })).not.toBeInTheDocument();
  });

  it("ordinateur : le jeu se joue dans la page, les autres jeux restent en dessous, sans quitter la page", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    // Le jeu n'est pas en plein écran : il est dans le flux de la page, au-dessus des autres jeux.
    expect(region.className).not.toMatch(/fullscreen/);
    const heading = screen.getByRole("heading", { level: 2, name: "Autres jeux du portail" });
    expect(region.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Le jeu ouvert n'est plus proposé en dessous, les autres si ; la bannière de Léo laisse la place.
    expect(screen.queryByRole("link", { name: "Jouer à Les Tuiles magiques" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Jouer à/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "Les jeux" })).toBeInTheDocument();
    // Les 9 cases sont jouables sur place.
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    expect(movesOf(region)).toBe("1");
  });

  it("ordinateur : plein écran puis retour, partie conservée ; fermer puis rouvrir reprend la partie", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    await user.click(within(region).getByRole("button", { name: "Passer en plein écran" }));
    expect(region.className).toMatch(/fullscreen/);
    // Le reste de la page est inerte derrière le jeu.
    expect(document.querySelectorAll("[inert]").length).toBeGreaterThan(0);
    expect(movesOf(region)).toBe("1");
    await user.click(within(region).getByRole("button", { name: "Quitter le plein écran" }));
    expect(region.className).not.toMatch(/fullscreen/);
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(region.closest("[hidden]")).not.toBeNull();
    // Le jeu fermé réapparaît dans la galerie ; le rouvrir reprend la même partie.
    await user.click(tilesLink());
    expect(region.closest("[hidden]")).toBeNull();
    expect(movesOf(region)).toBe("1");
  });

  it("première ouverture : le tutoriel guide l'enfant dans la page ; une fois passé, il ne revient plus tout seul", async () => {
    stubDevice(false);
    window.localStorage.removeItem("mbuyamba:tuiles-magiques:tutoriel");
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    expect(within(region).getByTestId("tutorial-panel")).toHaveTextContent("Touche la carte magique pour la révéler.");
    await user.click(within(region).getByRole("button", { name: "Passer le tutoriel" }));
    expect(within(region).queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("mbuyamba:tuiles-magiques:tutoriel")).toBe("fait");
  });

  it("téléphone : le toucher ouvre directement le jeu en plein écran immersif, sans les autres jeux", async () => {
    stubDevice(true);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    expect(region.className).toMatch(/fullscreen/);
    // Pendant la partie, le catalogue est inerte (ni focus ni lecture d'écran) : les autres jeux ne sont pas accessibles.
    expect(document.querySelectorAll("[inert]").length).toBeGreaterThan(0);
    expect(within(region).queryByRole("button", { name: "Passer en plein écran" })).not.toBeInTheDocument();
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    expect(movesOf(region)).toBe("1");
  });

  it("téléphone : « Quitter » ramène au catalogue et à ses autres jeux, la partie reste reprenable", async () => {
    stubDevice(true);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    await user.click(within(region).getByRole("button", { name: "Quitter" }));
    expect(region.closest("[hidden]")).not.toBeNull();
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Jouer à Les Tuiles magiques" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Jouer à/ }).length).toBeGreaterThan(1);
    await user.click(tilesLink());
    expect(region.className).toMatch(/fullscreen/);
    expect(movesOf(region)).toBe("1");
  });
});
