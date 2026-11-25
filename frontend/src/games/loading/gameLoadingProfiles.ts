import type { CSSProperties } from "react";

import { createLoadingSession, type LoadingSession } from "./loadingSession";

// Jalons techniques de l'initialisation de chaque jeu (de 0 à 10 % de la progression globale), et habillage du chargeur.
// Les poids sont relatifs : ils sont ramenés aux 10 % de l'initialisation (voir loadingSession).
//   - player  : code du lecteur reçu (import dynamique terminé) ;
//   - engine  : moteur de jeu reçu (Phaser) ;
//   - mounted : lecteur monté, ses ressources connues et demandées.
// Un futur jeu déclare ici ses jalons ; sans profil, seuls « player » et « mounted » comptent.

export interface GameLoadingProfile {
  milestones: Readonly<Record<string, number>>;
  theme?: CSSProperties;
}

/** Habillage aux couleurs de Léo : nuit en ville, barre orange de la pizzeria. */
const LEO_THEME = {
  "--loading-background": "radial-gradient(circle at 50% 40%, #1f5368 0%, #10303f 70%, #0a1f2b 100%)",
  "--loading-title": "#ffe7c2",
  "--loading-track-border": "rgb(255 190 120 / 45%)",
  "--loading-fill": "linear-gradient(90deg, #ef6a37, #ffb347 60%, #ffe0a3)",
  "--loading-glow": "rgb(255 160 80 / 60%)",
} as CSSProperties;

const PHASER_GAME = { player: 3, engine: 5, mounted: 2 } as const;

const PROFILES: Record<string, GameLoadingProfile> = {
  "conduire-avec-leo": { milestones: PHASER_GAME, theme: LEO_THEME },
  "turbo-pulse": { milestones: PHASER_GAME },
  "grille-magique": { milestones: { player: 7, mounted: 3 } },
};

const DEFAULT_PROFILE: GameLoadingProfile = { milestones: { player: 7, mounted: 3 } };

export function gameLoadingProfile(game: string): GameLoadingProfile {
  return PROFILES[game] ?? DEFAULT_PROFILE;
}

/** Séance ouverte au clic sur un jeu : son horloge (seuil des 90 s) part de ce geste. */
export function startGameLoading(game: string): LoadingSession {
  return createLoadingSession(gameLoadingProfile(game).milestones);
}
