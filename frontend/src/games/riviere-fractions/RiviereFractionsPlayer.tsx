import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { toRiverLocale, useRiverFractions } from "@mbuyamba/riviere-fractions";

import { GameLoadingScreen, LOADING_FADE_MS } from "../loading/GameLoadingScreen";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import styles from "./RiviereFractionsPlayer.module.css";

/** Habillage de l'écran de chargement commun aux couleurs de la rivière : ciel du matin, barre couleur lanterne. */
const RIVER_LOADING_THEME = {
  "--loading-background": "radial-gradient(circle at 50% 35%, #3f86b8 0%, #1d4f74 70%, #12344f 100%)",
  "--loading-title": "#fff3d6",
  "--loading-track-border": "rgb(255 220 160 / 45%)",
  "--loading-fill": "linear-gradient(90deg, #c0392b, #ff8a3d 60%, #ffd36b)",
  "--loading-glow": "rgb(255 170 90 / 60%)",
} as CSSProperties;

export interface RiviereFractionsPlayerProps {
  /** Présentation immersive : le lecteur occupe tout l'écran, barre masquée (voir GamePlayer). */
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  /** Ferme le jeu (retour à la page des jeux). Absent : pas de bouton. */
  onClose?: () => void;
  /** Téléphone : le lecteur occupe tout l'écran dès l'ouverture, avec sa barre (voir GamePlayer). */
  cover?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
  /** Page de jeu autonome : le titre est le titre de niveau 1 de la page. */
  pageHeading?: boolean;
}

// La Rivière des Fractions dans le lecteur standard des jeux. Le jeu est un module à part (@mbuyamba/riviere-fractions) :
// il fournit sa scène et ce que le lecteur affiche (titre, compteurs, commandes, instructions). Le portail n'apporte que
// le lecteur, l'écran de chargement commun et la langue choisie.
export function RiviereFractionsPlayer({ fullscreen = false, onFullscreenChange, onClose, cover = false, active = true, pageHeading = false }: RiviereFractionsPlayerProps) {
  const { i18n } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Panneau de mesures sur demande (adresse ...?mesures), pour relever les images par seconde sur un téléphone.
  const showPerformance = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mesures"), []);
  const game = useRiverFractions({ locale: toRiverLocale(i18n.language), active, showPerformance });
  const { player, loading, sound } = game;
  // L'écran de chargement s'efface en fondu une fois la rivière prête, puis quitte la scène.
  const [fadedOut, setFadedOut] = useState(false);
  useEffect(() => {
    if (!loading.ready) return;
    const timer = window.setTimeout(() => setFadedOut(true), LOADING_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [loading.ready]);
  const loadingGone = loading.ready && fadedOut;

  return (
    <GamePlayer
      rootRef={rootRef}
      label={player.label}
      title={player.title}
      titleIsHeading={pageHeading}
      headerCenter={<span className={styles.level}>{player.headerCenter}</span>}
      stats={player.stats}
      paused={player.paused}
      onPlay={player.onPlay}
      onPause={player.onPause}
      ended={player.ended}
      onRestart={player.onRestart}
      restartLabel={player.restartLabel}
      onHint={player.onHint}
      hintDisabled={player.hintDisabled}
      howTo={player.howTo}
      extraControls={
        <button type="button" className={playerControlClass} aria-pressed={sound.on} aria-label={sound.label} onClick={sound.toggle}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {sound.on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
          </svg>
          <span>{sound.label}</span>
        </button>
      }
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
      initialOrientation="device"
    >
      <div className={styles.stage}>
        {game.stage}
        {loadingGone ? null : (
          <GameLoadingScreen
            progress={loading.ready ? 1 : loading.progress}
            finished={loading.ready}
            failed={loading.failed && !loading.unsupported}
            onRetry={loading.retry}
            theme={RIVER_LOADING_THEME}
          />
        )}
      </div>
    </GamePlayer>
  );
}
