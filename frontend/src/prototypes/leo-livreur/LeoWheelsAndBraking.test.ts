import { describe, expect, it } from "vitest";

import { updateLeoMotion, type LeoMotionState } from "./leoDriving";
import { START_POSITION } from "./leoGeometry";
import { bumperGap, laneDirection, TrafficManager, type TrafficVehicle } from "./leoTraffic";
import {
  LEO_SPEC_LEFT,
  LEO_SPEC_RIGHT,
  rollAngle,
  TRAFFIC_SPECS,
  vehicleDisplay,
  WHEEL_DISC_RATIO,
  wheelDiscSourceRadius,
  wheelOffset,
} from "./leoVehicleCatalog";

const ALL_SPECS = [LEO_SPEC_RIGHT, LEO_SPEC_LEFT, ...TRAFFIC_SPECS];
const FRAME = 1 / 60;

function place(manager: TrafficManager, index: number, patch: Partial<TrafficVehicle>) {
  const vehicle = manager.vehicles[index];
  const spec = patch.spec ?? TRAFFIC_SPECS[1];
  const display = vehicleDisplay(spec);
  Object.assign(vehicle, {
    active: true,
    lane: "same",
    spec,
    profile: "normal",
    x: 2000,
    speed: 100,
    cruise: 100,
    wheelAngle: 0,
    length: display.footprintLength,
    depth: display.footprintDepth,
    rollRadius: display.wheels[0].rollRadius,
  }, patch);
  return vehicle;
}

/** Gestionnaire sans apparition automatique (plafond 0) : seuls les véhicules placés existent. */
function fixedManager(capacity: number) {
  const manager = new TrafficManager({ capacity, random: () => 0.5 });
  manager.laneCap = 0;
  return manager;
}

describe("roues : axe de rotation stable", () => {
  it("fait tourner un disque rond centré sur la jante, de rayon entier identique texture / écran", () => {
    for (const spec of ALL_SPECS) {
      const display = vehicleDisplay(spec);
      spec.wheels.forEach(([, , radius], index) => {
        const source = wheelDiscSourceRadius(radius);
        expect(Number.isInteger(source)).toBe(true);
        expect(source).toBe(Math.round(radius * WHEEL_DISC_RATIO));
        expect(display.wheels[index].discRadius).toBeCloseTo(source * display.scale, 9);
        // Le disque reste dans le pneu : le contour extérieur dessiné ne bouge pas.
        expect(display.wheels[index].discRadius).toBeLessThan(display.wheels[index].rollRadius * 0.8);
      });
    }
  });

  it("place les deux roues d'un véhicule sur le même axe horizontal", () => {
    for (const spec of ALL_SPECS) {
      const [front, rear] = vehicleDisplay(spec).wheels;
      expect(Math.abs(front.y - rear.y)).toBeLessThan(1.5);
      expect(rear.x).toBeGreaterThan(front.x);
    }
  });

  it("garde le centre de chaque roue fixe par rapport à la carrosserie : constant, miroir exact", () => {
    for (const spec of TRAFFIC_SPECS) {
      const display = vehicleDisplay(spec);
      for (const index of [0, 1]) {
        const normal = wheelOffset(display, index, false);
        const mirrored = wheelOffset(display, index, true);
        // Décalage constant : appelé à tout instant, il renvoie la même valeur.
        for (let call = 0; call < 50; call += 1) expect(wheelOffset(vehicleDisplay(spec), index, false)).toEqual(normal);
        expect(mirrored.x).toBeCloseTo(-normal.x, 9);
        expect(mirrored.y).toBeCloseTo(normal.y, 9);
      }
    }
  });

  it("n'applique aucune variation d'échelle : le rayon du disque est une constante du catalogue", () => {
    const first = vehicleDisplay(TRAFFIC_SPECS[0]).wheels.map((wheel) => wheel.discRadius);
    for (let index = 0; index < 100; index += 1) {
      expect(vehicleDisplay(TRAFFIC_SPECS[0]).wheels.map((wheel) => wheel.discRadius)).toEqual(first);
    }
  });
});

describe("roues : Δθ = Δdistance / r", () => {
  it("convertit une distance en angle au signe du déplacement", () => {
    expect(rollAngle(10, 5)).toBe(2);
    expect(rollAngle(-10, 5)).toBe(-2);
    expect(rollAngle(0, 5)).toBe(0);
  });

  it("suit exactement la distance réellement parcourue par chaque véhicule, dans le bon sens", () => {
    const manager = fixedManager(4);
    const same = place(manager, 0, { lane: "same", x: 3000, speed: 120, cruise: 120 });
    const oncoming = place(manager, 1, { lane: "oncoming", x: 3800, speed: 90, cruise: 90 });
    const startSame = same.x;
    const startOncoming = oncoming.x;
    for (let frame = 0; frame < 90; frame += 1) manager.update(FRAME, { viewMinX: 2700, viewMaxX: 3900 });
    expect(same.wheelAngle).toBeGreaterThan(0);
    expect(oncoming.wheelAngle).toBeLessThan(0);
    expect(same.wheelAngle).toBeCloseTo((same.x - startSame) / same.rollRadius, 6);
    expect(oncoming.wheelAngle).toBeCloseTo((oncoming.x - startOncoming) / oncoming.rollRadius, 6);
  });

  it("rend l'incrément d'angle par image proportionnel à la vitesse, sans à-coup, à plusieurs vitesses", () => {
    for (const cruise of [70, 100, 135, 155]) {
      const manager = fixedManager(2);
      const vehicle = place(manager, 0, { x: 3000, speed: cruise, cruise });
      let previous = vehicle.wheelAngle;
      for (let frame = 0; frame < 60; frame += 1) {
        manager.update(FRAME, { viewMinX: 2700, viewMaxX: 3600 });
        const expected = (cruise * FRAME) / vehicle.rollRadius;
        expect(vehicle.wheelAngle - previous).toBeCloseTo(expected, 6);
        previous = vehicle.wheelAngle;
      }
    }
  });

  it("inverse le sens de roulement de Léo en marche arrière et le stoppe à l'arrêt", () => {
    const radius = vehicleDisplay(LEO_SPEC_RIGHT).wheels[0].rollRadius;
    let state: LeoMotionState = { ...START_POSITION, x: 600, speed: 0, heading: 0, steeringAngle: 0 };
    let spin = 0;
    const step = (input: Partial<{ forward: boolean; brake: boolean; reverse: boolean }>) => {
      state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: false, ...input }, FRAME);
      spin += rollAngle(state.speed * FRAME, radius);
    };
    for (let frame = 0; frame < 30; frame += 1) step({ forward: true });
    expect(spin).toBeGreaterThan(0);
    // Freiner jusqu'à l'arrêt, puis relâcher : pas encore de marche arrière.
    for (let frame = 0; frame < 90 && state.speed > 0; frame += 1) step({ brake: true });
    expect(state.speed).toBe(0);
    const stopped = spin;
    step({});
    expect(spin).toBe(stopped);
    for (let frame = 0; frame < 120; frame += 1) step({ reverse: true });
    expect(state.speed).toBeLessThan(0);
    const before = spin;
    for (let frame = 0; frame < 30; frame += 1) step({ reverse: true });
    expect(spin).toBeLessThan(before);
  });
});

describe("indépendance des véhicules", () => {
  it("laisse le trafic poursuivre normalement quand Léo freine", () => {
    const manager = fixedManager(6);
    const leoX = 3000;
    const oncoming = place(manager, 1, { lane: "oncoming", x: leoX + 500, speed: 120, cruise: 120 });
    const ahead = place(manager, 0, { lane: "same", x: leoX + 700, speed: 105, cruise: 105 });
    const behind = place(manager, 2, { lane: "same", x: leoX - 1100, speed: 110, cruise: 110 });
    let leo: LeoMotionState = { ...START_POSITION, x: leoX, speed: 260, heading: 0, steeringAngle: 0 };
    const speeds: number[] = [];
    for (let frame = 0; frame < 120; frame += 1) {
      // Léo freine jusqu'à l'arrêt (Freiner maintenu plus longtemps déclencherait la marche arrière).
      leo = updateLeoMotion(leo, { left: false, right: false, forward: false, brake: leo.speed > 0 }, FRAME);
      speeds.push(leo.speed);
      manager.update(FRAME, {
        viewMinX: leoX - 450,
        viewMaxX: leoX + 450,
        leo: { pose: { x: leo.x, y: leo.y, heading: 0 }, speed: leo.speed },
      });
      expect(oncoming.speed).toBe(120);
      expect(ahead.speed).toBe(105);
      expect(behind.speed).toBeGreaterThan(105);
    }
    expect(leo.speed).toBe(0);
    for (let index = 1; index < speeds.length; index += 1) expect(speeds[index]).toBeLessThanOrEqual(speeds[index - 1]);
  });

  it("garde un état propre à chaque véhicule : en immobiliser un n'arrête pas les autres", () => {
    const manager = fixedManager(6);
    const stoppedCar = place(manager, 0, { lane: "same", x: 4000, speed: 0, cruise: 0 });
    const otherSame = place(manager, 2, { lane: "same", x: 5200, speed: 100, cruise: 100 });
    const otherLane = place(manager, 1, { lane: "oncoming", x: 4300, speed: 110, cruise: 110 });
    expect(new Set(manager.vehicles).size).toBe(manager.vehicles.length);
    const stoppedAngle = stoppedCar.wheelAngle;
    const otherAngle = otherSame.wheelAngle;
    for (let frame = 0; frame < 60; frame += 1) manager.update(FRAME, { viewMinX: 3700, viewMaxX: 5500 });
    expect(stoppedCar.speed).toBe(0);
    expect(stoppedCar.wheelAngle).toBe(stoppedAngle);
    expect(otherSame.speed).toBe(100);
    expect(otherSame.wheelAngle).toBeGreaterThan(otherAngle);
    expect(otherLane.speed).toBe(110);
    expect(otherLane.wheelAngle).toBeLessThan(0);
  });

  it("n'arrête les roues d'un véhicule que lorsque son propre véhicule est à l'arrêt", () => {
    const manager = fixedManager(4);
    place(manager, 0, { lane: "same", x: 3000, speed: 0, cruise: 0 });
    const follower = place(manager, 2, { lane: "same", x: 2000, speed: 110, cruise: 110 });
    let previousAngle = follower.wheelAngle;
    for (let frame = 0; frame < 60 * 40; frame += 1) {
      manager.update(FRAME, { viewMinX: 1800, viewMaxX: 3300 });
      if (follower.speed > 0) expect(follower.wheelAngle).toBeGreaterThanOrEqual(previousAngle);
      else expect(follower.wheelAngle).toBe(previousAngle);
      previousAngle = follower.wheelAngle;
    }
    expect(follower.speed).toBe(0);
  });
});

describe("freinage progressif, sans rebond élastique", () => {
  it("fait décroître la vitesse de façon monotone jusqu'à zéro derrière un véhicule arrêté", () => {
    for (const startSpeed of [70, 110, 155]) {
      const manager = fixedManager(4);
      const leader = place(manager, 0, { lane: "same", x: 3200, speed: 0, cruise: 0 });
      const follower = place(manager, 2, { lane: "same", x: 2200, speed: startSpeed, cruise: startSpeed });
      let previous = follower.speed;
      let minGap = Infinity;
      for (let frame = 0; frame < 60 * 60; frame += 1) {
        manager.update(FRAME, { viewMinX: 1900, viewMaxX: 3500 });
        expect(follower.speed).toBeLessThanOrEqual(previous + 1e-9);
        expect(follower.speed).toBeGreaterThanOrEqual(0);
        previous = follower.speed;
        minGap = Math.min(minGap, bumperGap(follower, leader));
      }
      expect(follower.speed).toBe(0);
      expect(minGap).toBeGreaterThan(8);
      expect(follower.x).toBeLessThan(leader.x);
    }
  });

  it("borne la décélération : jamais de saut de vitesse d'une image à l'autre", () => {
    const manager = fixedManager(4);
    place(manager, 0, { lane: "same", x: 3200, speed: 0, cruise: 0 });
    const follower = place(manager, 2, { lane: "same", x: 2400, speed: 150, cruise: 150 });
    let previous = follower.speed;
    for (let frame = 0; frame < 60 * 30; frame += 1) {
      manager.update(FRAME, { viewMinX: 2000, viewMaxX: 3500 });
      expect(Math.abs(follower.speed - previous)).toBeLessThanOrEqual(420 * FRAME + 1e-9);
      previous = follower.speed;
    }
  });

  it("freine Léo de façon monotone jusqu'à l'immobilisation", () => {
    let state: LeoMotionState = { ...START_POSITION, x: 600, speed: 260, heading: 0, steeringAngle: 0 };
    let previous = state.speed;
    for (let frame = 0; frame < 60; frame += 1) {
      state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: true }, FRAME);
      expect(state.speed).toBeLessThanOrEqual(previous);
      previous = state.speed;
      if (state.speed === 0) break;
    }
    expect(state.speed).toBe(0);
  });

  it("garde la direction de chaque voie constante", () => {
    expect(laneDirection("same")).toBe(1);
    expect(laneDirection("oncoming")).toBe(-1);
  });
});
