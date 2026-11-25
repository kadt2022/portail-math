import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CameraMode } from "../engine/scene/cameraRig";
import { CAMERA_MODES } from "../engine/scene/cameraRig";
import type { TrainEngineHandle, TrainEvent, TrainSnapshot } from "../engine/scene/trainEngine";
import { createTranslator, placeName } from "../i18n/messages";
import { TrainStage, type DriverHandlers, type StageStats } from "../ui/TrainStage";
import { loadTrainEngine } from "./engineLoader";
import type { StandardPlayerBinding, TrainMultiplicationsGame, TrainMultiplicationsSettings } from "./playerContract";

// Adaptateur du jeu pour un hôte React : il charge et monte la scène 3D, relie les commandes (boutons, clavier), lit
// l'état du train dix fois par seconde pour le tableau de bord, et rend ce que le lecteur standard attend. Il ne
// connaît ni le portail, ni son lecteur, ni ses traductions.
//
// Écrit pour Yamba, sur le modèle de l'adaptateur de la Rivière des fractions.

const DOWNLOAD_SHARE = 0.5;
const TOAST_MS = 3200;

export function useTrainMultiplications(settings: TrainMultiplicationsSettings): TrainMultiplicationsGame {
  const { locale, active = true, showPerformance = false, maxPixelRatio, quality = "auto", renderer = "auto", loadEngine = loadTrainEngine } = settings;
  const t = useMemo(() => createTranslator(locale), [locale]);
  const onEvent = useRef(settings.onEvent);
  const engineLoader = useRef(loadEngine);
  useEffect(() => {
    onEvent.current = settings.onEvent;
    engineLoader.current = loadEngine;
  });

  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TrainEngineHandle | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [snapshot, setSnapshot] = useState<TrainSnapshot | null>(null);
  const [stats, setStats] = useState<StageStats | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(["depart"]));
  const toastTimer = useRef<number | null>(null);
  const tRef = useRef(t);
  const localeRef = useRef(locale);
  useEffect(() => {
    tRef.current = t;
    localeRef.current = locale;
  });

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const handleEvent = useCallback(
    (event: TrainEvent) => {
      onEvent.current?.(event);
      const tr = tRef.current;
      if (event.type === "arrived") {
        const station = placeName(localeRef.current, event.name);
        say(event.precision < 1.5 ? tr("arrivedPrecise", { station, distance: event.precision.toFixed(1).replace(".", localeRef.current === "fr" ? "," : ".") }) : tr("arrived", { station }));
        setVisited((current) => new Set(current).add(event.station.replace(/-\d$/, "")));
      } else if (event.type === "bumped") say(tr("bumped"));
      else if (event.type === "entered") say(placeName(localeRef.current, event.structure));
    },
    [say],
  );

  // Chargement du moteur 3D, puis construction de la scène dans l'élément hôte ; libération complète à la fermeture.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let engine: TrainEngineHandle | null = null;
    setReady(false);
    setFailed(false);
    setProgress(0);
    engineLoader
      .current()
      .then(async (module) => {
        if (cancelled) return;
        setProgress(DOWNLOAD_SHARE);
        const created = await module.createTrainEngine({
          host,
          maxPixelRatio,
          quality,
          renderer,
          onBuildProgress: (fraction) => setProgress((value) => Math.max(value, DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * fraction)),
          onEvent: (event) => handleEvent(event),
        });
        if (cancelled) {
          created.dispose();
          return;
        }
        engine = created;
        engineRef.current = created;
        setProgress(1);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if ((error as { name?: string } | null)?.name === "TrainEngineUnsupportedError") setUnsupported(true);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [attempt, maxPixelRatio, quality, renderer, handleEvent]);

  // Tableau de bord : l'état du train, dix fois par seconde (pas à chaque image).
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      setSnapshot(engine.snapshot());
      if (showPerformance) {
        const s = engine.stats();
        setStats({ fps: s.fps, triangles: s.triangles, drawCalls: s.drawCalls, renderer: s.renderer });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [ready, showPerformance]);

  // Pause automatique quand le jeu n'est plus visible, et pause demandée par le lecteur.
  useEffect(() => {
    engineRef.current?.setPaused(paused || !active);
  }, [paused, active, ready]);

  const startSound = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.audio.setEnabled(soundOn);
    engine.audio.resume();
  }, [soundOn]);

  const handlers: DriverHandlers = useMemo(
    () => ({
      throttle: (on) => {
        startSound();
        engineRef.current?.setInput({ throttle: on });
      },
      brake: (on) => {
        startSound();
        engineRef.current?.setInput({ brake: on });
      },
      reverse: () => {
        startSound();
        if (engineRef.current && !engineRef.current.reverse()) say(tRef.current("reverseHint"));
      },
      stop: () => engineRef.current?.emergencyStop(),
      whistle: () => {
        startSound();
        engineRef.current?.whistle();
      },
      camera: (mode: CameraMode) => engineRef.current?.setCamera(mode),
      toggleSwitch: () => {
        engineRef.current?.toggleSwitch();
      },
    }),
    [say, startSound],
  );

  // Clavier : flèches (ou W/S) tenues, R, Espace, H, C, 1 à 4, V.
  useEffect(() => {
    if (!ready || !active) return;
    const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    const down = (event: KeyboardEvent) => {
      if (isTyping(event.target) || paused) return;
      // Touche déjà traitée par un bouton (Accélérer ou Freiner tenus au clavier) : pas de second effet global.
      if (event.defaultPrevented) return;
      const engine = engineRef.current;
      if (!engine) return;
      const code = event.code;
      // Espace sur un bouton le déclenche lui-même (caméra, aiguillage...) : ce n'est pas un arrêt d'urgence.
      if (code === "Space" && event.target instanceof HTMLButtonElement) return;
      if (code === "ArrowUp" || code === "KeyW" || code === "KeyZ") handlers.throttle(true);
      else if (code === "ArrowDown" || code === "KeyS") handlers.brake(true);
      else if (event.repeat) return;
      else if (code === "KeyR") handlers.reverse();
      else if (code === "Space") handlers.stop();
      else if (code === "KeyH") handlers.whistle();
      else if (code === "KeyV") handlers.toggleSwitch();
      else if (code === "KeyC") handlers.camera(CAMERA_MODES[(CAMERA_MODES.indexOf(engine.snapshot().camera) + 1) % CAMERA_MODES.length]);
      else if (/^Digit[1-5]$/.test(code)) handlers.camera(CAMERA_MODES[Number(code.slice(5)) - 1]);
      else return;
      event.preventDefault();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "KeyZ") handlers.throttle(false);
      else if (event.code === "ArrowDown" || event.code === "KeyS") handlers.brake(false);
    };
    const release = () => engineRef.current?.setInput({ throttle: false, brake: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, [ready, active, paused, handlers]);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const player: StandardPlayerBinding = {
    label: t("label"),
    title: t("title"),
    headerCenter: t("line"),
    stats: [
      { label: t("speed"), value: `${Math.round(Math.abs(snapshot?.speedKmh ?? 0))} ${t("kmh")}` },
      { label: t("stations"), value: `${visited.size}/3` },
    ],
    paused,
    onPlay: () => setPaused(false),
    onPause: () => {
      engineRef.current?.setInput({ throttle: false, brake: false });
      setPaused(true);
    },
    ended: false,
    onRestart: () => {
      engineRef.current?.restart();
      setVisited(new Set(["depart"]));
      setPaused(false);
    },
    restartLabel: t("restart"),
    howTo: (["drive", "stop", "cameras", "keys"] as const).map((step) => ({ title: t(`howto.${step}.title`), text: t(`howto.${step}.text`) })),
  };

  return {
    stage: <TrainStage hostRef={hostRef} t={t} locale={locale} snapshot={ready ? snapshot : null} handlers={handlers} toast={toast} stats={stats} unsupported={unsupported} />,
    player,
    loading: {
      progress,
      engineLoaded: progress >= DOWNLOAD_SHARE,
      buildProgress: progress >= DOWNLOAD_SHARE ? Math.min(1, (progress - DOWNLOAD_SHARE) / (1 - DOWNLOAD_SHARE)) : 0,
      ready,
      failed,
      unsupported,
      retry: () => setAttempt((n) => n + 1),
    },
    sound: {
      on: soundOn,
      toggle: () => {
        const next = !soundOn;
        setSoundOn(next);
        const engine = engineRef.current;
        if (engine) {
          engine.audio.setEnabled(next);
          if (next) engine.audio.resume();
        }
      },
      label: soundOn ? t("soundOn") : t("soundOff"),
    },
  };
}
