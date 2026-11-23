import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { mountLeoLivreurGame, type LeoLivreurController, type LeoLivreurSnapshot } from "./LeoLivreurGame";
import { ALL_CONTROLS, HoldButton, HornButton, INITIAL_SNAPSHOT, instructionFor } from "./LeoDrivingControls";
import { drivingLayout, type DrivingViewport } from "./leoDrivingLayout";
import type { MissionState } from "./leoMission";
import { DeliverButton, LeoMissionOverlay, missionDashboard, missionInstruction } from "./LeoMissionLayer";
import { useLeoMission } from "./useLeoMission";
import styles from "./LeoLivreurPrototypePage.module.css";

const PHASE_LABELS: Record<LeoLivreurSnapshot["phase"], string> = {
  INTRO: "Préparation de la mission",
  DRIVING: "Conduite en cours",
  ARRIVED: "Arrêt réussi devant la maison",
  TASK: "Livraison en cours",
};

/** Texte de l'indicateur d'approche : distance réelle en mètres. */
function signalChipText(state: NonNullable<LeoLivreurSnapshot["signalState"]>, distance: number, prepare: boolean) {
  if (state === "RED") return `Feu rouge — prépare-toi à freiner ! (${distance} m)`;
  if (state === "YELLOW") return prepare ? `Feu orange — prépare-toi à freiner ! (${distance} m)` : `Feu orange à ${distance} m`;
  return `Feu à ${distance} m`;
}

function readViewport(): DrivingViewport {
  const visual = window.visualViewport;
  return {
    width: Math.round(visual?.width ?? window.innerWidth),
    height: Math.round(visual?.height ?? window.innerHeight),
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  };
}

/** Taille de l'écran et type de pointeur, suivis en continu (rotation du téléphone, redimensionnement). */
function useViewport() {
  const [viewport, setViewport] = useState<DrivingViewport>(() => readViewport());
  useEffect(() => {
    const update = () => setViewport(readViewport());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return viewport;
}

function SignalChip({ snapshot }: { snapshot: LeoLivreurSnapshot }) {
  if (snapshot.signalDistance === null || !snapshot.signalState) return null;
  return (
    <div className={styles.signalChip} data-state={snapshot.signalState} role="status" aria-live="polite">
      <span className={styles.lamp} aria-hidden="true" />
      <span>{signalChipText(snapshot.signalState, snapshot.signalDistance, snapshot.signalPrepare)}</span>
    </div>
  );
}

/** Son du jeu : coupé au départ, activé par l'enfant (le choix n'est pas mémorisé, doctrine V1). */
function SoundButton({
  soundOn,
  onSound,
  className,
  compact = false,
}: {
  soundOn: boolean;
  onSound: () => void;
  className: string;
  /** Petit écran : « Son » seul, barré quand il est coupé, pour laisser la place à Pause et Quitter. */
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      data-sound={soundOn ? "on" : "off"}
      data-compact={compact ? "true" : "false"}
      onClick={onSound}
      aria-pressed={soundOn}
      aria-label="Son du jeu"
    >
      {compact ? "Son" : soundOn ? "Son : oui" : "Son : non"}
    </button>
  );
}

/** Zone A — tableau de bord compact : pizzas, vitesse, prochaine livraison, feu, Son, Pause, Quitter. */
function Dashboard({
  snapshot,
  paused,
  compact,
  soundOn,
  onSound,
  onPause,
  onQuit,
  mission,
}: {
  snapshot: LeoLivreurSnapshot;
  mission: MissionState;
  paused: boolean;
  compact: boolean;
  soundOn: boolean;
  onSound: () => void;
  onPause: () => void;
  onQuit: () => void;
}) {
  const dashboard = missionDashboard(mission, snapshot);
  return (
    <header className={styles.dashboard} aria-label="Tableau de bord">
      {compact ? null : <span className={styles.brand}>Léo le livreur</span>}
      <span className={styles.stat}><strong>{dashboard.pizzas}</strong> pizzas</span>
      <span className={styles.stat}><strong>{snapshot.speedKmh}</strong> km/h</span>
      <span className={styles.stat}>Parcouru : <strong>{dashboard.travelled}</strong></span>
      <span className={styles.stat}>Reste : <strong>{dashboard.remaining}</strong></span>
      {snapshot.signalDistance !== null && snapshot.signalState ? (
        <span className={styles.statSignal} data-state={snapshot.signalState} role="status" aria-live="polite">
          <span className={styles.lamp} aria-hidden="true" />
          <strong>{snapshot.signalDistance} m</strong>
        </span>
      ) : null}
      <span className={styles.dashboardActions}>
        <SoundButton soundOn={soundOn} onSound={onSound} className={styles.dashboardButton} compact={compact} />
        <button type="button" className={styles.dashboardButton} onClick={onPause} aria-pressed={paused}>
          {paused ? "Reprendre" : "Pause"}
        </button>
        <button type="button" className={`${styles.dashboardButton} ${styles.quitButton}`} onClick={onQuit} aria-label="Quitter le mode conduite">
          Quitter
        </button>
      </span>
    </header>
  );
}

/** Consigne courte du panneau (zone C, au centre). */
export interface LeoLivreurPageProps {
  /** Ouvre directement l'écran de conduite plein écran (entrée « Conduire avec Léo » des jeux). */
  startInDrivingMode?: boolean;
  /** Action de « Quitter » : par défaut, retour à la page du prototype ; dans les jeux, retour au catalogue. */
  onExit?: () => void;
}

export function LeoLivreurPrototypePage({ startInDrivingMode = false, onExit }: LeoLivreurPageProps = {}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LeoLivreurController | null>(null);
  const [controller, setController] = useState<LeoLivreurController | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [immersive, setImmersive] = useState(startInDrivingMode);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const viewport = useViewport();
  const layout = drivingLayout(viewport);
  const mission = useLeoMission(controller, snapshot);
  const dashboard = missionDashboard(mission.state, snapshot);

  useEffect(() => {
    if (!hostRef.current) return;
    const mountedController = mountLeoLivreurGame(hostRef.current, setSnapshot);
    controllerRef.current = mountedController;
    setController(mountedController);
    const observer = new ResizeObserver(() => controllerRef.current?.refreshLayout());
    observer.observe(hostRef.current);
    return () => {
      observer.disconnect();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setController(null);
    };
  }, []);

  const releaseAll = useCallback(() => {
    for (const control of ALL_CONTROLS) controllerRef.current?.setControl(control, false);
    controllerRef.current?.horn(false);
  }, []);

  /** Sortie de l’écran de conduite : le jeu reprend (jamais de pause cachée), les commandes sont relâchées. */
  const exitDriving = useCallback(() => {
    releaseAll();
    controllerRef.current?.setPaused(false);
    setPaused(false);
    if (onExit) onExit();
    else setImmersive(false);
  }, [releaseAll, onExit]);

  // Écran de conduite : la page ne défile plus, la scène se recadre, aucune pédale ne reste enfoncée.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    if (immersive) root.style.overflow = "hidden";
    controllerRef.current?.refreshLayout();
    releaseAll();
    return () => {
      root.style.overflow = previous;
    };
  }, [immersive, releaseAll]);

  // Perte de focus (autre onglet, autre application, alerte) : toutes les commandes sont relâchées.
  useEffect(() => {
    const onBlur = () => releaseAll();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") releaseAll();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [releaseAll]);

  useEffect(() => {
    if (!immersive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitDriving();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [immersive, exitDriving]);

  const canStart = mission.state.stage === "welcome" && snapshot.phase === "INTRO";
  const canDeliver = mission.canDeliver;
  const startMission = () => {
    mission.start();
    setImmersive(true);
  };
  // Appelé directement par le clic : c'est ce geste qui autorise le navigateur à jouer du son.
  const toggleSound = () => {
    setSoundOn(controller?.setSound(!soundOn) ?? false);
  };
  const togglePause = () => {
    const next = !paused;
    releaseAll();
    controller?.setPaused(next);
    setPaused(next);
  };

  // Hauteurs : la grille CSS (100dvh) réserve d’abord le tableau de bord et les commandes à leur taille réelle, puis
  // donne tout le reste à la scène. Seules la taille des boutons et, en portrait, la hauteur utile de la scène sont
  // fixées ici.
  const screenStyle = {
    "--control-size": `${layout.controlSize}px`,
    // Taille de référence pour le klaxon (80 % des pédales) : une variable ne peut pas se redéfinir à partir d'elle-même.
    "--control-size-base": `${layout.controlSize}px`,
    "--scene-max": layout.sceneMaxHeight === null ? "none" : `${layout.sceneMaxHeight}px`,
  } as CSSProperties;

  return (
    <main className={immersive ? `${styles.page} ${styles.pageImmersive}` : styles.page}>
      {immersive ? null : (
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Prototype LEO-DRIVE-01</p>
            <h1>Léo le livreur de pizzas</h1>
            <p className={styles.lead}>Charge les pizzas, conduis jusqu'à chaque adresse, arrête-toi devant la bonne maison et réponds aux questions de livraison.</p>
          </div>
          <div className={styles.missionCard}>
            <span>Mission du jour</span>
            <strong>2 tournées, 5 maisons, 7 questions</strong>
            <small>{PHASE_LABELS[snapshot.phase]}</small>
          </div>
        </header>
      )}

      {/*
        GameLayout. En conduite : grille à trois lignes (tableau de bord, scène, commandes) haute de 100dvh. Le cadre Phaser (même élément dans les deux modes, jamais remonté) reste seul dans la zone B.
      */}
      <section
        className={immersive ? styles.drivingScreen : styles.gameCard}
        data-immersive={immersive ? "true" : "false"}
        data-format={layout.format}
        style={immersive ? screenStyle : undefined}
        aria-label="Prototype de conduite de Léo"
      >
        {immersive ? (
          <Dashboard
            key="dashboard"
            snapshot={snapshot}
            paused={paused}
            compact={layout.format !== "desktop"}
            soundOn={soundOn}
            onSound={toggleSound}
            onPause={togglePause}
            onQuit={exitDriving}
            mission={mission.state}
          />
        ) : null}
        <div key="viewport" ref={hostRef} className={immersive ? styles.gameViewport : styles.gameHost} data-zone="scene" />
        {immersive ? (
          <section key="controls" className={styles.controlsPanel} aria-label="Commandes de conduite">
            <div className={styles.panelLeft} aria-label="Direction">
              <HoldButton control="left" label="Gauche" icon="←" controller={controller} variant="touch" />
              <HoldButton control="right" label="Droite" icon="→" controller={controller} variant="touch" />
            </div>
            <div className={styles.panelInfo} role="status" data-assets={snapshot.assets}>
              <div className={styles.panelText}>
                <strong>Livraison en cours : {dashboard.destination}</strong>
                <span>{instructionFor(snapshot, paused, missionInstruction(mission.state, snapshot))}</span>
                {layout.touchControls || layout.format !== "desktop" || canStart || canDeliver ? null : (
                  <small className={styles.keyboardHint}>Clavier : flèches ou W A S D · Espace : freiner · R : reculer · H : klaxon · Échap : quitter</small>
                )}
              </div>
              <DeliverButton mission={mission} />
              {canStart && snapshot.assets === "ready" ? <button type="button" className={styles.panelAction} onClick={startMission}>Commencer</button> : null}
              {snapshot.assets === "error" ? <button type="button" className={styles.panelAction} onClick={() => controller?.retryAssets()}>Réessayer</button> : null}
              <HornButton controller={controller} variant="touch" />
            </div>
            <div className={styles.panelRight} aria-label="Pédales">
              <HoldButton control="forward" label="Avancer" icon="↑" controller={controller} variant="touch" />
              <HoldButton control="brake" label="Freiner" icon="■" controller={controller} variant="touch" />
              <HoldButton control="reverse" label="Reculer" icon="↓" controller={controller} variant="touch" />
            </div>
          </section>
        ) : (
          <div key="classic" className={styles.classicOverlay}>
            <SignalChip snapshot={snapshot} />
            <div className={styles.hud}>
              <span>Dans la voiture : <strong>{dashboard.pizzas} pizzas</strong></span>
              <span>Vitesse : <strong>{snapshot.speedKmh} km/h</strong></span>
              <span>Destination : <strong>{dashboard.destination}</strong></span>
              <span>Distance parcourue : <strong>{dashboard.travelled}</strong></span>
              <span>Distance restante : <strong>{dashboard.remaining}</strong></span>
            </div>
          </div>
        )}
        <LeoMissionOverlay mission={mission} snapshot={snapshot} keyboard={!paused} className={immersive ? styles.missionInScene : undefined} />
      </section>

      {immersive ? null : (
        <>
          <section className={styles.panel}>
            {canStart ? <p>Léo ouvre la pizzeria : charge les commandes, puis conduis jusqu’à chaque adresse.</p> : null}
            {mission.state.stage === "driving" && !canDeliver ? <p>Livraison en cours : {dashboard.destination}. Suis la chaussée principale et arrête-toi dans la zone verte. Besoin de reculer ? Arrête-toi avec Freiner, puis maintiens Reculer.</p> : null}
            {snapshot.signalMessage ? <p className={styles.signal} role="status">{snapshot.signalMessage}</p> : null}
            {canDeliver ? <p>Tu es arrêté devant le {dashboard.destination}. Appuie sur LIVRER.</p> : null}
            <div className={styles.actions}>
              {canStart ? <button type="button" className={styles.primaryAction} onClick={startMission}>Commencer la mission</button> : null}
              <DeliverButton mission={mission} />
              <button type="button" className={styles.secondaryAction} onClick={() => setImmersive(true)}>Mode conduite plein écran</button>
              <SoundButton soundOn={soundOn} onSound={toggleSound} className={styles.secondaryAction} />
            </div>
          </section>

          <section className={styles.controls} aria-label="Commandes de conduite">
            <HoldButton control="left" label="Gauche" icon="←" controller={controller} />
            <HoldButton control="forward" label="Avancer" icon="↑" controller={controller} />
            <HoldButton control="brake" label="Freiner" icon="■" controller={controller} />
            <HoldButton control="reverse" label="Reculer" icon="↓" controller={controller} />
            <HoldButton control="right" label="Droite" icon="→" controller={controller} />
            <HornButton controller={controller} variant="panel" />
          </section>
        </>
      )}
    </main>
  );
}
