import { lazy } from "react";

import { loadLeoEngine } from "./leo-driving/leoEngine";
import { createIntentPreloader } from "./preload/intentPreloader";

// Jeux qui se jouent dans le lecteur de la page « Jeux ». Leur code (et pour Turbo Pulse et Léo, le moteur Phaser) n'est téléchargé qu'à la
// demande : jamais à l'ouverture du catalogue. Un survol stable à la souris (250 ms) sur une carte le précharge
// (voir intentPreloader), pour que le lecteur s'ouvre aussitôt au clic ; l'ouverture d'un jeu, elle, charge toujours
// normalement, préchargé ou non.
const loaders = {
  "grille-magique": () => import("./grille-magique/GrilleMagiqueGame").then((m) => ({ default: m.GrilleMagiqueGame })),
  "turbo-pulse": () => import("./turbo-pulse/TurboPulsePlayer").then((m) => ({ default: m.TurboPulsePlayer })),
  "conduire-avec-leo": () => import("./leo-driving/LeoDrivingPlayer").then((m) => ({ default: m.LeoDrivingPlayer })),
  "train-des-multiplications": () => import("./train-multiplications/TrainMultiplicationsPlayer").then((m) => ({ default: m.TrainMultiplicationsPlayer })),
  "riviere-des-fractions": () => import("./riviere-fractions/RiviereFractionsPlayer").then((m) => ({ default: m.RiviereFractionsPlayer })),
  "yamba-ecrit": () => import("./yamba-writing/YambaWritingGame").then((m) => ({ default: m.YambaWritingGame })),
} as const;

type EmbeddedGameId = keyof typeof loaders;

function isEmbeddedGameId(id: string): id is EmbeddedGameId {
  return id in loaders;
}

// Turbo Pulse et Léo chargent leur moteur Phaser à la demande (le lecteur et son écran de chargement s'affichent sans
// l'attendre) : l'intention du joueur prépare aussi ce moteur, pour que la partie démarre aussitôt au clic.
const warmups: Partial<Record<EmbeddedGameId, () => Promise<unknown>>> = {
  "turbo-pulse": () => import("./turbo-pulse/TurboPulseGame"),
  "conduire-avec-leo": () => loadLeoEngine(),
  // Babylon.js et le monde ferroviaire : un morceau à part, jamais téléchargé à l'ouverture du portail ni du catalogue.
  "train-des-multiplications": () => import("@mbuyamba/train-multiplications").then((m) => m.preloadTrainMultiplicationsEngine()),
  // Babylon.js et la scène de la rivière : un morceau à part, jamais téléchargé à l'ouverture du portail ni du catalogue.
  "riviere-des-fractions": () => import("@mbuyamba/riviere-fractions").then((m) => m.preloadRiverFractionsEngine()),
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

/**
 * Ouverture d'un jeu : son lecteur, et en même temps son moteur (sans attendre que le lecteur soit affiché pour le
 * demander). Le chargement du jeu choisi, jamais un préchargement.
 */
function open<Id extends EmbeddedGameId>(id: Id): ReturnType<(typeof loaders)[Id]> {
  void warmups[id]?.().catch(() => undefined);
  return loaders[id]() as ReturnType<(typeof loaders)[Id]>;
}

export const GrilleMagiqueGame = lazy(() => open("grille-magique"));
export const TurboPulsePlayer = lazy(() => open("turbo-pulse"));
export const LeoDrivingPlayer = lazy(() => open("conduire-avec-leo"));
export const TrainMultiplicationsPlayer = lazy(() => open("train-des-multiplications"));
export const RiviereFractionsPlayer = lazy(() => open("riviere-des-fractions"));
export const YambaWritingGame = lazy(() => open("yamba-ecrit"));
