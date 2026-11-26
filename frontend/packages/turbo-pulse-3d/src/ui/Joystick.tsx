import { useRef, useState, type PointerEvent } from "react";

import styles from "./FlightGame.module.css";

// Joystick tactile : on pose le pouce sur le disque et on le glisse ; la poignée suit, et on rend un vecteur de −1 à 1
// (x vers la droite, y vers le haut). Au relâchement, le joystick revient au centre.
//
// Écrit pour Yamba.

const RADIUS = 48;

export function Joystick({ label, onChange }: Readonly<{ label: string; onChange: (x: number, y: number) => void }>) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const move = (event: PointerEvent) => {
    const rect = base.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS;
      dy = (dy / length) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // Petite zone morte au centre, puis réponse progressive.
    const nx = dx / RADIUS;
    const ny = -dy / RADIUS;
    const dead = (v: number) => (Math.abs(v) < 0.12 ? 0 : v);
    onChange(dead(nx), dead(ny));
  };
  const release = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={base}
      className={styles.stick}
      role="application"
      aria-label={label}
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) move(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className={styles.stickKnob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
