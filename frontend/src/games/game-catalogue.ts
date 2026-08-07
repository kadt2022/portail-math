// Source unique des jeux affichés à la fois par le tableau de bord et par le
// catalogue React. Les jeux non migrés pointent vers de vraies URL serveur
// (Thymeleaf) : ce ne sont jamais des routes clientes.
//
// `nameKey` / `descriptionKey` / `ctaLabelKey` pointent vers le namespace
// "games" (voir frontend/src/i18n/locales/*/games.json) : jamais de texte
// affiché figé ici, pour que le Dashboard reste bilingue sans dupliquer
// cette liste.

export type GameAvailability = "external" | "react" | "coming-soon";

export type GameSceneId = "train" | "new-game";

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
    href: "/primaire/jeux/train-multiplications",
    availability: "external",
    sceneId: "train",
  },
  {
    id: "fraction-river",
    nameKey: "fractionRiver.name",
    descriptionKey: "fractionRiver.description",
    ctaLabelKey: "fractionRiver.cta",
    href: "/primaire/jeux/riviere-des-fractions",
    availability: "external",
    // Recadrée et compressée depuis l'illustration déjà utilisée par le jeu :
    // voir images/dashboard/riviere-carte.webp (75 Ko, contre 2,6 Mo pour
    // l'originale, qui inclut aussi le parchemin vide du jeu, inutile ici).
    imageSrc: "/images/dashboard/riviere-carte.webp",
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
