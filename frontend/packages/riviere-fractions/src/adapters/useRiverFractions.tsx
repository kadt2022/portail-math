import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RiverSession, type ScenePort, type SessionView } from "../application/session";
import { createRandom, freshSeed } from "../domain/random";
import { createRiverAudio, type RiverAudio } from "../engine/audio/riverAudio";
import { createTranslator, type MessageKey } from "../i18n/messages";
import { RiverStage, type StageStats } from "../ui/RiverStage";
import { loadRiverEngine } from "./engineLoader";
import type { RiverFractionsGame, RiverFractionsSettings, StandardPlayerBinding } from "./playerContract";

// Adaptateur du jeu pour un hôte React : il crée la session, charge et monte la scène 3D, relie les commandes, et
// rend ce que le lecteur standard de l'hôte attend. Il ne connaît ni le portail, ni son lecteur, ni ses traductions.

type RiverEngineHandle = Awaited<ReturnType<Awaited<ReturnType<typeof loadRiverEngine>>["createRiverEngine"]>>;

const CORRECT_TOAST_MS = 2200;
const WRONG_PANEL_DELAY_MS = 1400;
const COMPLETED_PANEL_DELAY_MS = 1800;
const HINT_MS = 7000;
const DOWNLOAD_SHARE = 0.55;

const LEFT_KEYS = new Set(["ArrowLeft", "KeyA", "KeyQ"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);

/**
 * Forêt d'essai (YAMBA-RIVER-FOREST-02) : sur ce seul tronçon, la forêt d'arbres stylisés remplace les anciens arbres.
 * Le reste du niveau garde son décor tant que le Capitaine n'a pas validé la généralisation.
 */
const FOREST_TRIAL = { from: 410, to: 590 } as const;

export function useRiverFractions(settings: RiverFractionsSettings): RiverFractionsGame {
  const { locale, active = true, seed, showPerformance = false, maxPixelRatio, loadEngine = loadRiverEngine } = settings;
  const t = useMemo(() => createTranslator(locale), [locale]);
  const onEvent = useRef(settings.onEvent);
  // Le chargeur peut être une fonction recréée à chaque rendu de l'hôte : seul le dernier compte, sans recharger le moteur.
  const engineLoader = useRef(loadEngine);
  useEffect(() => {
    onEvent.current = settings.onEvent;
    engineLoader.current = loadEngine;
  });

  const [session] = useState(() => new RiverSession({ random: createRandom(seed ?? freshSeed()) }));
  const [view, setView] = useState<SessionView>(() => session.view);
  useEffect(() => {
    const stopViews = session.subscribe(setView);
    const stopEvents = session.listen((event) => onEvent.current?.(event));
    return () => {
      stopViews();
      stopEvents();
    };
  }, [session]);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RiverEngineHandle | null>(null);
  const audioRef = useRef<RiverAudio | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const soundStarted = useRef(false);
  const steering = useRef({ keyboard: 0, pointer: 0 });
  /** Indice affiché, attaché au défi pour lequel il a été demandé. */
  const [hint, setHint] = useState<{ text: string; rank: number; attempt: number } | null>(null);
  const [wrongShown, setWrongShown] = useState<number | null>(null);
  /** Tentative dont le panneau d'arrivée est affiché. */
  const [completedShown, setCompletedShown] = useState<number | null>(null);
  const [stats, setStats] = useState<StageStats | null>(null);

  const applySteer = useCallback(() => {
    const value = steering.current.keyboard + steering.current.pointer;
    engineRef.current?.setSteer(Math.max(-1, Math.min(1, value)));
  }, []);
  const releaseSteer = useCallback(() => {
    steering.current = { keyboard: 0, pointer: 0 };
    applySteer();
  }, [applySteer]);

  // Son : un seul moteur sonore pour la vie du jeu.
  useEffect(() => {
    const audio = createRiverAudio();
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  // Chargement du moteur 3D, puis construction de la scène dans l'élément hôte.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let engine: RiverEngineHandle | null = null;
    let downloading = true;
    setReady(false);
    setFailed(false);
    setProgress(0);
    const startedAt = performance.now();
    const timer = setInterval(() => {
      if (downloading) setProgress((value) => Math.max(value, DOWNLOAD_SHARE * (1 - Math.exp(-(performance.now() - startedAt) / 2500))));
    }, 150);
    const port = (handle: RiverEngineHandle): ScenePort => ({
      setSigns: (signs) => handle.setSigns(signs),
      showVerdict: (fork, lane, correct) => {
        handle.showVerdict(fork, lane, correct);
        audioRef.current?.play(correct ? "correct" : "wrong");
      },
      resetCrossing: () => handle.resetCrossing(),
      celebrate: () => {
        handle.celebrate();
        audioRef.current?.play("complete");
      },
    });
    engineLoader
      .current()
      .then(async (module) => {
        downloading = false;
        if (cancelled) return;
        const created = await module.createRiverEngine({
          host,
          maxPixelRatio,
          onLaneCrossed: (fork, lane) => session.laneCrossed(fork, lane),
          onBuildProgress: (fraction) => setProgress((value) => Math.max(value, DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * fraction)),
          forest: FOREST_TRIAL,
        });
        if (cancelled) {
          created.dispose();
          return;
        }
        engine = created;
        engineRef.current = created;
        session.attach(port(created));
        if (session.view.phase === "sailing") created.castOff();
        setProgress(1);
        setReady(true);
      })
      .catch((error: unknown) => {
        downloading = false;
        if (cancelled) return;
        if ((error as { name?: string } | null)?.name === "RiverEngineUnsupportedError") setUnsupported(true);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      clearInterval(timer);
      session.detach();
      engine?.dispose();
      engineRef.current = null;
    };
  }, [loadAttempt, maxPixelRatio, session]);

  // La scène suit la taille de son cadre (rotation, plein écran).
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready) return;
    const observer = new ResizeObserver(() => engineRef.current?.resize());
    observer.observe(host);
    return () => observer.disconnect();
  }, [ready]);

  // Pause : boucle de rendu arrêtée, ambiance coupée, commandes relâchées.
  const suspended = paused || !active;
  useEffect(() => {
    engineRef.current?.setPaused(suspended);
    audioRef.current?.setSuspended(suspended);
    if (suspended) releaseSteer();
  }, [suspended, ready, releaseSteer]);

  // Premier geste dans le jeu : le son voulu par défaut s'allume vraiment.
  useEffect(() => {
    const stage = hostRef.current?.parentElement;
    if (!stage || !soundOn || soundStarted.current) return;
    const start = () => {
      if (soundStarted.current) return;
      soundStarted.current = true;
      const audio = audioRef.current;
      if (!audio) return;
      audio.unlock();
      if (!audio.setEnabled(true)) setSoundOn(false);
    };
    stage.addEventListener("pointerdown", start, true);
    window.addEventListener("keydown", start, true);
    return () => {
      stage.removeEventListener("pointerdown", start, true);
      window.removeEventListener("keydown", start, true);
    };
  }, [soundOn]);

  // Clavier : flèches (et A/D, Q/D) tant que le jeu est actif.
  useEffect(() => {
    if (!active || paused || !ready) return;
    const pressed = new Set<string>();
    const update = () => {
      const left = [...pressed].some((code) => LEFT_KEYS.has(code));
      const right = [...pressed].some((code) => RIGHT_KEYS.has(code));
      steering.current.keyboard = left === right ? 0 : left ? -1 : 1;
      applySteer();
    };
    const down = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!LEFT_KEYS.has(event.code) && !RIGHT_KEYS.has(event.code)) return;
      event.preventDefault();
      pressed.add(event.code);
      update();
    };
    const up = (event: KeyboardEvent) => {
      if (pressed.delete(event.code)) update();
    };
    const blur = () => {
      pressed.clear();
      releaseSteer();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      blur();
    };
  }, [active, paused, ready, applySteer, releaseSteer]);

  // Messages : la réussite s'efface seule ; l'erreur et l'arrivée attendent un peu, pour laisser voir la scène.
  const feedback = view.feedback;
  useEffect(() => {
    if (feedback?.kind !== "correct") return;
    const timer = setTimeout(() => session.dismissFeedback(feedback.id), CORRECT_TOAST_MS);
    return () => clearTimeout(timer);
  }, [feedback, session]);
  useEffect(() => {
    if (feedback?.kind !== "wrong") return;
    const timer = setTimeout(() => setWrongShown(feedback.id), WRONG_PANEL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    if (view.phase !== "completed") return;
    const attempt = view.attempt;
    const timer = setTimeout(() => setCompletedShown(attempt), COMPLETED_PANEL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [view.phase, view.attempt]);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(timer);
  }, [hint]);
  const hintText = hint && hint.rank === view.rank && hint.attempt === view.attempt ? hint.text : null;

  // Panneau de mesures.
  useEffect(() => {
    if (!showPerformance || !ready) return;
    const timer = setInterval(() => {
      const engine = engineRef.current;
      if (engine) setStats(engine.getStats());
    }, 200);
    return () => clearInterval(timer);
  }, [showPerformance, ready]);

  const start = useCallback(() => {
    session.start();
    engineRef.current?.castOff();
    audioRef.current?.play("castOff");
  }, [session]);
  const restart = useCallback(() => {
    setPaused(false);
    setWrongShown(null);
    releaseSteer();
    session.restart();
  }, [session, releaseSteer]);
  const steer = useCallback(
    (direction: -1 | 0 | 1) => {
      steering.current.pointer = direction;
      applySteer();
    },
    [applySteer],
  );
  const showHint = useCallback(() => {
    const current = session.view;
    const family = current.challenge?.family;
    if (family) setHint({ text: t(`hint.${family}` as MessageKey), rank: current.rank, attempt: current.attempt });
  }, [session, t]);
  const toggleSound = useCallback(() => {
    const audio = audioRef.current;
    soundStarted.current = true;
    if (!audio) return;
    audio.unlock();
    const next = !soundOn;
    setSoundOn(audio.setEnabled(next) && next);
  }, [soundOn]);

  const current = Math.min(view.solved + 1, view.total);
  const player: StandardPlayerBinding = {
    label: t("player.label"),
    title: t("game.title"),
    headerCenter: t("level.title"),
    stats: [
      { label: t("stats.challenge"), value: `${current}/${view.total}` },
      { label: t("stats.attempt"), value: String(view.attempt) },
    ],
    paused,
    onPlay: () => setPaused(false),
    onPause: () => setPaused(true),
    ended: view.phase === "completed",
    onRestart: restart,
    restartLabel: t("restart.label"),
    onHint: showHint,
    hintDisabled: view.phase !== "sailing" || !view.challenge,
    howTo: [
      { title: t("howTo.read.title"), text: t("howTo.read.text") },
      { title: t("howTo.steer.title"), text: t("howTo.steer.text") },
      { title: t("howTo.rules.title"), text: t("howTo.rules.text") },
    ],
  };

  const stage = (
    <RiverStage
      hostRef={hostRef}
      view={view}
      t={t}
      ready={ready}
      unsupported={unsupported}
      showWrongPanel={feedback?.kind === "wrong" && wrongShown === feedback.id}
      showCompletedPanel={view.phase === "completed" && completedShown === view.attempt}
      hint={hintText}
      stats={showPerformance ? stats : null}
      onStart={start}
      onRestart={restart}
      onSteer={steer}
    />
  );

  return {
    stage,
    player,
    loading: { progress, ready, failed, unsupported, retry: () => setLoadAttempt((n) => n + 1) },
    sound: { on: soundOn, toggle: toggleSound, label: soundOn ? t("sound.on") : t("sound.off") },
  };
}
