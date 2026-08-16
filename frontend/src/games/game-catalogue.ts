// Source unique des jeux affichés à la fois par le tableau de bord et par le
// catalogue React. Les moteurs historiques restent servis dans des coquilles
// HTML statiques : ce ne sont pas des routes clientes du SPA.
//
// `nameKey` / `descriptionKey` / `ctaLabelKey` pointent vers le namespace
// "games" (voir frontend/src/i18n/locales/*/games.json) : jamais de texte
// affiché figé ici, pour que le Dashboard reste bilingue sans dupliquer
// cette liste.

export type GameAvailability = "standalone" | "react" | "coming-soon";

export type GameSceneId = "train" | "new-game" | "grille-magique" | "turbo-pulse";

export interface GameCatalogueEntry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  ctaLabelKey: string;
  href: string;
  availability: GameAvailability;
  // Une vraie photo (jeux déjà illustrés) OU une scène SVG dessinée pour ce
  // jeu (aucun visuel n'existe encore pour lui) — jamais les deux.
  imageSrc?: string;
  sceneId?: GameSceneId;
}

export const gameCatalogue: GameCatalogueEntry[] = [
  {
    id: "multiplication-train",
    nameKey: "multiplicationTrain.name",
    descriptionKey: "multiplicationTrain.description",
    ctaLabelKey: "multiplicationTrain.cta",
    href: "/games/multiplication-train.html",
    availability: "standalone",
    sceneId: "train",
  },
  {
    id: "fraction-river",
    nameKey: "fractionRiver.name",
    descriptionKey: "fractionRiver.description",
    ctaLabelKey: "fractionRiver.cta",
    href: "/games/fraction-river.html",
    availability: "standalone",
    // Recadrée et compressée depuis l'illustration déjà utilisée par le jeu :
    // voir images/dashboard/riviere-carte.webp (75 Ko, contre 2,6 Mo pour
    // l'originale, qui inclut aussi le parchemin vide du jeu, inutile ici).
    imageSrc: "/images/dashboard/riviere-carte.webp",
  },
  {
    id: "grille-magique",
    nameKey: "grilleMagique.name",
    descriptionKey: "grilleMagique.description",
    ctaLabelKey: "grilleMagique.cta",
    href: "/jeux/grille-magique",
    availability: "react",
    sceneId: "grille-magique",
  },
  {
    id: "turbo-pulse",
    nameKey: "turboPulse.name",
    descriptionKey: "turboPulse.description",
    ctaLabelKey: "turboPulse.cta",
    href: "/jeux/turbo-pulse",
    availability: "react",
    sceneId: "turbo-pulse",
  },
  {
    id: "new-game",
    nameKey: "newGame.name",
    descriptionKey: "newGame.description",
    ctaLabelKey: "newGame.cta",
    // Relatif au basename "/app" du routeur : c'est ce que <Link> attend.
    href: "/jeux/nouveau-jeu-react",
    availability: "coming-soon",
    sceneId: "new-game",
  },
];

export interface UpcomingGameEntry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  accent: string;
}

export const upcomingGames: UpcomingGameEntry[] = [
  {
    id: "number-market",
    nameKey: "upcoming.numberMarket.name",
    descriptionKey: "upcoming.numberMarket.description",
    accent: "#e2762b",
  },
  {
    id: "shape-builder",
    nameKey: "upcoming.shapeBuilder.name",
    descriptionKey: "upcoming.shapeBuilder.description",
    accent: "#5448e5",
  },
];
