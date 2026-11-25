import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { toRiverLocale, useRiverFractions } from "@mbuyamba/riviere-fractions";

import { useGameLoading } from "../loading/GameLoaderHost";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import styles from "./RiviereFractionsPlayer.module.css";

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
// le lecteur, le chargeur commun (voir loading/GameLoaderHost) et la langue choisie.
export function RiviereFractionsPlayer({ fullscreen = false, onFullscreenChange, onClose, cover = false, active = true, pageHeading = false }: RiviereFractionsPlayerProps) {
  const { i18n } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Panneau de mesures sur demande (adresse ...?mesures), pour relever les images par seconde sur un téléphone.
  const showPerformance = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mesures"), []);
  const game = useRiverFractions({ locale: toRiverLocale(i18n.language), active, showPerformance });
  const { player, loading, sound } = game;
  // Chargeur commun (posé par l'hôte du lecteur) : le jeu lui signale ses étapes réelles. Moteur 3D téléchargé : jalon de
  // l'initialisation ; construction de la rivière : progression des ressources ; rivière prête : le chargeur disparaît.
  // La progression estimée pendant le téléchargement (loading.progress) n'est jamais utilisée.
  const session = useGameLoading();
  useEffect(() => {
    session.milestone("mounted");
  }, [session]);
  useEffect(() => {
    if (loading.engineLoaded) session.milestone("engine");
  }, [session, loading.engineLoaded]);
  useEffect(() => {
    session.reportResources(loading.buildProgress);
  }, [session, loading.buildProgress]);
  useEffect(() => {
    if (loading.ready) session.ready();
  }, [session, loading.ready]);
  // Échec réel (moteur introuvable, réseau coupé) : Réessayer, dans le chargeur. Appareil sans WebGL : le chargeur
  // s'efface pour laisser lire le message du jeu, qui explique que l'appareil n'est pas compatible.
  useEffect(() => {
    if (loading.unsupported) session.ready();
    else if (loading.failed) session.fail(loading.retry);
  }, [session, loading.failed, loading.unsupported, loading.retry]);

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
      </div>
    </GamePlayer>
  );
}
