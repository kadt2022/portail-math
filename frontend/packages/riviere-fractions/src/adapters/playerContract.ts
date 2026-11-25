import type { ReactElement, ReactNode } from "react";

import type { RiverGameEvent } from "../application/session";
import type { RiverLocale } from "../i18n/messages";
import type { RiverEngineModule } from "./engineLoader";

// Contrat entre le jeu et le lecteur standard de l'hôte. Le jeu ne connaît pas le lecteur : il lui fournit ces
// valeurs, que l'hôte passe telles quelles à son propre lecteur (titre, compteurs, Jouer/Pause, Recommencer, Indice,
// instructions). Les commandes générales restent au lecteur ; les commandes de navigation restent dans le jeu.

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
  /** Nom accessible du lecteur. */
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
  onHint: () => void;
  hintDisabled: boolean;
  howTo: PlayerHowToBinding[];
}

export interface RiverLoadingState {
  /** Avancement du chargement, de 0 à 1 (moteur 3D, puis construction de la scène). Pendant le téléchargement, c'est une estimation. */
  progress: number;
  /** Le moteur 3D est téléchargé (la scène se construit ensuite). Étape réelle, sans estimation. */
  engineLoaded: boolean;
  /** Avancement réel de la construction de la scène, de 0 à 1 (0 tant que le moteur n'est pas là). */
  buildProgress: number;
  ready: boolean;
  failed: boolean;
  /** WebGL indisponible : réessayer ne servirait à rien. */
  unsupported: boolean;
  retry: () => void;
}

export interface RiverSoundBinding {
  on: boolean;
  /** À appeler directement dans le clic : c'est ce geste qui autorise le son. */
  toggle: () => void;
  label: string;
}

/** Paramètres que l'hôte peut transmettre au jeu. */
export interface RiverFractionsSettings {
  locale: RiverLocale;
  /** Le jeu est visible : sinon il se met en pause tout seul. */
  active?: boolean;
  /** Point d'extension des futurs comptes et de la sauvegarde : tous les événements de la partie. */
  onEvent?: (event: RiverGameEvent) => void;
  /** Graine des questions (tests) ; par défaut, une nouvelle partie à chaque ouverture. */
  seed?: number;
  /** Petit panneau de mesures (images par seconde, maillages actifs). */
  showPerformance?: boolean;
  maxPixelRatio?: number;
  /** Chargeur du moteur 3D : remplaçable par l'hôte ou par les tests. */
  loadEngine?: () => Promise<RiverEngineModule>;
}

export interface RiverFractionsGame {
  /** La scène du jeu, à placer comme contenu du lecteur standard. */
  stage: ReactElement;
  player: StandardPlayerBinding;
  loading: RiverLoadingState;
  sound: RiverSoundBinding;
}
