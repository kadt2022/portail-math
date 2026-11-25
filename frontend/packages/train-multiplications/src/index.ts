// Contrat public du Train des multiplications 3D. Tout ce qui n'est pas exporté ici est interne au module.

export { useTrainMultiplications } from "./adapters/useTrainMultiplications";
export { loadTrainEngine as preloadTrainMultiplicationsEngine } from "./adapters/engineLoader";
export type {
  PlayerHowToBinding,
  PlayerStatBinding,
  StandardPlayerBinding,
  TrainLoadingState,
  TrainMultiplicationsGame,
  TrainMultiplicationsSettings,
  TrainSoundBinding,
} from "./adapters/playerContract";
export type { DecorHandle, MaterialSlot, TrainEvent } from "./engine/scene/trainEngine";
export type { AnchorKind, DecorAnchor } from "./world/anchors";
export { TRAIN_LOCALES, toTrainLocale, type TrainLocale } from "./i18n/messages";

/** Identité du module, pour le catalogue de l'hôte et les futures missions. */
export const TRAIN_MULTIPLICATIONS_MANIFEST = {
  id: "train-des-multiplications",
  version: "0.1.0",
  levels: ["ligne-1-conduite-libre"],
} as const;
