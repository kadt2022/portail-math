// Source unique des jeux affichés par le catalogue React. Les moteurs
// historiques restent servis dans des coquilles HTML statiques : ce ne sont pas
// des routes clientes du SPA.
//
// `nameKey` / `taglineKey` pointent vers le namespace "games" (voir
// frontend/src/i18n/locales/*/games.json) : jamais de texte affiché figé ici.
// Les vignettes sont importées par le build (hachées, compressées en WebP,
// ≈ 11-80 Ko) et chargées à la demande : aucune ne dépend d'un moteur de jeu.

import fluxForgeThumb from "./assets/thumb-flux-forge.webp";
import fractionRiverThumb from "./assets/thumb-fraction-river.webp";
import riviereFractionsThumb from "./assets/thumb-riviere-fractions.webp";
import addiFlowThumb from "./assets/thumb-addi-flow.webp";
import diviFlowThumb from "./assets/thumb-divi-flow.webp";
import multipliFlowThumb from "./assets/thumb-multipli-flow.webp";
import soustraFlowThumb from "./assets/thumb-soustra-flow.webp";
import rasterPuzzleThumb from "./assets/thumb-raster-puzzle.webp";
import yambaWritingThumb from "./assets/thumb-yamba-ecrit.webp";
import leoCar from "./assets/leo-car-front-banner.webp";
import leoCountryside from "./assets/leo-countryside-1280.webp";
import multiplicationTrainThumb from "./assets/thumb-multiplication-train.webp";
import train3dThumb from "./assets/thumb-train-3d.webp";
import tuilesMagiquesThumb from "./assets/thumb-tuiles-magiques.webp";
import turboPulseThumb from "./assets/thumb-turbo-pulse.webp";

export type GameAvailability = "standalone" | "react" | "coming-soon";

export type GameCategoryId = "driving" | "calculation" | "logic" | "discovery";

export interface GameCategory {
  id: GameCategoryId;
  /** Clé du namespace "games". */
  labelKey: string;
}

// Seules les catégories qui contiennent réellement un jeu jouable sont affichées
// (voir availableCategories) : aucune catégorie vide n'est présentée comme remplie.
export const gameCategories: GameCategory[] = [
  { id: "driving", labelKey: "categories.driving" },
  { id: "calculation", labelKey: "categories.calculation" },
  { id: "logic", labelKey: "categories.logic" },
  { id: "discovery", labelKey: "categories.discovery" },
];

export interface GameCatalogueEntry {
  id: string;
  nameKey: string;
  /** Accroche très courte (quelques mots) affichée sur la carte. */
  taglineKey: string;
  /** Description longue : réservée à une future page de détail, absente des cartes. */
  descriptionKey: string;
  href: string;
  availability: GameAvailability;
  categoryId: GameCategoryId;
  /** Jeu qui se joue directement dans la page « Jeux » (sans changer de page) ; son adresse reste valable pour un accès direct. */
  embed?: boolean;
  /** Matière et niveau scolaire (clés du namespace "games"), affichés sous le lecteur : absents, rien n'est affiché. */
  subjectKey?: string;
  levelKey?: string;
  /** Âge minimal recommandé et nombre de niveaux, affichés sur la carte : absents, rien n'est affiché. */
  minAge?: number;
  levels?: number;
  /** Racine des textes de la fiche détaillée (« Voir plus » sous le lecteur) : absente, la fiche ne montre que l'essentiel. */
  detailsKey?: string;
  /** Jeu mis en avant par la bannière « À la une » (un seul à la fois). */
  featured?: boolean;
  thumbnail?: string;
  /** Illustration détourée posée au premier plan de la vignette (ex. la voiture de Léo). */
  overlay?: string;
  /** Point focal de la vignette (object-position) : garde l'essentiel visible quand le cadre recadre. */
  focus?: string;
}

export const gameCatalogue: GameCatalogueEntry[] = [
  {
    id: "conduire-avec-leo",
    nameKey: "leoDriving.name",
    taglineKey: "leoDriving.tagline",
    descriptionKey: "leoDriving.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome).
    href: "/jeux/conduire-avec-leo",
    availability: "react",
    categoryId: "driving",
    embed: true,
    featured: true,
    thumbnail: leoCountryside,
    // Voiture de face, détourée, posée sur le décor : même illustration que la bannière.
    overlay: leoCar,
  },
  {
    id: "turbo-pulse",
    nameKey: "turboPulse.name",
    taglineKey: "turboPulse.tagline",
    descriptionKey: "turboPulse.description",
    href: "/jeux/turbo-pulse",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: turboPulseThumb,
  },
  {
    id: "multiplication-train",
    nameKey: "multiplicationTrain.name",
    taglineKey: "multiplicationTrain.tagline",
    descriptionKey: "multiplicationTrain.description",
    href: "/games/multiplication-train.html",
    availability: "standalone",
    categoryId: "calculation",
    thumbnail: multiplicationTrainThumb,
  },
  {
    id: "train-des-multiplications",
    nameKey: "trainMultiplications.name",
    taglineKey: "trainMultiplications.tagline",
    descriptionKey: "trainMultiplications.description",
    // Version 3D (Babylon.js), jouée dans le lecteur standard de la page Jeux. L'ancienne version
    // (« multiplication-train », ci-dessus) reste en place jusqu'à la validation de celle-ci.
    href: "/jeux/train-des-multiplications",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: train3dThumb,
  },
  {
    id: "riviere-des-fractions",
    nameKey: "riviereFractions.name",
    taglineKey: "riviereFractions.tagline",
    descriptionKey: "riviereFractions.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome). L'ancienne version
    // (« fraction-river », ci-dessous) reste en place jusqu'à la validation de celle-ci.
    href: "/jeux/riviere-des-fractions",
    availability: "react",
    categoryId: "discovery",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: riviereFractionsThumb,
  },
  {
    id: "fraction-river",
    nameKey: "fractionRiver.name",
    taglineKey: "fractionRiver.tagline",
    descriptionKey: "fractionRiver.description",
    href: "/games/fraction-river.html",
    availability: "standalone",
    categoryId: "discovery",
    thumbnail: fractionRiverThumb,
  },
  {
    id: "grille-magique",
    nameKey: "grilleMagique.name",
    taglineKey: "grilleMagique.tagline",
    descriptionKey: "grilleMagique.description",
    href: "/jeux/grille-magique",
    availability: "react",
    categoryId: "logic",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: tuilesMagiquesThumb,
  },
  {
    id: "yamba-ecrit",
    nameKey: "yambaWriting.name",
    taglineKey: "yambaWriting.tagline",
    descriptionKey: "yambaWriting.description",
    // Se joue dans le lecteur standard de la page Jeux (l’adresse reste aussi une page autonome).
    href: "/jeux/yamba-ecrit",
    availability: "react",
    categoryId: "discovery",
    embed: true,
    subjectKey: "meta.subject.french",
    levelKey: "meta.level.primary",
    thumbnail: yambaWritingThumb,
  },
  {
    id: "raster-puzzle",
    nameKey: "rasterPuzzle.name",
    taglineKey: "rasterPuzzle.tagline",
    descriptionKey: "rasterPuzzle.description",
    // Se joue dans le lecteur standard de la page Jeux (l’adresse reste aussi une page autonome).
    href: "/jeux/raster-puzzle",
    availability: "react",
    categoryId: "logic",
    embed: true,
    levelKey: "meta.level.primary",
    thumbnail: rasterPuzzleThumb,
  },
  {
    id: "addi-flow",
    nameKey: "addiFlow.name",
    taglineKey: "addiFlow.tagline",
    descriptionKey: "addiFlow.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome).
    href: "/jeux/addi-flow",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: addiFlowThumb,
    minAge: 7,
    levels: 5,
    detailsKey: "addiFlow.details",
  },
  {
    id: "soustra-flow",
    nameKey: "soustraFlow.name",
    taglineKey: "soustraFlow.tagline",
    descriptionKey: "soustraFlow.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome).
    href: "/jeux/soustra-flow",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: soustraFlowThumb,
    minAge: 7,
    levels: 5,
    detailsKey: "soustraFlow.details",
  },
  {
    id: "multipli-flow",
    nameKey: "multipliFlow.name",
    taglineKey: "multipliFlow.tagline",
    descriptionKey: "multipliFlow.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome).
    href: "/jeux/multipli-flow",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: multipliFlowThumb,
    minAge: 7,
    levels: 5,
    detailsKey: "multipliFlow.details",
  },
  {
    id: "divi-flow",
    nameKey: "diviFlow.name",
    taglineKey: "diviFlow.tagline",
    descriptionKey: "diviFlow.description",
    // Se joue dans le lecteur standard de la page Jeux (l'adresse reste aussi une page autonome).
    href: "/jeux/divi-flow",
    availability: "react",
    categoryId: "calculation",
    embed: true,
    subjectKey: "meta.subject.maths",
    levelKey: "meta.level.primary",
    thumbnail: diviFlowThumb,
    minAge: 7,
    levels: 5,
    detailsKey: "diviFlow.details",
  },
  {
    id: "flux-forge",
    nameKey: "fluxForge.name",
    taglineKey: "fluxForge.tagline",
    descriptionKey: "fluxForge.description",
    href: "/games/flux-forge.html",
    availability: "standalone",
    categoryId: "discovery",
    thumbnail: fluxForgeThumb,
  },
  {
    id: "new-game",
    nameKey: "newGame.name",
    taglineKey: "newGame.tagline",
    descriptionKey: "newGame.description",
    // Relatif au basename "/app" du routeur : c'est ce que <Link> attend.
    href: "/jeux/nouveau-jeu-react",
    availability: "coming-soon",
    categoryId: "discovery",
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

/** Jeux réellement jouables : les entrées « bientôt » ne sont pas listées comme des cartes de jeu. */
export const playableGames = gameCatalogue.filter((game) => game.availability !== "coming-soon");

export const featuredGame = playableGames.find((game) => game.featured);

export const availableCategories = gameCategories.filter((category) =>
  playableGames.some((game) => game.categoryId === category.id),
);

/** Nombre de cartes de la colonne « À voir aussi » à côté du lecteur. */
export const RECOMMENDED_COUNT = 4;

/**
 * Jeux recommandés à côté du lecteur : d'abord ceux de la même catégorie, puis les autres, dans l'ordre du catalogue.
 * Le jeu ouvert n'y figure jamais, et seuls les jeux publiés y sont proposés (les entrées « bientôt » en sont exclues). Sous le
 * lecteur, la section « Autres jeux du portail » reprend ces mêmes jeux en tête (voir gamesBelowPlayer).
 */
export function recommendedGames(current: GameCatalogueEntry | undefined, count = RECOMMENDED_COUNT): GameCatalogueEntry[] {
  const others = playableGames.filter((game) => game.id !== current?.id);
  const sameCategory = others.filter((game) => game.categoryId === current?.categoryId);
  const rest = others.filter((game) => game.categoryId !== current?.categoryId);
  return [...sameCategory, ...rest].slice(0, count);
}

/**
 * Jeux proposés sous le lecteur : les jeux recommandés d'abord (dans le même ordre que la colonne de droite), puis le reste du
 * catalogue publié. Le jeu ouvert n'y figure jamais ; aucun jeu n'y est répété.
 */
export function gamesBelowPlayer(current: GameCatalogueEntry | undefined, recommended: readonly GameCatalogueEntry[], pool: readonly GameCatalogueEntry[] = playableGames): GameCatalogueEntry[] {
  const seen = new Set<string>();
  const result: GameCatalogueEntry[] = [];
  for (const game of [...recommended, ...pool]) {
    if (game.id === current?.id || seen.has(game.id) || !playableGames.some((candidate) => candidate.id === game.id)) continue;
    seen.add(game.id);
    result.push(game);
  }
  return result;
}
