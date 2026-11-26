import type { ReactElement, ReactNode } from "react";

import type { TrainEvent } from "../engine/scene/trainEngine";
import type { TrainLocale } from "../i18n/messages";
import type { TrainEngineModule } from "./engineLoader";

// Contrat entre le jeu et le lecteur standard de l'hôte (même forme que la Rivière des fractions) : le jeu fournit
// titre, compteurs, Jouer/Pause, Recommencer et instructions ; l'hôte les passe tels quels à son lecteur. Les
// commandes de conduite restent dans la scène du jeu.

export interface PlayerStatBinding {
  label: string;
  value: ReactNode;
  srOnly?: boolean;
}

export interface PlayerHowToBinding {
  title: string;
  text: string;
}

export interface StandardPlayerBinding {
  label: string;
  title: string;
  headerCenter: ReactNode;
  stats: PlayerStatBinding[];
  paused: boolean;
  onPlay: () => void;
  onPause: () => void;
  ended: boolean;
  onRestart: () => void;
  restartLabel: string;
  howTo: PlayerHowToBinding[];
}

export interface TrainLoadingState {
  /** Progression d'ensemble, de 0 à 1 (moteur téléchargé : la moitié, puis construction du monde). */
  progress: number;
  /** Le moteur 3D est téléchargé (le monde ferroviaire se construit ensuite). */
  engineLoaded: boolean;
  /** Avancement réel de la construction du monde ferroviaire, de 0 à 1 (0 tant que le moteur n'est pas là). */
  buildProgress: number;
  ready: boolean;
  failed: boolean;
  unsupported: boolean;
  retry: () => void;
}

export interface TrainSoundBinding {
  on: boolean;
  toggle: () => void;
  label: string;
}

export interface TrainMultiplicationsSettings {
  locale: TrainLocale;
  active?: boolean;
  /** Tous les événements de la conduite (arrêts en gare, aiguillage, caméras) : point d'extension des futures missions. */
  onEvent?: (event: TrainEvent) => void;
  showPerformance?: boolean;
  maxPixelRatio?: number;
  quality?: "auto" | "low" | "high";
  /** Moteur de rendu : WebGPU si possible (« auto », par défaut), ou forcé, pour comparer sur un même appareil. */
  renderer?: "auto" | "webgpu" | "webgl";
  loadEngine?: () => Promise<TrainEngineModule>;
}

export interface TrainMultiplicationsGame {
  stage: ReactElement;
  player: StandardPlayerBinding;
  loading: TrainLoadingState;
  sound: TrainSoundBinding;
}
