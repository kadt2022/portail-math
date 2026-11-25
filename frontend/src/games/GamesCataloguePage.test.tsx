import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { availableCategories, featuredGame, gameCatalogue, playableGames, recommendedGames } from "./game-catalogue";
import { GamesCataloguePage } from "./GamesCataloguePage";
import { GamesHeaderSearch } from "./GamesHeaderSearch";

// Phaser n'a pas sa place dans jsdom : seule la scène est remplacée, le lecteur et la page restent les vrais.
vi.mock("./turbo-pulse/TurboPulseGame", () => ({
  mountTurboPulseGame: () => ({
    destroy: () => undefined,
    restartRun: () => undefined,
    retryLevel: () => undefined,
    nextLevel: () => undefined,
    toggleMuted: () => undefined,
    togglePause: () => undefined,
    refreshLayout: () => undefined,
  }),
}));

// Le jeu 3D du Train est remplacé par un faux, déjà prêt : on vérifie ici l'ouverture dans le lecteur de la page.
vi.mock("@mbuyamba/train-multiplications", () => ({
  toTrainLocale: () => "fr",
  preloadTrainMultiplicationsEngine: () => Promise.resolve(),
  useTrainMultiplications: () => ({
    stage: <div data-testid="scene-train" />,
    player: {
      label: "Jeu Le Train des multiplications",
      title: "Le Train des multiplications",
      headerCenter: "Première ligne",
      stats: [{ label: "Vitesse", value: "0 km/h" }],
      paused: false,
      onPlay: () => undefined,
      onPause: () => undefined,
      ended: false,
      onRestart: () => undefined,
      restartLabel: "Recommencer",
      howTo: [],
    },
    sound: { on: true, toggle: () => undefined, label: "Couper le son" },
    loading: { progress: 1, engineLoaded: true, buildProgress: 1, ready: true, failed: false, unsupported: false, retry: () => undefined },
  }),
}));

vi.mock("../prototypes/leo-livreur/LeoLivreurGame", () => ({
  mountLeoLivreurGame: () => ({
    destroy: () => undefined,
    refreshLayout: () => undefined,
    startMission: () => undefined,
    setDestination: () => undefined,
    lockDriving: () => undefined,
    resumeDriving: () => undefined,
    handOver: async () => undefined,
    returnToRestaurant: () => undefined,
    cue: () => undefined,
    reset: () => undefined,
    setControl: () => undefined,
    turn: () => undefined,
    setPaused: () => undefined,
    retryAssets: () => undefined,
    setSound: () => false,
    horn: () => undefined,
  }),
}));

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

// Téléphone tenu en paysage (le sens imposé par défaut aux jeux) : seule la requête d'appareil répond.
function stubDevice(immersive: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(orientation: portrait)" ? false : immersive,
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

  it("téléphone : le toucher ouvre le lecteur sur tout l'écran, en paysage, avec sa barre ; Plein écran masque la barre", async () => {
    stubDevice(true);
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    // Le plein écran natif du document est demandé dans le geste du clic (seul moyen de tourner l'écran).
    expect(requestFullscreen).toHaveBeenCalled();
    const region = await gameRegion();
    expect(region.className).toMatch(/screen/);
    expect(region).toHaveAttribute("data-orientation", "landscape");
    expect(within(region).getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Passer en portrait" })).toBeInTheDocument();
    // La page derrière le lecteur est inerte.
    expect(document.querySelectorAll("[inert]").length).toBeGreaterThan(0);
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    expect(movesOf(region)).toBe("1");
    await user.click(within(region).getByRole("button", { name: "Passer en plein écran" }));
    expect(within(region).queryByRole("toolbar")).not.toBeInTheDocument();
    await user.click(within(region).getByRole("button", { name: "Quitter le plein écran" }));
    expect(within(region).getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(movesOf(region)).toBe("1");
    delete (document.documentElement as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("téléphone : « Fermer » ramène au catalogue et à ses autres jeux, la partie reste reprenable", async () => {
    stubDevice(true);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    await user.click(within(region).getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(region.closest("[hidden]")).not.toBeNull();
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Jouer à Les Tuiles magiques" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Jouer à/ }).length).toBeGreaterThan(1);
    await user.click(tilesLink());
    expect(region.closest("[hidden]")).toBeNull();
    expect(movesOf(region)).toBe("1");
  });
});

// --- Disposition commune : lecteur à gauche, recommandations à droite, autres jeux dessous ---

describe("Disposition lecteur, recommandations et autres jeux", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recommande d'abord les jeux de la même catégorie, jamais le jeu ouvert, et pas plus que demandé", () => {
    const turbo = playableGames.find((game) => game.id === "turbo-pulse");
    const picks = recommendedGames(turbo, 3);
    expect(picks).toHaveLength(3);
    expect(picks.map((game) => game.id)).not.toContain("turbo-pulse");
    // Le seul autre jeu de calcul passe en premier.
    expect(picks[0].categoryId).toBe("calculation");
    expect(new Set(picks.map((game) => game.id)).size).toBe(3);
    expect(recommendedGames(undefined, 2)).toHaveLength(2);
  });

  it("ordinateur : le lecteur est accompagné de ses informations et de trois recommandations, sans doublon avec « Autres jeux du portail »", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    await gameRegion();

    // Sous le lecteur : nom, description, matière, niveau (rien d'inventé : ni likes ni compteurs).
    const info = screen.getByRole("region", { name: "À propos de Les Tuiles magiques" });
    expect(within(info).getByRole("heading", { level: 2, name: "Les Tuiles magiques" })).toBeInTheDocument();
    expect(within(info).getByText(/pose la carte magique pour résoudre les égalités/)).toBeInTheDocument();
    for (const tag of ["Maths", "Primaire", "Logique"]) {
      expect(within(info).getByText(tag)).toBeInTheDocument();
    }

    // À droite : trois jeux recommandés, cliquables.
    const aside = screen.getByRole("complementary", { name: "À voir aussi" });
    const recommended = within(aside).getAllByRole("link", { name: /^Jouer à/ });
    expect(recommended).toHaveLength(3);
    const recommendedNames = recommended.map((link) => link.getAttribute("aria-label"));
    expect(recommendedNames).not.toContain("Jouer à Les Tuiles magiques");

    // En dessous : « Autres jeux du portail » ne répète ni le jeu ouvert ni les recommandations.
    expect(screen.getByRole("heading", { level: 2, name: "Autres jeux du portail" })).toBeInTheDocument();
    const below = screen.getAllByRole("link", { name: /^Jouer à/ }).filter((link) => !aside.contains(link));
    const belowNames = below.map((link) => link.getAttribute("aria-label"));
    for (const name of [...recommendedNames, "Jouer à Les Tuiles magiques"]) {
      expect(belowNames).not.toContain(name);
    }
    expect(below.length + recommended.length + 1).toBeGreaterThanOrEqual(playableGames.length);
  });

  it("une recommandation qui est un jeu intégré s'ouvre dans le lecteur principal, sans changer de page", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    await gameRegion();

    const aside = screen.getByRole("complementary", { name: "À voir aussi" });
    await user.click(within(aside).getByRole("link", { name: "Jouer à Turbo Pulse" }));
    expect(await screen.findByRole("region", { name: "Turbo Pulse" }, { timeout: 8000 })).toBeInTheDocument();
    // La disposition suit : Turbo Pulse décrit sous le lecteur, et Les Tuiles magiques redeviennent un jeu à découvrir.
    expect(screen.getByRole("region", { name: "À propos de Turbo Pulse" })).toBeInTheDocument();
    const asideAfter = screen.getByRole("complementary", { name: "À voir aussi" });
    // Les Tuiles magiques redeviennent un jeu à découvrir (recommandé ou dans « Autres jeux du portail »), jamais en doublon.
    expect(screen.getAllByRole("link", { name: "Jouer à Les Tuiles magiques" })).toHaveLength(1);
    expect(within(asideAfter).queryByRole("link", { name: "Jouer à Turbo Pulse" })).not.toBeInTheDocument();
  });

  it("changer de jeu lecteur ouvert ramène le haut du nouveau lecteur à l'écran ; jouer ne fait pas défiler la page", async () => {
    stubDevice(false);
    const original = Element.prototype.scrollIntoView;
    const targets: Array<{ element: Element; options: unknown }> = [];
    Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
      targets.push({ element: this, options });
    };
    try {
      const user = userEvent.setup();
      renderPage();
      await user.click(tilesLink());
      await gameRegion();
      targets.length = 0;

      // Lecteur déjà ouvert : on choisit un autre jeu (ici dans « À voir aussi »).
      const aside = screen.getByRole("complementary", { name: "À voir aussi" });
      await user.click(within(aside).getByRole("link", { name: "Jouer à Turbo Pulse" }));
      const turbo = await screen.findByRole("region", { name: "Turbo Pulse" }, { timeout: 8000 });
      // Défilement ciblé sur le cadre du nouveau lecteur (pas un retour en haut du document), immédiat.
      expect(targets).toHaveLength(1);
      expect(targets[0].element.contains(turbo)).toBe(true);
      expect(targets[0].options).toEqual({ block: "start" });

      // Geste dans le jeu (pause) : la page ne bouge pas.
      targets.length = 0;
      await user.click(within(turbo).getByRole("button", { name: "Pause" }));
      expect(targets).toHaveLength(0);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("une recommandation qui n'est pas intégrée reste un vrai lien vers son jeu", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    await gameRegion();
    const aside = screen.getByRole("complementary", { name: "À voir aussi" });
    const leo = within(aside).getByRole("link", { name: "Jouer à Conduire avec Léo" });
    expect(leo).toHaveAttribute("href", "/jeux/conduire-avec-leo");
  });

  it("fermer le lecteur ramène le catalogue seul, sans colonne de recommandations", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    await user.click(tilesLink());
    const region = await gameRegion();
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(screen.queryByRole("complementary", { name: "À voir aussi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "À propos de Les Tuiles magiques" })).not.toBeInTheDocument();
  });
});

describe("Haut de la page Jeux : recherche dans l'en-tête et mode lecteur", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("la grande recherche de l'en-tête filtre les jeux de la page (la recherche vit dans l'adresse)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/jeux"]}>
        <GamesHeaderSearch />
        <GamesCataloguePage />
      </MemoryRouter>,
    );
    await user.type(screen.getByRole("searchbox", { name: "Rechercher un jeu" }), "riviere");
    const cards = screen.getAllByRole("link", { name: /^Jouer à/ });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName("Jouer à La Rivière des fractions");
    // La recherche de la page (téléphone) montre la même valeur.
    expect(screen.getByRole("searchbox", { name: "Chercher un jeu" })).toHaveValue("riviere");
  });

  it("mode lecteur : le titre et le sous-titre s'effacent (le titre reste pour les lecteurs d'écran) ; ils reviennent à la fermeture", async () => {
    stubDevice(false);
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("Découvre, joue et apprends avec nos jeux éducatifs")).toBeInTheDocument();
    await user.click(tilesLink());
    const region = await gameRegion();
    expect(screen.queryByText("Découvre, joue et apprends avec nos jeux éducatifs")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Les jeux" })).toBeInTheDocument();
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(screen.getByText("Découvre, joue et apprends avec nos jeux éducatifs")).toBeInTheDocument();
  });
});

describe("Conduire avec Léo dans la page Jeux", () => {
  const leoRegion = () => screen.findByRole("region", { name: "Jeu Conduire avec Léo" }, { timeout: 8000 });

  it("la bannière à la une ouvre Léo dans le lecteur de la page, sans changer de page", async () => {
    const user = userEvent.setup();
    renderPage();
    const [banner] = screen.getAllByRole("link", { name: "Jouer à Conduire avec Léo" });
    await user.click(banner);
    const region = await leoRegion();
    expect(within(region).getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(within(region).getByRole("region", { name: "Commandes de conduite" })).toBeInTheDocument();
    // La page Jeux reste là : informations du jeu dessous, recommandations à côté.
    expect(screen.getByRole("region", { name: "À propos de Conduire avec Léo" })).toBeInTheDocument();
  });

  it("la carte de Léo dans la galerie l'ouvre aussi dans le lecteur ; Fermer ramène aux autres jeux", async () => {
    const user = userEvent.setup();
    renderPage();
    const links = screen.getAllByRole("link", { name: "Jouer à Conduire avec Léo" });
    await user.click(links[links.length - 1]);
    const region = await leoRegion();
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(region.closest("[hidden]")).not.toBeNull();
  });

  it("le clic sur un jeu affiche aussitôt le chargeur commun, avant même le code du jeu ; Fermer reste possible", async () => {
    const user = userEvent.setup();
    renderPage();
    const links = screen.getAllByRole("link", { name: "Jouer à Conduire avec Léo" });
    await user.click(links[links.length - 1]);
    const loader = document.querySelector("[data-phase]") as HTMLElement;
    expect(loader).not.toBeNull();
    expect(within(loader).getByText(/Initialisation du jeu…|Chargement des ressources…/)).toBeInTheDocument();
    expect(within(loader).getByRole("progressbar", { name: "Chargement du jeu" })).toBeInTheDocument();
    // Plus l'ancienne attente du catalogue.
    expect(screen.queryByText("Chargement du jeu…")).not.toBeInTheDocument();
    await user.click(within(loader).getByRole("button", { name: "Fermer" }));
    // Jeu fermé : le chargeur (et son chronomètre) est retiré.
    expect(loader.isConnected).toBe(false);
    expect(document.querySelectorAll("[data-phase]")).toHaveLength(0);
  });

  it("changer de jeu pendant un chargement : le chargeur du jeu précédent (et son chronomètre) est retiré", async () => {
    const user = userEvent.setup();
    renderPage();
    const leo = screen.getAllByRole("link", { name: "Jouer à Conduire avec Léo" });
    await user.click(leo[leo.length - 1]);
    expect(document.querySelectorAll("[data-phase]")).toHaveLength(1);
    await user.click(tilesLink());
    await gameRegion();
    // Tuiles magiques est prêt dès son montage : plus aucun chargeur affiché, pas même celui de Léo, masqué.
    expect(document.querySelectorAll("[data-phase]")).toHaveLength(0);
  });

  it("la carte du Train des multiplications l'ouvre dans le lecteur de la page ; le chargeur commun a disparu quand le jeu est prêt ; Fermer ramène aux autres jeux", async () => {
    const user = userEvent.setup();
    renderPage();
    const links = screen.getAllByRole("link", { name: /Jouer à Le Train des multiplications/ });
    await user.click(links[links.length - 1]);
    const region = await screen.findByRole("region", { name: "Jeu Le Train des multiplications" }, { timeout: 8000 });
    expect(within(region).getByTestId("scene-train")).toBeInTheDocument();
    expect(document.querySelector("[data-phase]")).toBeNull();
    await user.click(within(region).getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(region.closest("[hidden]")).not.toBeNull();
  });
});
