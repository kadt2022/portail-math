import { useEffect, useState, type PointerEvent } from "react";

import type { Translate } from "../i18n/messages";
import styles from "./RiverStage.module.css";

// Commandes de navigation du bateau : elles appartiennent au jeu (les commandes générales sont celles du lecteur).
// Un bouton se maintient enfoncé ; le relâcher, sortir du bouton ou perdre le pointeur arrête la manœuvre.

export interface SteeringControlsProps {
  t: Translate;
  disabled: boolean;
  onSteer: (direction: -1 | 0 | 1) => void;
}

export function SteeringControls({ t, disabled, onSteer }: SteeringControlsProps) {
  const [held, setHeld] = useState({ left: false, right: false });
  const direction: -1 | 0 | 1 = held.left === held.right ? 0 : held.left ? -1 : 1;
  useEffect(() => onSteer(direction), [direction, onSteer]);
  const release = (side: "left" | "right") => setHeld((current) => (current[side] ? { ...current, [side]: false } : current));
  const handlers = (side: "left" | "right") => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setHeld((current) => ({ ...current, [side]: true }));
    },
    onPointerUp: () => release(side),
    onPointerCancel: () => release(side),
    onLostPointerCapture: () => release(side),
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  });
  return (
    <div className={styles.controls} role="group" aria-label={t("steer.group")}>
      <button type="button" className={styles.steer} aria-label={t("steer.left")} disabled={disabled} {...handlers("left")}>
        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" focusable="false">
          <path d="M15.5 4.5 7.5 12l8 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" className={styles.steer} aria-label={t("steer.right")} disabled={disabled} {...handlers("right")}>
        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" focusable="false">
          <path d="m8.5 4.5 8 7.5-8 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
