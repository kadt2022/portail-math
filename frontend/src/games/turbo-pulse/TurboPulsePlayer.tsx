import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  mountTurboPulseGame,
  type TurboPulseController,
  type TurboPulseSnapshot,
} from "./TurboPulseGame";
import { enterNativeFullscreen, exitNativeFullscreen, fullscreenElement } from "../fullscreen";
import { useInertOutside } from "../useInertOutside";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS } from "./turbo-pulse-engine";
import { worldForLevel } from "./turbo-pulse-worlds";
import styles from "./TurboPulsePlayer.module.css";

// import() dynamique (pas un import statique) : Vite ne télécharge le décor
// d'un niveau que lorsqu'il est effectivement atteint, au lieu de charger les
// 7 fonds dès l'arrivée sur le jeu. Un monde par niveau, dans la galaxie
// Kimbo : Zion, Verdalia, Aqualis, Solara, Glacia, Pyra puis Ultima.
const LEVEL_BACKGROUND_MODULES = [
  () => import("../../assets/turbo-pulse/niv001.webp"),
  () => import("../../assets/turbo-pulse/niv002.webp"),
  () => import("../../assets/turbo-pulse/niv003.webp"),
  () => import("../../assets/turbo-pulse/niv004.webp"),
  () => import("../../assets/turbo-pulse/niv005.webp"),
  () => import("../../assets/turbo-pulse/niv006.webp"),
  () => import("../../assets/turbo-pulse/niv007.webp"),
] as const;

const INITIAL_SNAPSHOT: TurboPulseSnapshot = {
  levelIndex: 0,
  levelName: TURBO_LEVELS[0].name,
  solved: 0,
  score: 0,
  streak: 0,
  intrusions: 0,
  intrusionLimit: 5,
  operation: "2 + 3 = ?",
  status: "playing",
  feedback: "",
  totalSolved: 0,
  remainingFruits: 3,
  failureAction: "retry",
  expertAttemptUsed: null,
  muted: false,
  paused: false,
};

function PausePanel({ onResume }: { onResume: () => void }) {
  const { t } = useTranslation("games");
  return (
    <div className={styles.pauseBackdrop} role="presentation">
      <section className={styles.pauseCard} role="dialog" aria-modal="true" aria-labelledby="turbo-pause-title">
        <h2 id="turbo-pause-title">{t("turboPulse.game.paused.title")}</h2>
        <p>{t("turboPulse.game.paused.hint")}</p>
        <button type="button" className={styles.primaryAction} onClick={onResume}>
          <span aria-hidden="true">▶</span> {t("turboPulse.game.actions.resume")}
        </button>
      </section>
    </div>
  );
}

function FailurePanel({ snapshot, onRetry }: { snapshot: TurboPulseSnapshot; onRetry: () => void }) {
  const { t } = useTranslation("games");
  const levelNumber = snapshot.levelIndex + 1;
  const expert = snapshot.levelIndex >= 5;
  const exhausted = snapshot.failureAction === "restart-run";
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modal} ${styles.failureModal}`} role="dialog" aria-modal="true" aria-labelledby="turbo-failure-title">
        <span className={styles.modalIcon} aria-hidden="true">💥</span>
        <p className={styles.modalEyebrow}>{t("turboPulse.game.failure.eyebrow")}</p>
        <h2 id="turbo-failure-title">
          {t("turboPulse.game.failure.title", { level: levelNumber, name: snapshot.levelName })}
        </h2>
        <button type="button" className={styles.dangerAction} onClick={onRetry}>
          {exhausted
            ? t("turboPulse.game.actions.restartRun")
            : t("turboPulse.game.actions.retryLevel", { level: levelNumber })}
        </button>
        <p>
          {snapshot.intrusions === 1
            ? t("turboPulse.game.failure.oneIntrusion")
            : t("turboPulse.game.failure.manyIntrusions", { count: snapshot.intrusions })}
        </p>
        <p className={styles.modalDetail}>
          {snapshot.levelIndex === 6
            ? t("turboPulse.game.failure.ultraLimit")
            : t("turboPulse.game.failure.limit", { limit: snapshot.intrusionLimit })}
        </p>
        {expert && snapshot.expertAttemptUsed ? (
          <p className={styles.attemptNote}>
            {exhausted
              ? t("turboPulse.game.failure.exhausted")
              : t("turboPulse.game.failure.attempt", { used: snapshot.expertAttemptUsed, next: snapshot.expertAttemptUsed + 1 })}
          </p>
        ) : null}
      </section>
    </div>
  );
}

// Passage de niveau : tout en or, presque sans texte. Les étoiles (ou le trophée
// à la fin du parcours), un titre court, le monde qui suit et un seul bouton.
function SuccessPanel({ snapshot, onNext }: { snapshot: TurboPulseSnapshot; onNext: () => void }) {
  const { t } = useTranslation("games");
  const mastered = snapshot.status === "mastered";
  const nextWorld = worldForLevel(Math.min(snapshot.levelIndex + 1, TURBO_LEVELS.length - 1));
  return (
    <div className={styles.goldBackdrop} role="presentation">
      <section className={styles.goldCard} role="dialog" aria-modal="true" aria-labelledby="turbo-success-title">
        {mastered ? (
          <span className={styles.goldTrophy} aria-hidden="true">🏆</span>
        ) : (
          <div className={styles.goldStars} aria-hidden="true">
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
        )}
        <h2 id="turbo-success-title">
          {mastered
            ? t("turboPulse.game.success.masteredTitle")
            : t("turboPulse.game.success.title", { level: snapshot.levelIndex + 1 })}
        </h2>
        {!mastered ? <p className={styles.goldWorld}>{t(`turboPulse.game.worlds.${nextWorld.id}`)}</p> : null}
        <button type="button" className={styles.goldAction} onClick={onNext}>
          {mastered ? t("turboPulse.game.actions.playAgain") : t("turboPulse.game.actions.nextLevel", { level: snapshot.levelIndex + 2 })}
        </button>
      </section>
    </div>
  );
}

export interface TurboPulsePlayerProps {
  /** Présentation immersive : le jeu occupe toute la fenêtre (plein écran natif quand le navigateur le permet). */
  fullscreen?: boolean;
  /** Demande de passage en plein écran ou de retour à l'affichage normal (ordinateur). Absent : pas de bouton. */
  onFullscreenChange?: (next: boolean) => void;
  /** Ferme le jeu (retour à la page des jeux). Absent : pas de bouton. */
  onClose?: () => void;
  /** Téléphone : le plein écran est la seule présentation, le bouton principal quitte le jeu et l'orientation paysage est demandée. */
  mobileImmersive?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
}

// Lecteur de Turbo Pulse, utilisé dans la page « Jeux » (comme les Tuiles magiques) et sur sa page autonome.
// L'état de la partie vit ici : passer du mode normal au plein écran ne recrée jamais Phaser.
export function TurboPulsePlayer({
  fullscreen = false,
  onFullscreenChange,
  onClose,
  mobileImmersive = false,
  active = true,
}: TurboPulsePlayerProps) {
  const { t } = useTranslation("games");
  const pageRef = useRef<HTMLElement | null>(null);
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TurboPulseController | null>(null);
  const nativeFullscreen = useRef(false);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  // Plein écran (natif ou repli CSS) : le reste de l'application est inerte, le focus reste dans le jeu.
  useInertOutside(pageRef, fullscreen);

  // Décor chargé par niveau (voir LEVEL_BACKGROUND_MODULES) : re-déclenché
  // uniquement quand levelIndex change réellement, jamais à chaque
  // instantané de partie (score/série/etc.), pour ne jamais re-télécharger
  // le même décor. `cancelled` évite d'appliquer un import résolu en retard
  // après un changement de niveau plus récent (ex. Recommencer pendant que
  // l'import du niveau précédent était encore en vol).
  useEffect(() => {
    let cancelled = false;
    const index = Math.min(snapshot.levelIndex, LEVEL_BACKGROUND_MODULES.length - 1);
    LEVEL_BACKGROUND_MODULES[index]().then((module) => {
      if (!cancelled) setBackgroundUrl(module.default);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot.levelIndex]);

  useEffect(() => {
    if (!gameHostRef.current) return;
    controllerRef.current = mountTurboPulseGame(gameHostRef.current, setSnapshot);
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Phaser ne surveille nativement que le redimensionnement de la fenêtre,
  // jamais celui d'un conteneur CSS : sans cet observateur, un changement de
  // largeur/hauteur du canvasFrame (mise en page responsive, ouverture du
  // panneau latéral, simple redimensionnement de la fenêtre) laisserait le
  // monde de jeu figé à sa dernière taille connue au lieu de suivre la
  // surface réellement disponible. refreshLayout() remesure et redessine
  // sans jamais recréer la scène ni perdre la partie en cours.
  useEffect(() => {
    if (!gameHostRef.current) return;
    const observer = new ResizeObserver(() => controllerRef.current?.refreshLayout());
    observer.observe(gameHostRef.current);
    return () => observer.disconnect();
  }, []);

  // Plein écran natif quand il est disponible ; sinon la présentation immersive CSS (classe « fullscreen ») suffit.
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    if (fullscreen) {
      void enterNativeFullscreen(root, mobileImmersive).then((entered) => {
        nativeFullscreen.current = entered;
      });
    } else if (nativeFullscreen.current) {
      nativeFullscreen.current = false;
      void exitNativeFullscreen();
    }
    controllerRef.current?.refreshLayout();
  }, [fullscreen, mobileImmersive]);

  // Sortie par le système (geste retour, touche Échap) : le jeu suit, au lieu de rester dans un état incohérent.
  useEffect(() => {
    function onChange() {
      if (nativeFullscreen.current && !fullscreenElement()) {
        nativeFullscreen.current = false;
        if (mobileImmersive) onClose?.();
        else onFullscreenChange?.(false);
      }
      controllerRef.current?.refreshLayout();
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [mobileImmersive, onClose, onFullscreenChange]);

  useEffect(
    () => () => {
      if (nativeFullscreen.current) {
        nativeFullscreen.current = false;
        void exitNativeFullscreen();
      }
    },
    [],
  );

  // Jeu masqué (fermé, onglet changé) : la partie se met en pause, sans rien perdre.
  useEffect(() => {
    const running = snapshot.status === "playing" || snapshot.status === "clearing";
    if (!active && running && !snapshot.paused) controllerRef.current?.togglePause();
  }, [active, snapshot.status, snapshot.paused]);

  const world = worldForLevel(snapshot.levelIndex);
  const progress = Math.min(100, (snapshot.solved / CALCULATIONS_PER_LEVEL) * 100);
  const isSuccess = snapshot.status === "level-complete" || snapshot.status === "mastered";
  const canPause = snapshot.status === "playing" || snapshot.status === "clearing";

  const pauseButton = canPause ? (
    <button
      type="button"
      className={styles.pauseButton}
      aria-pressed={snapshot.paused}
      onClick={() => controllerRef.current?.togglePause()}
    >
      <span aria-hidden="true">{snapshot.paused ? "▶" : "⏸"}</span>
      <span>{snapshot.paused ? t("turboPulse.game.actions.resume") : t("turboPulse.game.actions.pause")}</span>
    </button>
  ) : null;

  const fullscreenButton = onFullscreenChange && !mobileImmersive ? (
    <button type="button" className={styles.fullscreenButton} aria-pressed={fullscreen} onClick={() => onFullscreenChange(!fullscreen)}>
      <span aria-hidden="true">⛶</span>
      <span>{fullscreen ? t("turboPulse.game.actions.fullscreenOff") : t("turboPulse.game.actions.fullscreenOn")}</span>
    </button>
  ) : null;

  // En plein écran, le header, la barre d'informations, la mission et l'aide
  // tactile ne sont pas seulement masqués en CSS mais réellement absents du
  // DOM : rien ne doit rester interactif hors du jeu, et .playArea (donc le
  // hôte Phaser) n'est jamais concerné par cette bascule.
  return (
    <main
      ref={pageRef}
      className={fullscreen ? `${styles.page} ${styles.fullscreen}` : styles.page}
      style={{ "--turbo-world": world.accentCss } as CSSProperties}
      aria-labelledby="turbo-pulse-title"
    >
      <header className={styles.topbar}>
        {onClose ? (
          <button type="button" className={styles.exitButton} onClick={onClose}>
            <span aria-hidden="true">✕</span>
            <span>{t("turboPulse.game.actions.exit")}</span>
          </button>
        ) : <span />}
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">⚡</span>
          <div>
            <h1 id="turbo-pulse-title">{t("turboPulse.game.title")}</h1>
            <p>{t("turboPulse.game.subtitle")}</p>
          </div>
        </div>
        <div className={styles.topbarActions}>
          {pauseButton}
          {fullscreenButton}
          <button type="button" className={styles.soundButton} aria-pressed={!snapshot.muted} onClick={() => controllerRef.current?.toggleMuted()}>
            <span aria-hidden="true">{snapshot.muted ? "🔇" : "🔊"}</span>
            <span>{snapshot.muted ? t("turboPulse.game.actions.soundOff") : t("turboPulse.game.actions.soundOn")}</span>
          </button>
        </div>
      </header>

      <section className={styles.statusBar} aria-label={t("turboPulse.game.statusLabel")}>
        <div className={styles.worldHeader}>
          <span className={styles.planet} aria-hidden="true" />
          <div>
            <strong>{t(`turboPulse.game.worlds.${world.id}`)}</strong>
            <span>{t("turboPulse.game.galaxy")}</span>
          </div>
        </div>
        <div className={styles.levelBlock}>
          <span>{t("turboPulse.game.level", { level: snapshot.levelIndex + 1 })}</span>
          <strong>{snapshot.levelName}</strong>
        </div>
        <div className={styles.progressBlock}>
          <div className={styles.progressLabels}>
            <span>{t("turboPulse.game.progress")}</span>
            <strong>{snapshot.solved} / {CALCULATIONS_PER_LEVEL}</strong>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={CALCULATIONS_PER_LEVEL} aria-valuenow={snapshot.solved}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <dl className={styles.stats}>
          <div><dt>{t("turboPulse.game.score")}</dt><dd>🏆 {snapshot.score}</dd></div>
          <div><dt>{t("turboPulse.game.streak")}</dt><dd>🔥 {snapshot.streak}</dd></div>
          <div><dt>{t("turboPulse.game.defense")}</dt><dd>🛡️ {snapshot.intrusions} / {snapshot.intrusionLimit}</dd></div>
        </dl>
      </section>

      <section className={styles.playArea}>
        <div className={styles.canvasFrame}>
          {/* Décor illustré : calque CSS/DOM séparé, derrière le canvas
              Phaser (transparent). Le flou "façon cinéma" est composé une
              fois par le navigateur, jamais recalculé par frame comme le
              serait un shader WebGL sur cette grande image statique. */}
          <div
            className={styles.background}
            aria-hidden="true"
            style={backgroundUrl ? ({ "--level-background": `url("${backgroundUrl}")` } as CSSProperties) : undefined}
          />
          <div ref={gameHostRef} className={styles.gameHost} role="img" aria-label={t("turboPulse.game.canvasLabel")} />
          <div className={styles.operation} aria-label={t("turboPulse.game.currentOperation", { operation: snapshot.operation })}>
            <span>{t("turboPulse.game.solve")}</span>
            <strong>{snapshot.operation}</strong>
          </div>
          {snapshot.paused ? <PausePanel onResume={() => controllerRef.current?.togglePause()} /> : null}
          {snapshot.status === "failed" ? <FailurePanel snapshot={snapshot} onRetry={() => controllerRef.current?.retryLevel()} /> : null}
          {isSuccess ? <SuccessPanel snapshot={snapshot} onNext={() => controllerRef.current?.nextLevel()} /> : null}
        </div>
        <aside className={styles.mission} aria-label={t("turboPulse.game.missionTitle")}>
          <span className={styles.missionIcon} aria-hidden="true">🎯</span>
          <div>
            <strong>{t("turboPulse.game.missionTitle")}</strong>
            <p>{t("turboPulse.game.instructions")}</p>
          </div>
          <button type="button" className={styles.restartButton} onClick={() => controllerRef.current?.restartRun()}>
            <span aria-hidden="true">↻</span>
            {t("turboPulse.game.actions.restart")}
          </button>
        </aside>
      </section>

      {!fullscreen ? (
        <footer className={styles.footerHint}>
          <span aria-hidden="true">☝️</span>
          <span>{t("turboPulse.game.touchHint")}</span>
        </footer>
      ) : null}
      <p className={styles.srOnly} aria-live="polite">{snapshot.feedback}</p>
    </main>
  );
}
