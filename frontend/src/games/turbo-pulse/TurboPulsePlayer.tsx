import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// Types seulement : le moteur Phaser (et ses 313 Ko) est chargé à la demande, voir l'effet de montage.
import type { TurboPulseController, TurboPulseSnapshot } from "./TurboPulseGame";
import { MIN_WORLD_HEIGHT, MIN_WORLD_WIDTH } from "./turbo-pulse-world";
import { GameAudio } from "../audio/GameAudio";
import { GAMES_SOUND_STORAGE_KEY, usePageVisible } from "../audio/useGameAudio";
import { onViewportSettled } from "../viewport-events";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { rankForLevel, type TurboPulseRank } from "./turbo-pulse-ranks";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS } from "./turbo-pulse-engine";
import { backgroundFor, loadImage, nextBackgroundFor } from "./turbo-pulse-backgrounds";
import themeUrl from "../../assets/turbo-pulse/turbo-pulse-theme.mp3";
import styles from "./TurboPulsePlayer.module.css";

/**
 * Attente maximale (ms) du moteur avant de demander le premier décor : sur un réseau qui ne répond plus, le décor est
 * tout de même demandé.
 */
const ENGINE_WAIT_TIMEOUT_MS = 15_000;

/** Promesse résolue de l'extérieur (une seule fois). */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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

// Fenêtre de fin de niveau : petite, centrée sur le jeu, trois informations au plus (résultat, score, action). Le décor reste
// visible derrière un léger voile. Les mécanismes de victoire, d'échec et de progression restent ceux du moteur.
function EndPanel({ snapshot, onAction }: { snapshot: TurboPulseSnapshot; onAction: () => void }) {
  const { t } = useTranslation("games");
  const failed = snapshot.status === "failed";
  const mastered = snapshot.status === "mastered";
  const title = failed ? t("turboPulse.game.end.failTitle") : mastered ? t("turboPulse.game.success.masteredTitle") : t("turboPulse.game.end.winTitle");
  const attemptsNote =
    snapshot.failureAction === "restart-run"
      ? t("turboPulse.game.end.noAttemptLeft")
      : snapshot.expertAttemptUsed
        ? t("turboPulse.game.end.attemptsLeft", { count: Math.max(0, 3 - snapshot.expertAttemptUsed) })
        : "";
  // Échec : on réessaie le niveau ; après la dernière tentative experte, le parcours reprend au niveau 1 (le bouton le dit).
  const action = failed
    ? snapshot.failureAction === "restart-run"
      ? t("turboPulse.game.actions.restartRun")
      : t("turboPulse.game.end.retry")
    : mastered
      ? t("turboPulse.game.actions.playAgain")
      : t("turboPulse.game.end.next");
  return (
    <div className={styles.endBackdrop} role="presentation">
      <section className={`${styles.endCard} ${failed ? styles.endFailed : styles.endWon}`} role="dialog" aria-modal="true" aria-labelledby="turbo-end-title">
        <span className={styles.endIcon} aria-hidden="true">
          {failed ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9.5h.01M15 9.5h.01M8.5 16c2-1.6 5-1.6 7 0" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" focusable="false">
              <path d="M7 3h10v2h3a1 1 0 0 1 1 1c0 3.2-1.9 5.4-4.6 5.9A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 7.6 11.9C4.9 11.4 3 9.2 3 6a1 1 0 0 1 1-1h3V3Zm-1.9 4c.2 1.6 1 2.6 2.2 3A9 9 0 0 1 7 7H5.1Zm13.8 0H17a9 9 0 0 1-.3 3c1.2-.4 2-1.4 2.2-3ZM8 21h8v1H8v-1Z" />
            </svg>
          )}
        </span>
        <h2 id="turbo-end-title" className={styles.endTitle}>{title}</h2>
        {failed ? (
          // Niveaux experts : les tentatives restantes, seulement quand elles comptent.
          attemptsNote ? <p className={styles.endNote}>{attemptsNote}</p> : null
        ) : (
          <p className={styles.endScore}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2-4.6-4.4 6.3-.9L12 2.8Z" />
            </svg>
            {t("turboPulse.game.end.score", { score: snapshot.score })}
          </p>
        )}
        <button type="button" className={styles.endAction} onClick={onAction}>
          {action}
        </button>
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

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
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
  /** Téléphone : le lecteur occupe tout l'écran dès l'ouverture, avec sa barre (voir GamePlayer). */
  cover?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
  /** Page de jeu autonome : le titre est le titre de niveau 1 de la page (dans la page Jeux, c'est le catalogue qui l'a). */
  pageHeading?: boolean;
}

// Lecteur de Turbo Pulse, utilisé dans la page « Jeux » (comme les Tuiles magiques) et sur sa page autonome.
// L'état de la partie vit ici : passer du mode normal au plein écran ne recrée jamais Phaser.
export function TurboPulsePlayer({
  fullscreen = false,
  onFullscreenChange,
  onClose,
  cover = false,
  active = true,
  pageHeading = false,
}: TurboPulsePlayerProps) {
  const { t } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TurboPulseController | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [engineFailure, setEngineFailure] = useState<Error | null>(null);
  if (engineFailure) throw engineFailure;

  // Ordre des téléchargements sur une connexion lente (le débit est partagé : ce qui part en même temps arrive plus tard) :
  // 1. le moteur Phaser, pour que la partie démarre au plus tôt ; 2. le décor du niveau en cours, en priorité haute ;
  // 3. la musique et le décor du niveau suivant. Rien de secondaire ne retarde la partie ni le décor.
  const engineSettled = useRef(deferred());
  // Dernière valeur de `active`, lue à l'arrivée du moteur (voir l'effet de montage).
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  // Pause demandée avant l'arrivée du moteur (bouton Pause, veille de la page) : mémorisée et affichée, puis appliquée au
  // montage. Sans elle, la demande était perdue et la partie démarrait toute seule.
  const [engineReady, setEngineReady] = useState(false);
  const [pausedBeforeEngine, setPausedBeforeEngine] = useState(false);
  const pausedBeforeEngineRef = useRef(false);

  // Musique d'ambiance (308 Ko) : demandée une fois le décor affiché (étape 3). Une seule fois par ouverture du jeu.
  const musicRequested = useRef(false);
  const requestMusic = () => {
    if (musicRequested.current || !audioRef.current) return;
    musicRequested.current = true;
    void audioRef.current.loadMusic(themeUrl).catch(() => undefined);
  };

  // Décor du niveau (voir turbo-pulse-backgrounds) : re-déclenché uniquement quand levelIndex change réellement, jamais à
  // chaque instantané de partie, pour ne jamais redemander le même décor. Demandé une fois le moteur arrivé (étape 2), en
  // priorité haute, et affiché une fois décodé ; puis la musique et le décor du niveau suivant, en priorité basse : au
  // changement de niveau, il est déjà là. `cancelled` évite d'appliquer un décor arrivé après un changement de niveau.
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const url = backgroundFor(snapshot.levelIndex);
    Promise.race([
      engineSettled.current.promise,
      new Promise<void>((done) => {
        timer = window.setTimeout(done, ENGINE_WAIT_TIMEOUT_MS);
      }),
    ])
      .then(() => loadImage(url, "high"))
      .then(() => {
        if (cancelled) return;
        setBackgroundUrl(url);
        requestMusic();
        const next = nextBackgroundFor(snapshot.levelIndex);
        if (next) void loadImage(next, "low").catch(() => undefined);
      })
      .catch(() => {
        // Décor indisponible (réseau coupé) : la partie continue sur le décor déjà affiché ou le fond de secours du cadre.
        if (!cancelled) requestMusic();
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [snapshot.levelIndex]);

  useEffect(() => {
    if (!gameHostRef.current) return;
    // Son : musique d'ambiance et effets, sur deux pistes indépendantes (voir GameAudio). La musique est téléchargée après
    // le premier décor (voir requestMusic) ; les effets sont fabriqués par programmation, sans fichier.
    const audio = new GameAudio({ storageKey: GAMES_SOUND_STORAGE_KEY });
    audioRef.current = audio;
    musicRequested.current = false;
    // Moteur chargé à la demande (étape 1), dès l'ouverture : le lecteur s'affiche sans l'attendre, et le décor ne lui
    // dispute pas le débit (il part une fois le moteur arrivé).
    let disposed = false;
    const host = gameHostRef.current;
    import("./TurboPulseGame")
      .then(({ mountTurboPulseGame }) => {
        if (disposed) return;
        controllerRef.current = mountTurboPulseGame(host, setSnapshot, audio);
        // La scène a pu être mise à l'échelle avant l'arrivée du moteur : Phaser se recale sur la taille actuelle.
        controllerRef.current.refreshLayout();
        // Pause demandée pendant le téléchargement (et pas reprise depuis), lecteur masqué ou page cachée : la partie démarre
        // en pause, et l'enfant la lance d'un toucher sur « Reprendre ».
        if (pausedBeforeEngineRef.current || !activeRef.current || document.visibilityState === "hidden") {
          controllerRef.current.togglePause();
        }
        setEngineReady(true);
      })
      .catch((error: unknown) => {
        // Moteur introuvable (réseau coupé) : même issue qu'avant, l'erreur remonte au cadre d'erreur de la page.
        if (!disposed) setEngineFailure(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => engineSettled.current.resolve());
    // Le toucher qui a ouvert le jeu autorise déjà le son sur la plupart des navigateurs ; sinon, le prochain toucher dans le
    // lecteur le réveille (iPhone).
    audio.unlock();
    const root = rootRef.current;
    const unlock = () => audio.unlock();
    root?.addEventListener("pointerdown", unlock, true);
    root?.addEventListener("keydown", unlock, true);
    return () => {
      disposed = true;
      root?.removeEventListener("pointerdown", unlock, true);
      root?.removeEventListener("keydown", unlock, true);
      controllerRef.current?.destroy();
      controllerRef.current = null;
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  // Phaser ne surveille nativement que le redimensionnement de la fenêtre,
  // jamais celui d'un conteneur CSS : sans cet observateur, un changement de
  // largeur/hauteur du canvasFrame (mise en page responsive, ouverture du
  // panneau latéral, simple redimensionnement de la fenêtre) laisserait le
  // monde de jeu figé à sa dernière taille connue au lieu de suivre la
  // surface réellement disponible. refreshLayout() remesure et redessine
  // sans jamais recréer la scène ni perdre la partie en cours.
  //
  // La scène ne descend jamais sous MIN_WORLD_WIDTH × MIN_WORLD_HEIGHT (règle du moteur). Quand le cadre est plus petit
  // (téléphone en paysage avec la barre du navigateur, petit lecteur dans la page), la scène garde sa taille minimale et
  // elle est réduite à l'affichage pour tenir entière dans le cadre : le canon n'est jamais coupé sous la barre de commandes.
  useEffect(() => {
    const frame = canvasFrameRef.current;
    const host = gameHostRef.current;
    if (!frame || !host) return;
    const fit = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      const ratio = width > 0 && height > 0 ? Math.min(1, width / MIN_WORLD_WIDTH, height / MIN_WORLD_HEIGHT) : 1;
      // Le conteneur de Phaser prend la taille réelle de la scène (Phaser mesure son conteneur) ; seul le canvas est réduit
      // à l'affichage (variable --scene-scale), et Phaser recalcule la visée d'après la taille affichée du canvas.
      if (ratio < 1) {
        host.style.width = `${width / ratio}px`;
        host.style.height = `${height / ratio}px`;
        host.style.setProperty("--scene-scale", String(ratio));
      } else {
        host.style.width = "";
        host.style.height = "";
        host.style.removeProperty("--scene-scale");
      }
      // Le cadre ne défile jamais (voir .canvasFrame) ; sur un navigateur sans overflow: clip, un défilement resté d'une
      // disposition précédente est annulé ici, sinon la scène resterait décalée.
      frame.scrollTop = 0;
      frame.scrollLeft = 0;
      controllerRef.current?.refreshLayout();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    // Rotation, redimensionnement, plein écran et surtout retour de veille : la scène est remesurée et Phaser recalcule sa taille
    // dès que la nouvelle disposition est appliquée (même si le cadre a retrouvé sa taille d'avant la veille, Phaser a pu en
    // mémoriser une autre pendant qu'elle était cachée).
    const stopListening = onViewportSettled(fit);
    return () => {
      observer.disconnect();
      stopListening();
    };
  }, []);

  // Le lecteur standard gère le plein écran ; Phaser, lui, re-mesure sa scène quand la présentation change.
  useEffect(() => {
    controllerRef.current?.refreshLayout();
  }, [fullscreen, cover]);

  // Jeu masqué (fermé, onglet changé) : la partie se met en pause, sans rien perdre.
  useEffect(() => {
    const running = snapshot.status === "playing" || snapshot.status === "clearing";
    if (!active && running && !snapshot.paused) controllerRef.current?.togglePause();
  }, [active, snapshot.status, snapshot.paused]);

  // Musique : seulement pendant la partie, jeu visible et onglet affiché ; fondu à la pause, en fin de niveau et à la fermeture.
  const visible = usePageVisible();
  const musicOn = active && visible && !snapshot.paused && (snapshot.status === "playing" || snapshot.status === "clearing");
  useEffect(() => {
    if (musicOn) audioRef.current?.playMusic();
    else audioRef.current?.pauseMusic();
  }, [musicOn]);

  // Pause et reprise demandées par le joueur ou par le lecteur (veille) : avant le moteur, la demande est mémorisée.
  const requestPaused = (next: boolean) => {
    const controller = controllerRef.current;
    if (!controller) {
      pausedBeforeEngineRef.current = next;
      setPausedBeforeEngine(next);
      return;
    }
    if (snapshot.paused !== next) controller.togglePause();
  };
  const paused = engineReady ? snapshot.paused : pausedBeforeEngine;

  const rank = rankForLevel(snapshot.levelIndex);
  const progress = Math.min(100, (snapshot.solved / CALCULATIONS_PER_LEVEL) * 100);
  const isSuccess = snapshot.status === "level-complete" || snapshot.status === "mastered";
  const canPause = snapshot.status === "playing" || snapshot.status === "clearing";
  const rankStyle = { "--rank": rank.accentCss, "--rank-light": rank.lightCss, "--rank-dark": rank.darkCss } as CSSProperties;

  // Le lecteur standard fournit le cadre, l'en-tête, la barre de commandes, la pause et le plein écran ; Turbo Pulse n'apporte
  // que son moteur Phaser, son décor, ses panneaux de fin de niveau, son indicateur de rang et le bouton Son.
  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("turboPulse.game.title")}
      title={t("turboPulse.game.title")}
      titleIsHeading={pageHeading}
      stageUnderControls
      headerCenter={
        <section className={styles.levelHeader} aria-label={t("turboPulse.game.statusLabel")} style={rankStyle}>
          <div className={styles.rankBadge}>
            <RankEmblem rank={rank} size={26} />
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
        </section>
      }
      stats={[
        { label: t("turboPulse.game.score"), value: `🏆 ${snapshot.score}` },
        { label: t("turboPulse.game.streak"), value: `🔥 ${snapshot.streak}` },
        { label: t("turboPulse.game.defense"), value: `🛡️ ${snapshot.intrusions} / ${snapshot.intrusionLimit}` },
      ]}
      paused={paused}
      onPlay={() => requestPaused(false)}
      onPause={() => requestPaused(true)}
      ended={!canPause}
      onRestart={() => controllerRef.current?.restartRun()}
      extraControls={
        <button
          type="button"
          className={playerControlClass}
          aria-pressed={!snapshot.muted}
          aria-label={snapshot.muted ? t("turboPulse.game.actions.soundOff") : t("turboPulse.game.actions.soundOn")}
          onClick={() => controllerRef.current?.toggleMuted()}
        >
          <Icon>
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {snapshot.muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </Icon>
          <span>{snapshot.muted ? t("turboPulse.game.actions.soundOff") : t("turboPulse.game.actions.soundOn")}</span>
        </button>
      }
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
    >
      <div className={styles.playArea}>
        <div ref={canvasFrameRef} className={styles.canvasFrame} style={rankStyle}>
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
          {snapshot.status === "failed" ? <EndPanel snapshot={snapshot} onAction={() => controllerRef.current?.retryLevel()} /> : null}
          {isSuccess ? <EndPanel snapshot={snapshot} onAction={() => controllerRef.current?.nextLevel()} /> : null}
        </div>
        <p className={styles.srOnly} aria-live="polite">{snapshot.feedback}</p>
      </div>
    </GamePlayer>
  );
}
