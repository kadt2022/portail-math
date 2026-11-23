import type { RiverLayout } from "../geometry/layout";
import { createSeeded } from "./seeded";

// Les autres bateaux : des trajets prédéfinis, jamais dans les zones d'embranchement, pour qu'aucune rencontre ne
// soit impossible à éviter. Les bateaux en marche font des allers-retours le long d'une berge ; d'autres restent
// amarrés près des villages.

export type TrafficKind = "fishing" | "cargo" | "passenger";

export interface TrafficBoat {
  id: number;
  kind: TrafficKind;
  /** Bornes de l'aller-retour (s) ; égales pour un bateau amarré. */
  from: number;
  to: number;
  d: number;
  /** Durée d'un aller (secondes). */
  period: number;
  phase: number;
}

export interface TrafficPose {
  s: number;
  d: number;
  /** 1 vers l'aval, -1 vers l'amont. */
  direction: 1 | -1;
  speed: number;
}

export function createTraffic(layout: RiverLayout): TrafficBoat[] {
  const random = createSeeded(20261123);
  const kinds: TrafficKind[] = ["fishing", "cargo", "passenger"];
  const boats: TrafficBoat[] = [];
  let id = 0;
  layout.forks.forEach((fork, index) => {
    const from = fork.reachStart + 6;
    const to = fork.approachStart - 10;
    const side = index % 2 === 0 ? 1 : -1;
    const kind = kinds[index % kinds.length];
    const length = to - from;
    boats.push({ id: id++, kind, from, to, d: side * 6.4, period: length / (1.6 + random() * 1.2), phase: random() });
  });
  for (const village of layout.villages) {
    const s = (village.start + village.end) / 2;
    boats.push({ id: id++, kind: village.side > 0 ? "fishing" : "passenger", from: s, to: s, d: village.side * (layout.halfWidth(s) - 2.2), period: 1, phase: 0 });
  }
  return boats;
}

/** Position d'un bateau au temps t (secondes) : allers-retours lissés, demi-tour en douceur à chaque bout. */
export function trafficPose(boat: TrafficBoat, time: number): TrafficPose {
  if (boat.to === boat.from) return { s: boat.from, d: boat.d, direction: 1, speed: 0 };
  const cycle = (time / boat.period + boat.phase * 2) % 2;
  const forward = cycle < 1;
  const u = forward ? cycle : 2 - cycle;
  const eased = (1 - Math.cos(Math.PI * u)) / 2;
  const speed = (Math.PI / 2) * Math.sin(Math.PI * u) * ((boat.to - boat.from) / boat.period);
  return { s: boat.from + (boat.to - boat.from) * eased, d: boat.d, direction: forward ? 1 : -1, speed };
}
