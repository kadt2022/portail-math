import { lazy } from "react";

import { createIntentPreloader } from "./preload/intentPreloader";

// Jeux qui se jouent dans le lecteur de la page « Jeux ». Leur code (et pour Turbo Pulse, le moteur Phaser) n'est téléchargé qu'à la
// demande : jamais à l'ouverture du catalogue. Un survol stable à la souris (250 ms) sur une carte le précharge
// (voir intentPreloader), pour que le lecteur s'ouvre aussitôt au clic ; l'ouverture d'un jeu, elle, charge toujours
// normalement, préchargé ou non.
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

/** Télécharge le code du jeu (le navigateur ne charge un module qu'une fois : sans effet s'il est déjà là). */
function preloadEmbeddedGame(id: string): Promise<unknown> {
  if (!isEmbeddedGameId(id)) return Promise.resolve();
  return Promise.all([loaders[id](), warmups[id]?.()]);
}

// Un seul planificateur pour tout le catalogue : une intention à la fois, un préchargement à la fois, le même pour tous.
const preloader = createIntentPreloader({ load: preloadEmbeddedGame });

/** Survol stable de la carte d'un jeu : préchargement selon les règles d'intentPreloader (si la carte est encore sous le pointeur). */
export function onGameIntent(id: string, stillHovered?: () => boolean): void {
  if (isEmbeddedGameId(id)) preloader.intent(id, stillHovered);
}

/** Fin d'intention (pointeur sorti de la carte) : ce qui n'a pas commencé est annulé. */
export function onGameIntentEnd(id: string): void {
  preloader.end(id);
}

/** Un jeu est ouvert : les préchargements en attente des autres jeux sont abandonnés, il garde tout le débit. */
export function onGameChosen(): void {
  preloader.cancelAll();
}

export const GrilleMagiqueGame = lazy(loaders["grille-magique"]);
export const TurboPulsePlayer = lazy(loaders["turbo-pulse"]);
export const LeoDrivingPlayer = lazy(loaders["conduire-avec-leo"]);
