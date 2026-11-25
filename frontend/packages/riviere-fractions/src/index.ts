// Contrat public de La Rivière des Fractions 3D. Tout ce qui n'est pas exporté ici est interne au module et peut
// changer sans prévenir l'hôte.

export { useRiverFractions } from "./adapters/useRiverFractions";
export { loadRiverEngine as preloadRiverFractionsEngine } from "./adapters/engineLoader";
export type {
  PlayerHowToBinding,
  PlayerStatBinding,
  RiverFractionsGame,
  RiverFractionsSettings,
  RiverLoadingState,
  RiverSoundBinding,
  StandardPlayerBinding,
} from "./adapters/playerContract";
export type { RiverGameEvent } from "./application/session";
export { RIVER_LOCALES, toRiverLocale, type RiverLocale } from "./i18n/messages";

/** Identité du module, pour le catalogue de l'hôte et les futures sauvegardes de progression. */
export const RIVER_FRACTIONS_MANIFEST = {
  id: "riviere-des-fractions",
  version: "0.1.0",
  levels: ["niveau-1-premiere-traversee"],
} as const;
