import type { FlightInput } from "../flight/flightModel";

// Rassemble toutes les commandes (clavier, joystick, boutons tactiles) en une seule consigne pour le vaisseau.
//
// Écrit pour Yamba.

export type HeldKey = "left" | "right" | "up" | "down" | "accel" | "brake";

export const KEY_CODES: Readonly<Record<string, HeldKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "accel",
  ShiftLeft: "brake",
  ShiftRight: "brake",
};

const axis = (plus: boolean, minus: boolean) => (plus ? 1 : 0) - (minus ? 1 : 0);
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export class Controls {
  private readonly held: Record<HeldKey, boolean> = { left: false, right: false, up: false, down: false, accel: false, brake: false };
  private stickX = 0;
  private stickY = 0;
  private send: ((input: FlightInput) => void) | null = null;

  /** Branche (ou débranche) la destination des consignes, puis lui envoie l'état courant. */
  attach(send: ((input: FlightInput) => void) | null): void {
    this.send = send;
    this.push();
  }

  setKey(key: HeldKey, value: boolean): void {
    this.held[key] = value;
    this.push();
  }

  setStick(x: number, y: number): void {
    this.stickX = x;
    this.stickY = y;
    this.push();
  }

  releaseAll(): void {
    for (const key of Object.keys(this.held) as HeldKey[]) this.held[key] = false;
    this.stickX = 0;
    this.stickY = 0;
    this.push();
  }

  private push(): void {
    const h = this.held;
    this.send?.({ x: clamp(axis(h.right, h.left) + this.stickX), y: clamp(axis(h.up, h.down) + this.stickY), throttle: axis(h.accel, h.brake) });
  }
}
