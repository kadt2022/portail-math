import { lazy } from "react";

// Jeux qui se jouent dans le lecteur de la page « Jeux ». Leur code (et pour Turbo Pulse, le moteur Phaser) n'est téléchargé qu'à la
// demande ; preloadEmbeddedGame le lance dès que le joueur montre son intention (survol, focus, toucher de la carte), pour que le
// lecteur s'ouvre aussitôt au clic au lieu d'attendre le téléchargement.
const loaders = {
  "grille-magique": () => import("./grille-magique/GrilleMagiqueGame").then((m) => ({ default: m.GrilleMagiqueGame })),
  "turbo-pulse": () => import("./turbo-pulse/TurboPulsePlayer").then((m) => ({ default: m.TurboPulsePlayer })),
  "conduire-avec-leo": () => import("./leo-driving/LeoDrivingPlayer").then((m) => ({ default: m.LeoDrivingPlayer })),
} as const;

type EmbeddedGameId = keyof typeof loaders;

function isEmbeddedGameId(id: string): id is EmbeddedGameId {
  return id in loaders;
}

// Turbo Pulse charge son moteur Phaser à la demande (le lecteur s'affiche sans l'attendre) : l'intention du joueur
// prépare aussi ce moteur, pour que la partie démarre aussitôt au clic.
const warmups: Partial<Record<EmbeddedGameId, () => Promise<unknown>>> = {
  "turbo-pulse": () => import("./turbo-pulse/TurboPulseGame"),
};

/** Lance le téléchargement du jeu (sans effet s'il est déjà chargé ou en cours : le navigateur ne charge un module qu'une fois). */
export function preloadEmbeddedGame(id: string): void {
  if (isEmbeddedGameId(id)) {
    void loaders[id]().catch(() => undefined);
    void warmups[id]?.().catch(() => undefined);
  }
}

export const GrilleMagiqueGame = lazy(loaders["grille-magique"]);
export const TurboPulsePlayer = lazy(loaders["turbo-pulse"]);
export const LeoDrivingPlayer = lazy(loaders["conduire-avec-leo"]);
