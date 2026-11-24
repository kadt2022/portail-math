import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";

import type { CameraMode } from "../engine/scene/cameraRig";
import type { TrainSnapshot } from "../engine/scene/trainEngine";
import { placeName, type Translator, type TrainLocale } from "../i18n/messages";
import styles from "./TrainStage.module.css";

// La scène du train et son tableau de bord : compteur de vitesse, commandes de conduite (tenues ou appuyées), choix de
// la caméra, prochaine gare, aiguillage. Les commandes sont de vrais boutons (clavier, lecteur d'écran) ; Accélérer et
// Freiner agissent tant qu'on les tient.
//
// Écrit pour Yamba.

export interface StageStats {
  fps: number;
  triangles: number;
  drawCalls: number;
  /** Moteur de rendu (webgpu, webgl2, webgl1). */
  renderer?: string;
}

export interface DriverHandlers {
  throttle: (on: boolean) => void;
  brake: (on: boolean) => void;
  reverse: () => void;
  stop: () => void;
  whistle: () => void;
  camera: (mode: CameraMode) => void;
  toggleSwitch: () => void;
}

export interface TrainStageProps {
  hostRef: RefObject<HTMLDivElement | null>;
  t: Translator;
  locale: TrainLocale;
  snapshot: TrainSnapshot | null;
  handlers: DriverHandlers;
  toast: string | null;
  stats: StageStats | null;
  unsupported: boolean;
}

const CAMERAS: CameraMode[] = ["behind", "cab", "side", "loading", "panorama"];
const MAX_KMH = 70;

function Speedometer({ kmh, label, unit }: { kmh: number; label: string; unit: string }) {
  const value = Math.min(MAX_KMH, Math.abs(kmh));
  const angle = -120 + (value / MAX_KMH) * 240;
  const arc = (from: number, to: number) => {
    const p = (a: number) => [50 + 40 * Math.sin((a * Math.PI) / 180), 54 - 40 * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = p(from);
    const [x1, y1] = p(to);
    return `M ${x0} ${y0} A 40 40 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <div className={styles.gauge} role="img" aria-label={`${label} : ${Math.round(Math.abs(kmh))} ${unit}`}>
      <svg viewBox="0 0 100 70" aria-hidden="true" focusable="false">
        <path d={arc(-120, 40)} className={styles.arcGreen} />
        <path d={arc(40, 85)} className={styles.arcYellow} />
        <path d={arc(85, 120)} className={styles.arcRed} />
        <line x1="50" y1="54" x2="50" y2="20" className={styles.needle} transform={`rotate(${angle} 50 54)`} />
        <circle cx="50" cy="54" r="4" className={styles.hub} />
      </svg>
      <span className={styles.gaugeValue}>
        {Math.round(Math.abs(kmh))}
        <small className={styles.gaugeUnit}> {unit}</small>
      </span>
    </div>
  );
}

function HoldButton({ label, className, onHold, children, disabled }: { label: string; className: string; onHold: (on: boolean) => void; children: ReactNode; disabled?: boolean }) {
  const down = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      onHold(true);
    },
    [onHold],
  );
  const up = useCallback(() => onHold(false), [onHold]);
  return (
    <button
      type="button"
      className={`${styles.control} ${className}`}
      aria-label={label}
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onHold(true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") onHold(false);
      }}
      onBlur={up}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {path}
  </svg>
);

export function TrainStage({ hostRef, t, locale, snapshot, handlers, toast, stats, unsupported }: TrainStageProps) {
  const moving = snapshot ? Math.abs(snapshot.speedKmh) > 0.3 : false;
  const next = snapshot?.nextStation;
  const distance = next ? Math.max(0, next.distance) : 0;
  return (
    <div className={styles.stage}>
      <div ref={hostRef} className={styles.host} />
      {unsupported ? <p className={styles.unsupported}>{t("unsupported")}</p> : null}
      {snapshot ? (
        <>
          <div className={styles.info} aria-live="polite">
            {snapshot.atStation ? (
              <p className={styles.infoTitle}>
                {t("atStation")} · {placeName(locale, snapshot.atStation.name)}
              </p>
            ) : next ? (
              <>
                <p className={styles.infoLabel}>{t("nextStation")}</p>
                <p className={styles.infoTitle}>{placeName(locale, next.name)}</p>
                <p className={styles.infoDistance}>
                  {distance < 1000 ? `${Math.round(distance)} ${t("meters")}` : `${(distance / 1000).toFixed(1)} km`} · {t("stopMark")}
                </p>
                <div className={styles.approach} aria-hidden="true">
                  <span style={{ width: `${Math.max(4, 100 - Math.min(100, distance / 3))}%` }} />
                </div>
              </>
            ) : (
              <p className={styles.infoTitle}>{t("terminus")}</p>
            )}
          </div>
          <div className={styles.switchBox}>
            <span className={styles.switchLabel}>{t("switchLabel")}</span>
            <button type="button" className={styles.switchButton} onClick={handlers.toggleSwitch} disabled={!snapshot.switchFree} aria-label={`${t("switchLabel")} : ${t(snapshot.route === "main" ? "switch.main" : "switch.branch")}`}>
              {snapshot.switchFree ? t(snapshot.route === "main" ? "switch.main" : "switch.branch") : t("switchLocked")}
            </button>
          </div>
          {toast ? (
            <p className={styles.toast} role="status">
              {toast}
            </p>
          ) : null}
          <div className={styles.dashboard}>
            <Speedometer kmh={snapshot.speedKmh} label={t("speed")} unit={t("kmh")} />
            <div className={styles.controls}>
              <HoldButton label={t("accelerate")} className={styles.accelerate} onHold={handlers.throttle}>
                {icon(<path d="M12 19V5M5 12l7-7 7 7" />)}
              </HoldButton>
              <HoldButton label={t("brake")} className={styles.brake} onHold={handlers.brake}>
                {icon(<><circle cx="12" cy="12" r="8" /><path d="M12 8v5M12 16h.01" /></>)}
              </HoldButton>
              <button type="button" className={`${styles.control} ${styles.reverse}`} onClick={handlers.reverse} aria-label={snapshot.direction === 1 ? t("reverse") : t("forward")} title={moving ? t("reverseHint") : undefined} aria-disabled={moving}>
                {icon(snapshot.direction === 1 ? <path d="M12 5v14M5 12l7 7 7-7" /> : <path d="M12 19V5M5 12l7-7 7 7" />)}
                <span>{snapshot.direction === 1 ? t("reverse") : t("forward")}</span>
              </button>
              <button type="button" className={`${styles.control} ${styles.stop}`} onClick={handlers.stop} aria-label={t("stop")} aria-pressed={snapshot.emergency}>
                {icon(<rect x="6" y="6" width="12" height="12" rx="2" />)}
                <span>{t("stop")}</span>
              </button>
              <button type="button" className={`${styles.control} ${styles.whistle}`} onClick={handlers.whistle} aria-label={t("whistle")}>
                {icon(<><path d="M4 10h9l6-4v12l-6-4H4z" /><path d="M7 14v4" /></>)}
                <span>{t("whistle")}</span>
              </button>
            </div>
          </div>
          <div className={styles.cameras} role="group" aria-label={t("cameras")}>
            {CAMERAS.map((mode) => (
              <button key={mode} type="button" className={styles.camera} aria-pressed={snapshot.camera === mode} onClick={() => handlers.camera(mode)}>
                {icon(
                  mode === "behind" ? (
                    <><rect x="5" y="7" width="14" height="9" rx="2" /><circle cx="8" cy="18" r="1.6" /><circle cx="16" cy="18" r="1.6" /><path d="M9 7V4h6v3" /></>
                  ) : mode === "cab" ? (
                    <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /><path d="M12 4v5.5M5 15l5-1.5M19 15l-5-1.5" /></>
                  ) : mode === "side" ? (
                    <><rect x="3" y="7" width="12" height="10" rx="2" /><path d="m15 11 6-3v8l-6-3" /></>
                  ) : mode === "loading" ? (
                    <><path d="M4 9l8-4 8 4-8 4z" /><path d="M4 9v6l8 4 8-4V9" /></>
                  ) : (
                    <><path d="M3 18l6-8 4 5 3-3 5 6z" /><circle cx="17" cy="6" r="2" /></>
                  ),
                )}
                <span>{t(`camera.${mode}`)}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {stats ? (
        <p className={styles.perf} aria-hidden="true">
          {stats.renderer ? `${stats.renderer} · ` : ""}{stats.fps} img/s · {Math.round(stats.triangles / 1000)}k tri · {stats.drawCalls} appels
        </p>
      ) : null}
    </div>
  );
}
