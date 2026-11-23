import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import type { LeoLivreurController, LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";
import { ALL_CONTROLS, HoldButton, HornButton, INITIAL_SNAPSHOT, instructionFor } from "../../prototypes/leo-livreur/LeoDrivingControls";
import leoStyles from "../../prototypes/leo-livreur/LeoLivreurPrototypePage.module.css";
import { drivingLayout, playerDrivingLayout } from "../../prototypes/leo-livreur/leoDrivingLayout";
import { DeliverButton, LeoMissionOverlay, missionDashboard, missionInstruction } from "../../prototypes/leo-livreur/LeoMissionLayer";
import { useLeoMission } from "../../prototypes/leo-livreur/useLeoMission";
import { STARTUP_TEXTURE_URLS } from "../../prototypes/leo-livreur/leoTextureUrls";
import { BUNDLE_BYTES } from "../../prototypes/leo-livreur/leoZoneAssets";
import { fetchAllWithProgress } from "../loading/fetchWithProgress";
import { GameLoadingScreen, LOADING_FADE_MS } from "../loading/GameLoadingScreen";
import { createLoadingProgress } from "../loading/loadingProgress";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { onViewportSettled } from "../viewport-events";
import { loadLeoEngine } from "./leoEngine";
import styles from "./LeoDrivingPlayer.module.css";

/**
 * Hauteur de scène sous laquelle une fenêtre de la mission ne tient plus (pavé tactile compris) : elle recouvre alors
 * aussi le panneau de conduite, inactif pendant la question. La barre du lecteur et le tableau de bord restent dégagés.
 */
const MIN_MISSION_SCENE_HEIGHT = 280;

/**
 * Poids estimés (octets) de ce qu'attend l'écran de chargement, remplacés par la taille réelle dès qu'elle est connue :
 * le moteur (Phaser et la scène, compressés) n'annonce pas sa progression ; les images du démarrage (lot commun), si.
 * Les deux sont téléchargés en même temps ; la scène relit ensuite les images dans le cache HTTP.
 */
/**
 * Parts de l'écran de chargement, en octets : le moteur, toutes les images du parcours (commun, pont, ville), puis leur
 * préparation par la scène (décodage, fondus du pont, vues de la berline, piétons). Cette dernière part n'est comptée
 * qu'une fois la scène prête : la barre n'atteint jamais 100 % avant que la partie puisse commencer.
 */
const LOADING_ESTIMATES = { engine: 350_000, images: BUNDLE_BYTES.common + BUNDLE_BYTES.bridge + BUNDLE_BYTES.city, scene: 150_000 };
/** Au-delà, l'écran explique que le chargement peut durer (connexion lente), sans rien interrompre. */
const SLOW_LOADING_MS = 20_000;
/**
 * Image du départ qui ne reçoit plus rien depuis ce délai (ni octet, ni erreur) : abandonnée, pour que la scène démarre
 * quand même et la redemande avec ses propres reprises (puis Réessayer). Inactivité et non durée totale : une connexion
 * lente mais vivante n'est jamais coupée ; la marge couvre aussi l'attente d'une connexion libre (6 par serveur en HTTP/1.1).
 */
const STALL_TIMEOUT_MS = 60_000;

/** Habillage de l'écran de chargement commun aux couleurs de Léo : nuit en ville, barre orange de la pizzeria. */
const LEO_LOADING_THEME = {
  "--loading-background": "radial-gradient(circle at 50% 40%, #1f5368 0%, #10303f 70%, #0a1f2b 100%)",
  "--loading-title": "#ffe7c2",
  "--loading-track-border": "rgb(255 190 120 / 45%)",
  "--loading-fill": "linear-gradient(90deg, #ef6a37, #ffb347 60%, #ffe0a3)",
  "--loading-glow": "rgb(255 160 80 / 60%)",
} as CSSProperties;

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
  // Écran de chargement : le moteur (import dynamique) et les images du démarrage arrivent en même temps. La partie n'est
  // jouable qu'une fois les deux prêts ; un échec propose Réessayer (nouvel import, ou reprise des images).
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [loadingGone, setLoadingGone] = useState(false);
  const [engineFailed, setEngineFailed] = useState(false);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  // Son activé par défaut. Le navigateur n'autorise le son qu'après un geste : il s'allume au premier toucher (ou à la
  // première touche) dans le lecteur ; le bouton Son le coupe ou le rallume à tout moment.
  const [soundOn, setSoundOn] = useState(true);
  const soundStarted = useRef(false);
  // Taille des boutons de conduite : d'après la place réelle du lecteur, pas celle de la fenêtre.
  const [stageSize, setStageSize] = useState({ width: 960, height: 540 });
  // Hauteur réelle de la scène : trop basse, les fenêtres de la mission recouvrent aussi le panneau de conduite (inactif).
  const [sceneHeight, setSceneHeight] = useState(540);
  // Mission : tournées, stock, questions et bilans (voir leoMission).
  const mission = useLeoMission(controller, snapshot);
  const dashboard = missionDashboard(mission.state, snapshot);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let teardown = () => {};
    const progress = createLoadingProgress(LOADING_ESTIMATES, setLoadingProgress, "engine");
    const onSnapshot = (next: LeoLivreurSnapshot) => {
      setSnapshot(next);
      // Tout le parcours est prêt : la partie devient jouable. Plus rien n'est téléchargé ensuite (une reprise après
      // échec, exceptionnelle, s'afficherait dans le panneau de conduite, sans écran de chargement).
      if (next.assets === "ready") {
        progress.complete("images");
        progress.complete("scene");
        setStarted(true);
      }
    };
    const engine = loadLeoEngine().then((module) => {
      progress.complete("engine");
      return module;
    });
    const images = fetchAllWithProgress(STARTUP_TEXTURE_URLS, (loaded, total) => progress.report("images", loaded, total), "high", STALL_TIMEOUT_MS);
    Promise.all([engine, images])
      .then(([{ mountLeoLivreurGame }]) => {
        if (cancelled) return;
        const mounted = mountLeoLivreurGame(host, onSnapshot);
        controllerRef.current = mounted;
        setController(mounted);
        teardown = () => {
          mounted.destroy();
          controllerRef.current = null;
          setController(null);
        };
      })
      .catch(() => {
        if (!cancelled) setEngineFailed(true);
      });
    return () => {
      cancelled = true;
      teardown();
    };
  }, [engineAttempt]);

  // Taille réelle de la scène, suivie dès l'ouverture (le panneau de conduite se dispose pendant le chargement) ; le
  // moteur, une fois arrivé, se recadre à chaque mesure.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
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
    };
  }, []);

  // Tout est prêt : l'écran de chargement s'efface en fondu, puis quitte la scène.
  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => setLoadingGone(true), LOADING_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [started]);

  const loadingFailed = !started && (engineFailed || snapshot.assets === "error");
  const retryLoading = () => {
    if (engineFailed) {
      setEngineFailed(false);
      setEngineAttempt((attempt) => attempt + 1);
    } else {
      controllerRef.current?.retryAssets();
    }
  };

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

  // Premier geste dans le lecteur : le son voulu par défaut est réellement allumé (navigateur sans son : bouton « coupé »).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !controller || !soundOn || soundStarted.current) return;
    const start = () => {
      if (soundStarted.current) return;
      soundStarted.current = true;
      if (!controller.setSound(true)) setSoundOn(false);
    };
    root.addEventListener("pointerdown", start, true);
    root.addEventListener("keydown", start, true);
    return () => {
      root.removeEventListener("pointerdown", start, true);
      root.removeEventListener("keydown", start, true);
    };
  }, [controller, soundOn]);

  // Appelé directement par le clic : c'est ce geste qui autorise le navigateur à jouer du son.
  const toggleSound = () => {
    soundStarted.current = true;
    setSoundOn(controller?.setSound(!soundOn) ?? false);
  };
  // Recommencer : nouvelle partie depuis le restaurant (la scène repart du départ, odomètre à zéro).
  const restart = () => {
    releaseAll();
    mission.replay();
    setPaused(false);
  };

  // Disposition du panneau d'après la place réelle de la scène (voir playerDrivingLayout) : sous la scène quand la rue
  // y tient encore, sinon en deux colonnes de part et d'autre de la scène.
  const layout = playerDrivingLayout({
    width: stageSize.width,
    height: stageSize.height,
    coarsePointer: typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches,
  });
  const rails = layout.format === "landscape-rails";
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
      // Téléphone tenu droit : la scène paysage, réduite à sa largeur, ne laisserait qu'une bande de route ; la scène
      // portrait montre toute la rue avec le panneau de conduite dessous. L'enfant garde le choix (bouton Paysage).
      initialOrientation="device"
    >
      <div ref={stageRef} className={styles.stage} style={stageStyle} data-format={layout.format}>
        <div ref={hostRef} className={styles.scene} data-zone="scene" />
        {loadingGone ? null : (
          <GameLoadingScreen
            progress={started ? 1 : loadingProgress}
            finished={started}
            failed={loadingFailed}
            onRetry={retryLoading}
            theme={LEO_LOADING_THEME}
            slowAfterMs={SLOW_LOADING_MS}
          />
        )}
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
            {/* Colonnes latérales : le klaxon rejoint la direction, la consigne garde une seule ligne sous la scène. */}
            {rails ? <HornButton controller={controller} variant="touch" /> : null}
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
            {rails ? null : <HornButton controller={controller} variant="touch" />}
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
