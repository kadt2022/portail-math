import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  mountTurboPulseGame,
  type TurboPulseController,
  type TurboPulseSnapshot,
} from "./TurboPulseGame";
import { enterNativeFullscreen, exitNativeFullscreen, fullscreenElement } from "../fullscreen";
import { useInertOutside } from "../useInertOutside";
import { rankForLevel, type TurboPulseRank } from "./turbo-pulse-ranks";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS } from "./turbo-pulse-engine";
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

// Emblème du rang : un écu à facettes aux couleurs du rang ; l'Or royal reçoit en plus une couronne.
function RankEmblem({ rank, size }: { rank: TurboPulseRank; size: number }) {
  const gradient = useId();
  const crowned = rank.id === "gold";
  return (
    <svg className={styles.emblem} viewBox={crowned ? "0 -16 64 88" : "0 0 64 72"} width={size} height={(size * (crowned ? 88 : 72)) / 64} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={rank.lightCss} />
          <stop offset="0.5" stopColor={rank.accentCss} />
          <stop offset="1" stopColor={rank.darkCss} />
        </linearGradient>
      </defs>
      {crowned ? <path d="M16 -2 20 -14 28 -6 32 -16 36 -6 44 -14 48 -2Z" fill={`url(#${gradient})`} stroke={rank.lightCss} strokeWidth="1.5" strokeLinejoin="round" /> : null}
      <path d="M32 4 58 14v22c0 16-11 27-26 32C17 63 6 52 6 36V14Z" fill={`url(#${gradient})`} stroke={rank.lightCss} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M32 16 48 36 32 58 16 36Z" fill={rank.darkCss} fillOpacity="0.5" stroke={rank.lightCss} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 16 48 36H16Z" fill="#fff" fillOpacity="0.28" />
      <path d="M32 16 32 58M16 36H48" stroke={rank.lightCss} strokeOpacity="0.6" strokeWidth="1" />
    </svg>
  );
}

// Passage de niveau : l'emblème du rang atteint, un titre court et un seul bouton.
// Au niveau 7, le titre « Chevalier d'Or » couronne le parcours.
function SuccessPanel({ snapshot, onNext }: { snapshot: TurboPulseSnapshot; onNext: () => void }) {
  const { t } = useTranslation("games");
  const mastered = snapshot.status === "mastered";
  const rank = rankForLevel(snapshot.levelIndex);
  return (
    <div className={styles.goldBackdrop} role="presentation">
      <section className={styles.goldCard} role="dialog" aria-modal="true" aria-labelledby="turbo-success-title">
        <RankEmblem rank={rank} size={mastered ? 96 : 78} />
        <div className={styles.goldStars} aria-hidden="true">
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
        <h2 id="turbo-success-title">
          {mastered
            ? t("turboPulse.game.success.masteredTitle")
            : t("turboPulse.game.success.title", { level: snapshot.levelIndex + 1 })}
        </h2>
        <p className={styles.goldRank}>{mastered ? t("turboPulse.game.success.knightRank") : t("turboPulse.game.rankLabel", { rank: t(`turboPulse.game.ranks.${rank.id}`) })}</p>
        <button type="button" className={styles.goldAction} onClick={onNext}>
          {mastered ? t("turboPulse.game.actions.playAgain") : t("turboPulse.game.actions.nextLevel", { level: snapshot.levelIndex + 2 })}
        </button>
      </section>
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 8 4.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5" y="4" width="5" height="16" rx="1.6" />
      <rect x="14" y="4" width="5" height="16" rx="1.6" />
    </svg>
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

  const rank = rankForLevel(snapshot.levelIndex);
  const progress = Math.min(100, (snapshot.solved / CALCULATIONS_PER_LEVEL) * 100);
  const isSuccess = snapshot.status === "level-complete" || snapshot.status === "mastered";
  const canPause = snapshot.status === "playing" || snapshot.status === "clearing";

  // En plein écran, le header, la barre d'informations, la mission et l'aide
  // tactile ne sont pas seulement masqués en CSS mais réellement absents du
  // DOM : rien ne doit rester interactif hors du jeu, et .playArea (donc le
  // hôte Phaser) n'est jamais concerné par cette bascule.
  return (
    <main
      ref={pageRef}
      className={fullscreen ? `${styles.page} ${styles.fullscreen}` : styles.page}
      style={{ "--rank": rank.accentCss, "--rank-light": rank.lightCss, "--rank-dark": rank.darkCss } as CSSProperties}
      aria-labelledby="turbo-pulse-title"
    >
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">⚡</span>
          <div>
            <h1 id="turbo-pulse-title">{t("turboPulse.game.title")}</h1>
            <p>{t("turboPulse.game.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className={styles.statusBar} aria-label={t("turboPulse.game.statusLabel")}>
        <div className={styles.rankBadge}>
          <RankEmblem rank={rank} size={30} />
          <strong>{t(`turboPulse.game.ranks.${rank.id}`)}</strong>
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
      </section>

      <div className={styles.controls} role="toolbar" aria-label={t("turboPulse.game.controlsLabel")}>
        <button type="button" className={styles.ctl} aria-pressed={canPause && !snapshot.paused} disabled={!canPause} onClick={() => snapshot.paused && controllerRef.current?.togglePause()}>
          <PlayIcon />
          <span>{t("turboPulse.game.actions.play")}</span>
        </button>
        <button type="button" className={styles.ctl} aria-pressed={canPause && snapshot.paused} disabled={!canPause} onClick={() => !snapshot.paused && controllerRef.current?.togglePause()}>
          <PauseIcon />
          <span>{t("turboPulse.game.actions.pause")}</span>
        </button>
        <button type="button" className={styles.ctl} aria-label={t("turboPulse.game.actions.restartAria")} onClick={() => controllerRef.current?.restartRun()}>
          <Icon>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </Icon>
          <span>{t("turboPulse.game.actions.restart")}</span>
        </button>
        <span className={styles.ctlSeparator} aria-hidden="true" />
        <button type="button" className={styles.ctl} aria-pressed={!snapshot.muted} aria-label={snapshot.muted ? t("turboPulse.game.actions.soundOff") : t("turboPulse.game.actions.soundOn")} onClick={() => controllerRef.current?.toggleMuted()}>
          <Icon>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {snapshot.muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </Icon>
          <span>{snapshot.muted ? t("turboPulse.game.actions.soundOff") : t("turboPulse.game.actions.soundOn")}</span>
        </button>
        {onFullscreenChange && !mobileImmersive ? (
          <button type="button" className={styles.ctl} aria-label={fullscreen ? t("turboPulse.game.actions.fullscreenOff") : t("turboPulse.game.actions.fullscreenOn")} onClick={() => onFullscreenChange(!fullscreen)}>
            <Icon>
              {fullscreen ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </Icon>
            <span>{fullscreen ? t("turboPulse.game.actions.fullscreenOff") : t("turboPulse.game.actions.fullscreenOn")}</span>
          </button>
        ) : null}
        {onClose ? (
          <button type="button" className={`${styles.ctl} ${styles.ctlExit}`} aria-label={t("turboPulse.game.actions.exit")} onClick={onClose}>
            <Icon>
              <path d="M6 6l12 12M18 6 6 18" />
            </Icon>
            <span className={styles.ctlKeep}>{t("turboPulse.game.actions.exit")}</span>
          </button>
        ) : null}
      </div>
      <p className={styles.srOnly} aria-live="polite">{snapshot.feedback}</p>
    </main>
  );
}
