import { describe, expect, it } from "vitest";

import { MOTION_TUNING, initialMotion, stepMotion, type BoatMotion, type BoatMotionInput } from "../../src/engine/navigation/boatMotion";

const DT = 1 / 60;
const calm = { wavePitch: 0, waveRoll: 0 };

function run(seconds: number, input: (t: number) => Omit<BoatMotionInput, "dt" | "time">, start: BoatMotion = initialMotion(), dt = DT) {
  let state = start;
  const trace: BoatMotion[] = [];
  for (let t = dt; t <= seconds + 1e-9; t += dt) {
    state = stepMotion(state, { ...input(t), dt, time: t });
    trace.push(state);
  }
  return { state, trace };
}

describe("Animation du bateau du joueur", () => {
  it("au ponton : moteur au point mort, hélice immobile, léger balancement seulement", () => {
    const { trace } = run(10, () => ({ speed: 0, lateral: 0, steer: 1, moored: true, ...calm }));
    expect(trace.every((s) => s.propellerSpeed === 0 && s.propeller === 0)).toBe(true);
    expect(trace.every((s) => s.outboardYaw === 0)).toBe(true);
    expect(Math.max(...trace.map((s) => Math.abs(s.roll)))).toBeLessThan(0.03);
    expect(Math.max(...trace.map((s) => Math.abs(s.pitch)))).toBeLessThan(0.02);
    expect(Math.max(...trace.map((s) => Math.abs(s.roll)))).toBeGreaterThan(0.002);
  });

  it("fait tourner l'hélice quand le moteur pousse, sans dépasser une vitesse lisible", () => {
    const { state, trace } = run(4, () => ({ speed: 6.4, lateral: 0, steer: 0, moored: false, ...calm }));
    expect(state.propellerSpeed).toBeGreaterThan(18);
    expect(Math.max(...trace.map((s) => s.propellerSpeed))).toBeLessThanOrEqual(MOTION_TUNING.maxPropellerSpeed + 1e-9);
    expect(new Set(trace.slice(-10).map((s) => s.propeller.toFixed(4))).size).toBe(10);
    // Moteur coupé : l'hélice ralentit progressivement, sans s'arrêter net.
    const { trace: stopping } = run(0.3, () => ({ speed: 0, lateral: 0, steer: 0, moored: true, ...calm }), state);
    expect(stopping[0].propellerSpeed).toBeGreaterThan(stopping.at(-1)!.propellerSpeed);
    expect(stopping.at(-1)!.propellerSpeed).toBeGreaterThan(0);
  });

  it("oriente le moteur hors-bord dans le sens du virage, avec douceur et sans dépasser la butée", () => {
    const { state, trace } = run(1.5, () => ({ speed: 5, lateral: 2, steer: 1, moored: false, ...calm }));
    // Virage à tribord : le moteur tourne vers bâbord (sa poussée chasse la poupe), son embase part vers tribord.
    expect(state.outboardYaw).toBeLessThan(-0.35);
    expect(Math.min(...trace.map((s) => s.outboardYaw))).toBeGreaterThanOrEqual(-MOTION_TUNING.maxOutboardYaw - 1e-9);
    expect(trace[1].outboardYaw).toBeGreaterThan(-0.15);
    const { state: left } = run(1.5, () => ({ speed: 5, lateral: -2, steer: -1, moored: false, ...calm }), state);
    expect(left.outboardYaw).toBeGreaterThan(0.35);
    const { state: straight } = run(1.5, () => ({ speed: 5, lateral: 0, steer: 0, moored: false, ...calm }), left);
    expect(Math.abs(straight.outboardYaw)).toBeLessThan(0.01);
  });

  it("se penche modérément à l'intérieur du virage", () => {
    const { trace } = run(3, () => ({ speed: 5, lateral: 4, steer: 1, moored: false, ...calm }));
    const settled = trace.slice(-60);
    // Virage vers tribord : tribord s'abaisse (roulis négatif), sans dépasser une douzaine de degrés.
    expect(Math.max(...settled.map((s) => s.roll))).toBeLessThan(-0.05);
    expect(Math.min(...trace.map((s) => s.roll))).toBeGreaterThan(-(MOTION_TUNING.maxLean + MOTION_TUNING.swayRoll + 0.04));
    const { trace: other } = run(3, () => ({ speed: 5, lateral: -4, steer: -1, moored: false, ...calm }));
    expect(Math.min(...other.slice(-60).map((s) => s.roll))).toBeGreaterThan(0.05);
  });

  it("lève la proue en accélérant et la laisse retomber en ralentissant", () => {
    const { trace: speeding } = run(3, (t) => ({ speed: Math.min(6.4, t * 1.8), lateral: 0, steer: 0, moored: false, ...calm }));
    const cruising = run(4, () => ({ speed: 6.4, lateral: 0, steer: 0, moored: false, ...calm }), speeding.at(-1)!).state;
    expect(Math.min(...speeding.map((s) => s.pitch))).toBeLessThan(cruising.pitch - 0.01);
    expect(cruising.pitch).toBeLessThan(-0.02);
    const { trace: braking } = run(2, (t) => ({ speed: Math.max(0, 6.4 - t * 2.9), lateral: 0, steer: 0, moored: false, ...calm }), cruising);
    expect(Math.max(...braking.map((s) => s.pitch))).toBeGreaterThan(cruising.pitch + 0.03);
  });

  it("suit l'assiette des vagues et reste stable avec de grands pas de temps", () => {
    const { state } = run(5, () => ({ speed: 0, lateral: 0, steer: 0, moored: true, wavePitch: -0.05, waveRoll: 0.04 }));
    expect(state.pitch).toBeCloseTo(-0.05, 1);
    expect(state.roll).toBeCloseTo(0.04, 1);
    const coarse = run(20, () => ({ speed: 6.4, lateral: 3, steer: 1, moored: false, ...calm }), initialMotion(), 0.1).trace;
    expect(coarse.every((s) => Math.abs(s.pitch) < 0.2 && Math.abs(s.roll) < 0.2 && Math.abs(s.heave) < 0.1)).toBe(true);
  });

  it("est déterministe et ne bouge pas sans temps écoulé", () => {
    const input = (t: number) => ({ speed: 4 + Math.sin(t), lateral: Math.cos(t), steer: Math.sin(t * 2), moored: false, ...calm });
    expect(run(3, input).state).toEqual(run(3, input).state);
    const state = run(1, input).state;
    expect(stepMotion(state, { ...input(1), dt: 0, time: 1 })).toEqual(state);
  });
});
