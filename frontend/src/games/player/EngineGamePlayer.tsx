import { useRef, type ReactNode } from "react";

import { useEngineGameLoading, type EngineLoadingState } from "../loading/useEngineGameLoading";
import type { EmbeddedPlayerProps } from "./EmbeddedPlayerProps";
import styles from "./EngineGamePlayer.module.css";
import { GamePlayer, type GamePlayerProps } from "./GamePlayer";
import { SoundToggleButton } from "./SoundToggleButton";

type SharedPlayerFields = Pick<GamePlayerProps, "label" | "title" | "stats" | "paused" | "onPlay" | "onPause" | "ended" | "onRestart" | "restartLabel" | "onHint" | "hintDisabled" | "howTo">;

/** Ce qu'un module de jeu 3D (Babylon.js) fournit au lecteur : sa scène, ses compteurs, son son et son chargement. */
export interface EngineGame {
  stage: ReactNode;
  player: SharedPlayerFields & { headerCenter: ReactNode };
  sound: { on: boolean; label: string; toggle: () => void };
  loading: EngineLoadingState;
}

export interface EngineGamePlayerProps extends EmbeddedPlayerProps {
  game: EngineGame;
}

// Lecteur standard d'un jeu 3D : la scène occupe tout l'espace du lecteur, le chargement est signalé au chargeur commun.
export function EngineGamePlayer({ game, fullscreen = false, onFullscreenChange, onClose, cover = false, pageHeading = false }: EngineGamePlayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEngineGameLoading(game.loading);
  const { player, sound } = game;
  const { headerCenter, ...fields } = player;
  return (
    <GamePlayer
      rootRef={rootRef}
      {...fields}
      titleIsHeading={pageHeading}
      headerCenter={<span className={styles.level}>{headerCenter}</span>}
      extraControls={<SoundToggleButton on={sound.on} label={sound.label} onToggle={sound.toggle} />}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
      initialOrientation="device"
    >
      <div className={styles.stage}>{game.stage}</div>
    </GamePlayer>
  );
}
