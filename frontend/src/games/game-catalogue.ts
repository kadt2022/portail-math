// Source unique des jeux affichés à la fois par le tableau de bord et par le
// catalogue React. Les jeux non migrés pointent vers de vraies URL serveur
// (Thymeleaf) : ce ne sont jamais des routes clientes.

export type GameAvailability = "external" | "react" | "coming-soon";

export type GameSceneId = "train" | "new-game";

export interface GameCatalogueEntry {
  id: string;
  name: string;
  description: string;
  href: string;
  availability: GameAvailability;
  ctaLabel: string;
  // Une vraie photo (jeux déjà illustrés) OU une scène SVG dessinée pour ce
  // jeu (aucun visuel n'existe encore pour lui) — jamais les deux.
  imageSrc?: string;
  sceneId?: GameSceneId;
}

export const gameCatalogue: GameCatalogueEntry[] = [
  {
    id: "multiplication-train",
    name: "Le Train des multiplications",
    description: "Apprends les tables de 2 et 5 en faisant avancer ton train.",
    href: "/primaire/jeux/train-multiplications",
    availability: "external",
    ctaLabel: "Jouer",
    sceneId: "train",
  },
  {
    id: "fraction-river",
    name: "La Rivière des fractions",
    description: "Traverse la rivière en reconnaissant les bonnes fractions.",
    href: "/primaire/jeux/riviere-des-fractions",
    availability: "external",
    ctaLabel: "Jouer",
    // Recadrée et compressée depuis l'illustration déjà utilisée par le jeu :
    // voir images/dashboard/riviere-carte.webp (75 Ko, contre 2,6 Mo pour
    // l'originale, qui inclut aussi le parchemin vide du jeu, inutile ici).
    imageSrc: "/images/dashboard/riviere-carte.webp",
  },
  {
    id: "new-game",
    name: "Nouveau jeu éducatif",
    description: "Une nouvelle aventure mathématique arrive bientôt.",
    // Relatif au basename "/app" du routeur : c'est ce que <Link> attend.
    href: "/jeux/nouveau-jeu-react",
    availability: "coming-soon",
    ctaLabel: "Bientôt disponible",
    sceneId: "new-game",
  },
];

export interface UpcomingGameEntry {
  id: string;
  name: string;
  description: string;
  accent: string;
}

export const upcomingGames: UpcomingGameEntry[] = [
  {
    id: "number-market",
    name: "Le Marché des nombres",
    description: "Compte, compare et échange au marché.",
    accent: "#e2762b",
  },
  {
    id: "shape-builder",
    name: "Le Constructeur de formes",
    description: "Assemble des formes pour découvrir la géométrie.",
    accent: "#5448e5",
  },
];
