import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  mountTurboPulseGame,
  type TurboPulseController,
  type TurboPulseSnapshot,
} from "./TurboPulseGame";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS } from "./turbo-pulse-engine";
import styles from "./TurboPulsePage.module.css";

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
        <button type="button" className={styles.dangerAction} onClick={onRetry}>
          {exhausted
            ? t("turboPulse.game.actions.restartRun")
            : t("turboPulse.game.actions.retryLevel", { level: levelNumber })}
        </button>
      </section>
    </div>
  );
}

function SuccessPanel({ snapshot, onNext }: { snapshot: TurboPulseSnapshot; onNext: () => void }) {
  const { t } = useTranslation("games");
  const mastered = snapshot.status === "mastered";
  const nextLevel = TURBO_LEVELS[Math.min(snapshot.levelIndex + 1, TURBO_LEVELS.length - 1)];
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="turbo-success-title">
        <span className={styles.modalIcon} aria-hidden="true">{mastered ? "🏆" : "🎉"}</span>
        <p className={styles.modalEyebrow}>{t("turboPulse.game.success.eyebrow")}</p>
        <h2 id="turbo-success-title">
          {mastered
            ? t("turboPulse.game.success.masteredTitle")
            : t("turboPulse.game.success.title", { level: snapshot.levelIndex + 1 })}
        </h2>
        <button type="button" className={styles.primaryAction} onClick={onNext}>
          {mastered ? t("turboPulse.game.actions.playAgain") : t("turboPulse.game.actions.nextLevel", { level: snapshot.levelIndex + 2 })}
        </button>
        <p>
          {mastered
            ? t("turboPulse.game.success.masteredMessage", { count: snapshot.totalSolved })
            : t("turboPulse.game.success.message")}
        </p>
        {!mastered ? (
          <div className={styles.nextPreview}>
            <strong>{t("turboPulse.game.success.next", { level: snapshot.levelIndex + 2, name: nextLevel.name })}</strong>
            <span>{nextLevel.mathLabel}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function TurboPulsePage() {
  const { t } = useTranslation("games");
  const navigate = useNavigate();
  const pageRef = useRef<HTMLElement | null>(null);
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TurboPulseController | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Le passage plein écran ↔ normal ne recrée jamais Phaser : seul le
  // scale/viewport est réappliqué (refreshLayout) sur le moteur déjà monté.
  // La sortie peut venir de notre bouton, de la touche Échap ou du
  // navigateur : on se synchronise donc sur l'évènement natif plutôt que sur
  // notre seul état local. (Le ResizeObserver ci-dessus couvrirait aussi ce
  // changement de taille, mais avec un délai : cet appel immédiat garantit
  // un redessin dès la bascule, sans attendre le prochain tick d'observation.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
      controllerRef.current?.refreshLayout();
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const element = pageRef.current;
    if (!element) return;
    try {
      await element.requestFullscreen();
    } catch {
      return;
    }
    try {
      // Le verrouillage d'orientation n'est disponible que sur certaines
      // plateformes (souvent uniquement en plein écran) : un refus ou une
      // absence de support ne doit jamais casser le jeu, d'où le fallback
      // silencieux — l'affichage responsive CSS reste opérationnel sans lui.
      await screen.orientation?.lock?.("landscape");
    } catch {
      // Verrouillage refusé ou non supporté : on continue sans lui.
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Non supporté : rien à faire.
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Déjà sorti ou refusé par le navigateur : rien à faire.
      }
    }
  }, []);

  const toggleFullscreen = () => {
    if (isFullscreen) void exitFullscreen();
    else void enterFullscreen();
  };

  const handleExit = useCallback(async () => {
    await exitFullscreen();
    navigate("/jeux");
  }, [exitFullscreen, navigate]);

  const progress = Math.min(100, (snapshot.solved / CALCULATIONS_PER_LEVEL) * 100);
  const isSuccess = snapshot.status === "level-complete" || snapshot.status === "mastered";
  const canPause = snapshot.status === "playing" || snapshot.status === "clearing";
  const fullscreenSupported = typeof document !== "undefined" && document.fullscreenEnabled;

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

  const fullscreenButton = fullscreenSupported ? (
    <button type="button" className={styles.fullscreenButton} aria-pressed={isFullscreen} onClick={toggleFullscreen}>
      <span aria-hidden="true">⛶</span>
      <span>{isFullscreen ? t("turboPulse.game.actions.fullscreenOff") : t("turboPulse.game.actions.fullscreenOn")}</span>
    </button>
  ) : null;

  // En plein écran, le header, la barre d'informations, la mission et l'aide
  // tactile ne sont pas seulement masqués en CSS mais réellement absents du
  // DOM : rien ne doit rester interactif hors du jeu, et .playArea (donc le
  // hôte Phaser) n'est jamais concerné par cette bascule.
  return (
    <main
      ref={pageRef}
      className={isFullscreen ? `${styles.page} ${styles.fullscreen}` : styles.page}
      aria-labelledby="turbo-pulse-title"
    >
      <header className={styles.topbar}>
        <button type="button" className={styles.exitButton} onClick={handleExit}>
          <span aria-hidden="true">✕</span>
          <span>{t("turboPulse.game.actions.exit")}</span>
        </button>
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
          <div className={styles.background} aria-hidden="true" />
          <div ref={gameHostRef} className={styles.gameHost} role="img" aria-label={t("turboPulse.game.canvasLabel")} />
          <div className={styles.operation} aria-label={t("turboPulse.game.currentOperation", { operation: snapshot.operation })}>
            <span>{t("turboPulse.game.solve")}</span>
            <strong>{snapshot.operation}</strong>
          </div>
          {snapshot.paused ? <PausePanel onResume={() => controllerRef.current?.togglePause()} /> : null}
          {snapshot.status === "failed" ? <FailurePanel snapshot={snapshot} onRetry={() => controllerRef.current?.retryLevel()} /> : null}
          {isSuccess ? <SuccessPanel snapshot={snapshot} onNext={() => controllerRef.current?.nextLevel()} /> : null}
        </div>
        {!isFullscreen ? (
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
        ) : null}
      </section>

      {!isFullscreen ? (
        <footer className={styles.footerHint}>
          <span aria-hidden="true">☝️</span>
          <span>{t("turboPulse.game.touchHint")}</span>
        </footer>
      ) : null}
      <p className={styles.srOnly} aria-live="polite">{snapshot.feedback}</p>
    </main>
  );
}
