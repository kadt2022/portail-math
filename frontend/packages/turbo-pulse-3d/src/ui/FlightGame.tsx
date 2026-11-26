import { useEffect, useRef, useState } from "react";

import { createFlightGame, type FlightGame as FlightEngine, type FlightHud, type FlightStats } from "../flight/flightEngine";
import { Controls, KEY_CODES, type HeldKey } from "./controls";
import { FLIGHT_TEXTS } from "./flightTexts";
import styles from "./FlightGame.module.css";
import { Joystick } from "./Joystick";
import { KeyHint } from "./KeyHint";

// Le jeu : le canevas 3D, le compteur de distance, les écrans de départ et d'arrivée, et les commandes (clavier et tactile).
//
// Écrit pour Yamba.

export interface FlightGameProps {
  language?: string;
  /** Affiche les mesures (images par seconde, appels de dessin, boules actives). */
  debug?: boolean;
  /** Appareil modeste : allège le rendu. */
  light?: boolean;
  /** Longueur du trajet, pour les essais. */
  distance?: number;
  /** Résolution adaptative (par défaut oui). */
  adaptive?: boolean;
  /** Lien « Fermer » ou « Atelier » ajoutés par la page hôte. */
  children?: React.ReactNode;
  onWorkshop?: () => void;
}

/** Bouton maintenu au doigt : actif tant que le doigt reste posé. */
const holdProps = (controls: Controls, key: HeldKey) => ({
  onPointerDown: (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    controls.setKey(key, true);
  },
  onPointerUp: () => controls.setKey(key, false),
  onPointerCancel: () => controls.setKey(key, false),
});

export function FlightGame({ language, debug = false, light = false, distance, adaptive = true, children, onWorkshop }: Readonly<FlightGameProps>) {
  const t = FLIGHT_TEXTS[language?.toLowerCase().startsWith("en") ? "en" : "fr"];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FlightEngine | null>(null);
  const [controls] = useState(() => new Controls());
  const [hud, setHud] = useState<FlightHud | null>(null);
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState(0);
  const [touch] = useState(() => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let game: FlightEngine;
    try {
      game = createFlightGame(canvas, { light, distance, adaptive });
    } catch {
      queueMicrotask(() => setFailed(true));
      return undefined;
    }
    gameRef.current = game;
    controls.attach((input) => game.setInput(input));
    game.onHud(setHud);
    game.onImpact(() => setFlash((n) => n + 1));
    const timer = debug ? window.setInterval(() => setStats(game.stats()), 1000) : 0;
    return () => {
      window.clearInterval(timer);
      controls.attach(null);
      game.dispose();
      gameRef.current = null;
    };
  }, [light, distance, adaptive, debug, controls]);

  useEffect(() => {
    const set = (event: KeyboardEvent, value: boolean) => {
      const key = KEY_CODES[event.code];
      if (!key) return;
      event.preventDefault();
      controls.setKey(key, value);
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const blur = () => controls.releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [controls]);

  const phase = hud?.phase ?? "ready";
  const remaining = Math.max(0, Math.round(hud?.remaining ?? 0));
  const progress = hud ? 1 - hud.remaining / hud.total : 0;
  const speedK = hud ? (hud.speed - hud.minSpeed) / (hud.maxSpeed - hud.minSpeed) : 0;

  return (
    <section className={styles.root} aria-label={t.label}>
      {failed ? <p role="alert" className={styles.error}>{t.noWebgl}</p> : <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}
      {flash > 0 ? <div key={flash} className={styles.flash} aria-hidden="true" /> : null}

      {phase === "flying" || phase === "arrived" ? (
        <div className={styles.hud}>
          <div className={styles.distance} aria-live="off">
            <span className={styles.station}>{t.station}</span>
            <strong>{remaining.toLocaleString(language ?? "fr")} {t.meters}</strong>
            <div className={styles.track} role="progressbar" aria-label={t.remaining} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className={styles.speed} aria-label={t.speed}>
            <div className={styles.speedBar}>
              <div className={styles.speedFill} style={{ height: `${Math.max(6, speedK * 100)}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.top}>
        <button type="button" className={styles.pill} aria-pressed={muted} aria-label={muted ? t.soundOff : t.soundOn} onClick={() => { setMuted(!muted); gameRef.current?.setMuted(!muted); }}>
          {muted ? "🔇" : "🔊"}
        </button>
        {children}
      </div>

      {debug && stats ? <p className={styles.debug}>{stats.fps} fps · {stats.drawCalls} draw calls · {stats.activeOrbs} orbs · ×{stats.scaling.toFixed(2)}</p> : null}

      {phase === "flying" ? (
        <>
          {touch ? (
            <>
              <div className={styles.stickZone}>
                <Joystick label={t.stick} onChange={(x, y) => controls.setStick(x, y)} />
              </div>
              <div className={styles.buttons}>
                <button type="button" className={styles.round} {...holdProps(controls, "accel")} aria-label={t.accelerate}>»</button>
                <button type="button" className={styles.round} {...holdProps(controls, "brake")} aria-label={t.brake}>«</button>
              </div>
            </>
          ) : (
            <div className={styles.hint}><KeyHint label={t.keyboard} accelerate={t.accelerate} brake={t.brake} /></div>
          )}
        </>
      ) : null}

      {phase === "ready" ? (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <h1>{t.title}</h1>
            <p>{t.mission}</p>
            {touch ? <p className={styles.small}>{t.touch}</p> : <KeyHint label={t.keyboard} accelerate={t.accelerate} brake={t.brake} />}
            <button type="button" className={styles.primary} onClick={() => gameRef.current?.start()}>{t.go}</button>
          </div>
        </div>
      ) : null}

      {phase === "arrived" ? (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <h2>{t.arrived}</h2>
            <p>{t.arrivedText}</p>
            <button type="button" className={styles.primary} onClick={() => gameRef.current?.restart()}>{t.again}</button>
            {onWorkshop ? <button type="button" className={styles.secondary} onClick={onWorkshop}>{t.workshop}</button> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
