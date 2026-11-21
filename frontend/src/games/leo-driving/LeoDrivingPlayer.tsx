import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { mountLeoLivreurGame, type LeoLivreurController, type LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";
import { ALL_CONTROLS, HoldButton, HornButton, INITIAL_SNAPSHOT, instructionFor } from "../../prototypes/leo-livreur/LeoLivreurPrototypePage";
import leoStyles from "../../prototypes/leo-livreur/LeoLivreurPrototypePage.module.css";
import { drivingLayout } from "../../prototypes/leo-livreur/leoDrivingLayout";
import { DeliverButton, LeoMissionOverlay, missionDashboard, missionInstruction } from "../../prototypes/leo-livreur/LeoMissionLayer";
import { useLeoMission } from "../../prototypes/leo-livreur/useLeoMission";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { onViewportSettled } from "../viewport-events";
import styles from "./LeoDrivingPlayer.module.css";

/** Largeur de lecteur sous laquelle direction, consigne et pédales ne tiennent plus sur une seule ligne. */
const NARROW_STAGE_WIDTH = 640;
/**
 * Hauteur de scène sous laquelle une fenêtre de la mission ne tient plus (pavé tactile compris) : elle recouvre alors
 * aussi le panneau de conduite, inactif pendant la question. La barre du lecteur et le tableau de bord restent dégagés.
 */
const MIN_MISSION_SCENE_HEIGHT = 280;

export interface LeoDrivingPlayerProps {
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

// « Conduire avec Léo » dans le lecteur standard des jeux. Le moteur (LeoLivreurGame), ses règles, son décor et ses boutons
// de conduite sont ceux du jeu ; le lecteur apporte le cadre, l'en-tête (pizzas, vitesse, prochaine maison), la barre de
// commandes (Jouer/Pause, Recommencer, Son, Plein écran, Portrait/Paysage, Fermer), le plein écran et la veille.
// Les commandes de conduite (direction, pédales, klaxon) sont des commandes de jeu : elles restent dans la scène.
export function LeoDrivingPlayer({ fullscreen = false, onFullscreenChange, onClose, cover = false, active = true, pageHeading = false }: LeoDrivingPlayerProps) {
  const { t } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LeoLivreurController | null>(null);
  const [controller, setController] = useState<LeoLivreurController | null>(null);
  const [snapshot, setSnapshot] = useState<LeoLivreurSnapshot>(INITIAL_SNAPSHOT);
  const [paused, setPaused] = useState(false);
  // Son coupé au départ, activé par l'enfant (règle du jeu de Léo).
  const [soundOn, setSoundOn] = useState(false);
  // Taille des boutons de conduite : d'après la place réelle du lecteur, pas celle de la fenêtre.
  const [stageSize, setStageSize] = useState({ width: 960, height: 540 });
  // Hauteur réelle de la scène : trop basse, les fenêtres de la mission recouvrent aussi le panneau de conduite (inactif).
  const [sceneHeight, setSceneHeight] = useState(540);
  // Mission : tournées, stock, questions et bilans (voir leoMission).
  const mission = useLeoMission(controller, snapshot);
  const dashboard = missionDashboard(mission.state, snapshot);

  useEffect(() => {
    if (!hostRef.current) return;
    const mounted = mountLeoLivreurGame(hostRef.current, setSnapshot);
    controllerRef.current = mounted;
    setController(mounted);
    const host = hostRef.current;
    const stage = stageRef.current;
    const measure = () => {
      if (stage) setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
      setSceneHeight(host.clientHeight);
      controllerRef.current?.refreshLayout();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    if (stage) observer.observe(stage);
    // Retour de veille, rotation, plein écran : la scène est remesurée une fois la disposition appliquée.
    const stopListening = onViewportSettled(measure);
    return () => {
      observer.disconnect();
      stopListening();
      mounted.destroy();
      controllerRef.current = null;
      setController(null);
    };
  }, []);

  const releaseAll = useCallback(() => {
    for (const control of ALL_CONTROLS) controllerRef.current?.setControl(control, false);
    controllerRef.current?.horn(false);
  }, []);

  const pause = useCallback(() => setPaused(true), []);
  const play = useCallback(() => setPaused(false), []);

  // Moteur suspendu (physique, trafic et feux figés) quand la partie est en pause ou que le jeu est masqué (fermé, autre jeu
  // ouvert) ; les commandes sont alors relâchées. Rien n'est perdu.
  const suspended = paused || !active;
  useEffect(() => {
    if (suspended) releaseAll();
    controllerRef.current?.setPaused(suspended);
  }, [suspended, controller, releaseAll]);

  // Perte de focus (autre application, alerte) : aucune pédale ne reste enfoncée.
  useEffect(() => {
    window.addEventListener("blur", releaseAll);
    return () => window.removeEventListener("blur", releaseAll);
  }, [releaseAll]);

  // Présentation changée (plein écran, téléphone) : la scène se recadre, aucune pédale ne reste enfoncée.
  useEffect(() => {
    releaseAll();
    controllerRef.current?.refreshLayout();
  }, [fullscreen, cover, releaseAll]);

  // Appelé directement par le clic : c'est ce geste qui autorise le navigateur à jouer du son.
  const toggleSound = () => setSoundOn(controller?.setSound(!soundOn) ?? false);
  // Recommencer : nouvelle partie depuis le restaurant (la scène repart du départ, odomètre à zéro).
  const restart = () => {
    releaseAll();
    mission.replay();
    setPaused(false);
  };

  // Lecteur étroit (téléphone tenu droit, même quand la scène est en paysage) : le panneau prend la disposition portrait du
  // jeu (consigne au-dessus, direction et pédales dessous), sinon les boutons ne tiendraient pas sur une ligne.
  const narrow = stageSize.width < NARROW_STAGE_WIDTH;
  const layout = drivingLayout({
    width: stageSize.width,
    height: narrow ? Math.max(stageSize.height, stageSize.width + 1) : stageSize.height,
    coarsePointer: typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches,
  });
  const stageStyle = {
    "--control-size": `${layout.controlSize}px`,
    "--control-size-base": `${layout.controlSize}px`,
    // Portrait : hauteur utile du monde seulement (au-delà, la caméra ne montrerait que du vide). Mesurée sur la vraie
    // forme de la scène (et non sur celle, simulée, du panneau étroit).
    "--scene-max": stageSize.width < stageSize.height ? `${drivingLayout({ width: stageSize.width, height: stageSize.height, coarsePointer: false }).sceneMaxHeight ?? 0}px` : "none",
  } as CSSProperties;

  const canStart = mission.state.stage === "welcome" && snapshot.phase === "INTRO";
  const signal =
    snapshot.signalDistance !== null && snapshot.signalState ? (
      <span className={leoStyles.statSignal} data-state={snapshot.signalState} role="status" aria-live="polite">
        <span className={leoStyles.lamp} aria-hidden="true" />
        <strong>{snapshot.signalDistance} m</strong>
      </span>
    ) : null;

  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("leoDriving.player.label")}
      title={t("leoDriving.name")}
      titleIsHeading={pageHeading}
      headerCenter={signal}
      stats={[
        { label: t("leoDriving.player.pizzas"), value: dashboard.pizzas },
        { label: t("leoDriving.player.travelled"), value: dashboard.travelled },
        { label: t("leoDriving.player.remaining"), value: dashboard.remaining },
        { label: t("leoDriving.player.speed"), value: `${snapshot.speedKmh} km/h` },
      ]}
      paused={paused}
      onPlay={play}
      onPause={pause}
      onRestart={restart}
      restartLabel={t("leoDriving.player.restart")}
      extraControls={
        <button
          type="button"
          className={playerControlClass}
          aria-pressed={soundOn}
          aria-label={soundOn ? t("player.sound.on") : t("player.sound.off")}
          onClick={toggleSound}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
          </svg>
          <span>{soundOn ? t("player.sound.on") : t("player.sound.off")}</span>
        </button>
      }
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
    >
      <div ref={stageRef} className={styles.stage} style={stageStyle} data-format={layout.format}>
        <div ref={hostRef} className={styles.scene} data-zone="scene" />
        <LeoMissionOverlay
          mission={mission}
          snapshot={snapshot}
          keyboard={!suspended}
          className={sceneHeight < MIN_MISSION_SCENE_HEIGHT ? styles.missionOverStage : styles.missionInScene}
        />
        <section className={`${leoStyles.controlsPanel} ${styles.controls}`} aria-label={t("leoDriving.player.controls")}>
          <div className={`${leoStyles.panelLeft} ${styles.left}`} aria-label={t("leoDriving.player.steering")}>
            <HoldButton control="left" label="Gauche" icon="←" controller={controller} variant="touch" />
            <HoldButton control="right" label="Droite" icon="→" controller={controller} variant="touch" />
          </div>
          <div className={`${leoStyles.panelInfo} ${styles.info}`} role="status" data-assets={snapshot.assets}>
            <div className={leoStyles.panelText}>
              <strong>Livraison en cours : {dashboard.destination}</strong>
              <span>{instructionFor(snapshot, paused, missionInstruction(mission.state, snapshot))}</span>
            </div>
            <DeliverButton mission={mission} />
            {canStart && snapshot.assets === "ready" ? (
              <button type="button" className={leoStyles.panelAction} onClick={mission.start}>
                Commencer
              </button>
            ) : null}
            {snapshot.assets === "error" ? (
              <button type="button" className={leoStyles.panelAction} onClick={() => controller?.retryAssets()}>
                Réessayer
              </button>
            ) : null}
            <HornButton controller={controller} variant="touch" />
          </div>
          <div className={`${leoStyles.panelRight} ${styles.right}`} aria-label={t("leoDriving.player.pedals")}>
            <HoldButton control="forward" label="Avancer" icon="↑" controller={controller} variant="touch" />
            <HoldButton control="brake" label="Freiner" icon="■" controller={controller} variant="touch" />
            <HoldButton control="reverse" label="Reculer" icon="↓" controller={controller} variant="touch" />
          </div>
        </section>
      </div>
    </GamePlayer>
  );
}
