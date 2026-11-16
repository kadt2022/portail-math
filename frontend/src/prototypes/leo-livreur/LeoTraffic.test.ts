import { describe, expect, it } from "vitest";

import { updateLeoMotion, type LeoMotionState } from "./leoDriving";
import {
  isFootprintInLane,
  LANE_WIDTH,
  MAIN_LANE_Y,
  ONCOMING_LANE_Y,
  ROAD_HALF_WIDTH,
  ROAD_Y,
  START_POSITION,
  VEHICLE_LENGTH,
  VEHICLE_WIDTH,
} from "./leoGeometry";
import {
  bumperGap,
  DensityGovernor,
  initialLaneCap,
  laneDirection,
  laneY,
  OFFSCREEN_MARGIN,
  TrafficManager,
  vehicleBounds,
  type TrafficContext,
  type TrafficVehicle,
} from "./leoTraffic";
import {
  bodyHeightPx,
  bodyLengthPx,
  LEO_LENGTH_PX,
  LEO_SPEC_LEFT,
  LEO_SPEC_RIGHT,
  SPEED_PROFILES,
  TRAFFIC_SPECS,
  vehicleDisplay,
  type VehicleKind,
} from "./leoVehicleCatalog";

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour des simulations reproductibles. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const spec = (kind: VehicleKind) => {
  const found = TRAFFIC_SPECS.find((candidate) => candidate.kind === kind);
  if (!found) throw new Error(kind);
  return found;
};

describe("catalogue : échelle commune de proportions", () => {
  it("prend la voiture de Léo comme référence", () => {
    expect(LEO_SPEC_RIGHT.lengthRatio).toBe(1);
    expect(bodyLengthPx(LEO_SPEC_RIGHT)).toBe(LEO_LENGTH_PX);
    expect(bodyLengthPx(LEO_SPEC_LEFT)).toBe(LEO_LENGTH_PX);
  });

  it("ordonne les gabarits : petites voitures < familiales < minibus < bus scolaire < autobus urbain", () => {
    const length = (kind: VehicleKind) => bodyLengthPx(spec(kind));
    expect(length("compact")).toBeGreaterThan(bodyLengthPx(LEO_SPEC_RIGHT));
    expect(length("family")).toBeGreaterThan(length("compact"));
    expect(length("family")).toBeGreaterThan(bodyLengthPx(LEO_SPEC_RIGHT) * 1.25);
    expect(length("minibus")).toBeGreaterThan(length("family") * 1.2);
    expect(length("school-bus")).toBeGreaterThan(length("minibus") * 1.25);
    expect(length("city-bus")).toBeGreaterThan(length("school-bus") * 1.2);
    expect(length("taxi")).toBeGreaterThan(bodyLengthPx(LEO_SPEC_RIGHT));
  });

  it("rend les autobus visiblement plus imposants : plus longs et plus hauts que toutes les voitures", () => {
    const cars = ["compact", "family", "sedan", "taxi"] as const;
    for (const bus of ["school-bus", "city-bus"] as const) {
      for (const car of cars) {
        expect(bodyLengthPx(spec(bus))).toBeGreaterThan(bodyLengthPx(spec(car)) * 1.5);
      }
    }
    expect(bodyHeightPx(spec("school-bus"))).toBeGreaterThan(bodyHeightPx(spec("family")));
    expect(bodyHeightPx(spec("city-bus"))).toBeGreaterThan(bodyHeightPx(spec("sedan")));
  });

  it("ne déforme aucune illustration : une seule échelle par sprite", () => {
    for (const vehicle of [LEO_SPEC_RIGHT, LEO_SPEC_LEFT, ...TRAFFIC_SPECS]) {
      const display = vehicleDisplay(vehicle);
      expect(display.width / display.height).toBeCloseTo(vehicle.source.width / vehicle.source.height, 6);
      expect(display.scale).toBeCloseTo(display.width / vehicle.source.width, 9);
    }
  });

  it("garde les roues dessinées à l'intérieur de la carrosserie, de même rayon à l'écran que sur le sprite", () => {
    for (const vehicle of [LEO_SPEC_RIGHT, LEO_SPEC_LEFT, ...TRAFFIC_SPECS]) {
      const [x0, , x1] = vehicle.bbox;
      for (const [wx, , radius] of vehicle.wheels) {
        expect(wx - radius).toBeGreaterThanOrEqual(x0 - 4);
        expect(wx + radius).toBeLessThanOrEqual(x1 + 4);
      }
      const display = vehicleDisplay(vehicle);
      expect(display.wheels).toHaveLength(2);
      for (const wheel of display.wheels) {
        expect(wheel.discRadius).toBeGreaterThan(5);
        expect(wheel.discRadius).toBeLessThan(wheel.rollRadius * 1.01);
      }
    }
  });
});

describe("positionnement dans la voie", () => {
  const margin = 24;
  const edgeY = (laneCenter: number, towardEdge: 1 | -1) => laneCenter + towardEdge * LANE_WIDTH / 2;

  it("centre la voie de Léo entre la ligne centrale et la bordure", () => {
    expect(MAIN_LANE_Y - ROAD_Y).toBe(LANE_WIDTH / 2);
    expect(ROAD_Y + ROAD_HALF_WIDTH - MAIN_LANE_Y).toBe(LANE_WIDTH / 2);
    expect(ROAD_Y - ONCOMING_LANE_Y).toBe(LANE_WIDTH / 2);
    expect(START_POSITION.y).toBe(MAIN_LANE_Y);
  });

  it("laisse une marge visible entre les pneus de Léo et la bordure, comme avec la ligne centrale", () => {
    for (const leo of [LEO_SPEC_RIGHT, LEO_SPEC_LEFT]) {
      const display = vehicleDisplay(leo);
      // Bas des pneus = centre logique + profondeur / 2 (par construction de offsetY).
      const tireBottom = START_POSITION.y + display.offsetY + (leo.ground - (leo.bbox[1] + (leo.bbox[3] - leo.bbox[1] + 1) / 2)) * display.scale;
      expect(tireBottom).toBeCloseTo(START_POSITION.y + VEHICLE_WIDTH / 2, 6);
      expect(edgeY(MAIN_LANE_Y, 1) - tireBottom).toBeGreaterThanOrEqual(margin);
      expect(tireBottom - ROAD_Y).toBeGreaterThanOrEqual(margin);
      // Les roues entières (disque) restent dans la voie.
      for (const wheel of display.wheels) {
        const wheelBottom = START_POSITION.y + display.offsetY + wheel.y + wheel.rollRadius;
        expect(wheelBottom).toBeLessThanOrEqual(edgeY(MAIN_LANE_Y, 1) - margin + 1);
      }
    }
    expect(isFootprintInLane(START_POSITION.y, VEHICLE_WIDTH, MAIN_LANE_Y, margin)).toBe(true);
  });

  it("contient chaque véhicule du trafic, bus compris, dans sa voie avec une marge", () => {
    for (const vehicle of TRAFFIC_SPECS) {
      const display = vehicleDisplay(vehicle);
      for (const lane of ["same", "oncoming"] as const) {
        expect(isFootprintInLane(laneY(lane), display.footprintDepth, laneY(lane), margin)).toBe(true);
        const tireBottom = laneY(lane) + display.footprintDepth / 2;
        const inner = lane === "same" ? ROAD_Y : ROAD_Y - ROAD_HALF_WIDTH;
        const outer = lane === "same" ? ROAD_Y + ROAD_HALF_WIDTH : ROAD_Y;
        expect(tireBottom + margin).toBeLessThanOrEqual(outer);
        expect(tireBottom - display.footprintDepth - margin).toBeGreaterThanOrEqual(inner - 1);
      }
    }
  });

  it("n'a aucune empreinte qui chevauche la ligne centrale", () => {
    for (const vehicle of TRAFFIC_SPECS) {
      const display = vehicleDisplay(vehicle);
      expect(laneY("same") - display.footprintDepth / 2).toBeGreaterThan(ROAD_Y);
      expect(laneY("oncoming") + display.footprintDepth / 2).toBeLessThan(ROAD_Y);
    }
  });
});

function simulate(options: { seed: number; seconds: number; leoSpeed: number; capacity?: number; laneCap?: number }) {
  const manager = new TrafficManager({ capacity: options.capacity ?? 12, random: seeded(options.seed) });
  if (options.laneCap) manager.laneCap = options.laneCap;
  const frames: Array<{ active: number; overlap: boolean; kinds: Set<string> }> = [];
  const spawns: Array<{ id: number; x: number; length: number; viewMinX: number; viewMaxX: number; kind: string; profile: string }> = [];
  const wasActive = new Map<number, boolean>();
  let leoX = 1500;
  const dt = 1 / 60;
  for (let frame = 0; frame < options.seconds * 60; frame += 1) {
    leoX += options.leoSpeed * dt;
    // Boucle sur 8 km pour rester sur la route pendant les longues simulations.
    if (leoX > 9500) leoX = 1500;
    const context: TrafficContext = {
      viewMinX: leoX - 450,
      viewMaxX: leoX + 450,
      leo: { pose: { x: leoX, y: MAIN_LANE_Y, heading: 0 }, speed: options.leoSpeed },
    };
    manager.update(dt, context);
    let overlap = false;
    const kinds = new Set<string>();
    for (const vehicle of manager.vehicles) {
      if (vehicle.active) kinds.add(vehicle.spec.kind);
      if (vehicle.active && !wasActive.get(vehicle.id)) {
        spawns.push({ id: vehicle.id, x: vehicle.x, length: vehicle.length, viewMinX: context.viewMinX, viewMaxX: context.viewMaxX, kind: vehicle.spec.kind, profile: vehicle.profile });
      }
      wasActive.set(vehicle.id, vehicle.active);
    }
    for (const lane of ["same", "oncoming"] as const) {
      const members = manager.vehicles.filter((vehicle) => vehicle.active && vehicle.lane === lane);
      for (let a = 0; a < members.length; a += 1) {
        for (let b = a + 1; b < members.length; b += 1) if (bumperGap(members[a], members[b]) < 0) overlap = true;
      }
    }
    frames.push({ active: manager.activeCount, overlap, kinds });
  }
  return { manager, frames, spawns };
}

describe("gestionnaire de trafic", () => {
  it("fait circuler plusieurs véhicules simultanément, dans les deux sens", () => {
    const { frames } = simulate({ seed: 7, seconds: 90, leoSpeed: 150 });
    const steady = frames.slice(60 * 20);
    const average = steady.reduce((sum, frame) => sum + frame.active, 0) / steady.length;
    expect(average).toBeGreaterThanOrEqual(4);
    expect(Math.max(...steady.map((frame) => frame.active))).toBeGreaterThanOrEqual(6);
  });

  it("ne superpose jamais deux véhicules d'une même voie", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { frames } = simulate({ seed, seconds: 120, leoSpeed: seed % 2 ? 0 : 200 });
      expect(frames.some((frame) => frame.overlap)).toBe(false);
    }
  });

  it("maintient chaque véhicule dans sa voie et dans le bon sens", () => {
    const { manager } = simulate({ seed: 11, seconds: 60, leoSpeed: 120 });
    for (const vehicle of manager.vehicles.filter((candidate) => candidate.active)) {
      const box = vehicleBounds(vehicle);
      expect(isFootprintInLane(laneY(vehicle.lane), box.maxY - box.minY, laneY(vehicle.lane))).toBe(true);
      expect(laneDirection(vehicle.lane)).toBe(vehicle.lane === "same" ? 1 : -1);
      if (vehicle.lane === "same") expect(box.minY).toBeGreaterThan(ROAD_Y);
      else expect(box.maxY).toBeLessThan(ROAD_Y);
    }
  });

  it("répartit les types de véhicules et les profils de vitesse", () => {
    const { frames, spawns } = simulate({ seed: 21, seconds: 240, leoSpeed: 140 });
    const kinds = new Set<string>();
    for (const frame of frames) for (const kind of frame.kinds) kinds.add(kind);
    expect(kinds.size).toBeGreaterThanOrEqual(6);
    for (const wanted of ["taxi", "minibus", "school-bus", "city-bus"]) expect(kinds.has(wanted)).toBe(true);
    expect(new Set(spawns.map((spawn) => spawn.profile)).size).toBe(3);
    const [low] = SPEED_PROFILES.slow;
    const [, high] = SPEED_PROFILES.fast;
    expect(low).toBeGreaterThan(40);
    expect(high).toBeLessThan(500);
  });

  it("augmente les paliers d'environ 25 % sans uniformiser le trafic", () => {
    expect(SPEED_PROFILES.slow[0]).toBeGreaterThanOrEqual(Math.round(170 * 1.25));
    expect(SPEED_PROFILES.normal[0]).toBeGreaterThanOrEqual(Math.round(240 * 1.25));
    expect(SPEED_PROFILES.fast[0]).toBeGreaterThanOrEqual(Math.round(330 * 1.25));
    expect(SPEED_PROFILES.slow[1]).toBeLessThan(SPEED_PROFILES.normal[0]);
    expect(SPEED_PROFILES.normal[1]).toBeLessThan(SPEED_PROFILES.fast[0]);
    expect(SPEED_PROFILES.fast[1]).toBeGreaterThan(SPEED_PROFILES.slow[1]);
  });

  it("ne fait jamais apparaître un véhicule dans la zone visible, donc jamais devant Léo", () => {
    const { spawns } = simulate({ seed: 33, seconds: 180, leoSpeed: 160 });
    expect(spawns.length).toBeGreaterThan(20);
    for (const spawn of spawns) {
      const half = spawn.length / 2;
      expect(spawn.x + half < spawn.viewMinX || spawn.x - half > spawn.viewMaxX).toBe(true);
      expect(Math.min(Math.abs(spawn.x - spawn.viewMinX), Math.abs(spawn.x - spawn.viewMaxX))).toBeGreaterThan(OFFSCREEN_MARGIN * 0.9);
    }
  });

  it("recycle les véhicules sortis de l'écran : le pool est réutilisé, sans en créer", () => {
    const { manager, spawns } = simulate({ seed: 5, seconds: 240, leoSpeed: 150, capacity: 12 });
    expect(manager.vehicles).toHaveLength(12);
    expect(spawns.length).toBeGreaterThan(manager.vehicles.length * 2);
    const perId = new Map<number, number>();
    for (const spawn of spawns) perId.set(spawn.id, (perId.get(spawn.id) ?? 0) + 1);
    expect(Math.max(...perId.values())).toBeGreaterThanOrEqual(3);
  });

  it("continue de circuler quand Léo est arrêté", () => {
    const { manager } = simulate({ seed: 8, seconds: 5, leoSpeed: 0 });
    const before = manager.vehicles.filter((vehicle) => vehicle.active).map((vehicle) => [vehicle.id, vehicle.x] as const);
    expect(before.length).toBeGreaterThan(0);
    const context: TrafficContext = { viewMinX: 1050, viewMaxX: 1950, leo: { pose: { x: 1500, y: MAIN_LANE_Y, heading: 0 }, speed: 0 } };
    for (let frame = 0; frame < 120; frame += 1) manager.update(1 / 60, context);
    const moved = before.filter(([id, x]) => {
      const vehicle = manager.vehicles[id];
      return vehicle.active && Math.abs(vehicle.x - x) > 20;
    });
    expect(moved.length).toBeGreaterThan(0);
  });

  it("fait tourner les roues dans le sens du déplacement et les arrête à vitesse nulle", () => {
    const manager = new TrafficManager({ capacity: 4, random: seeded(3) });
    const context: TrafficContext = { viewMinX: 3000, viewMaxX: 3900 };
    for (let frame = 0; frame < 60 * 30; frame += 1) manager.update(1 / 60, context);
    const same = manager.vehicles.find((vehicle) => vehicle.active && vehicle.lane === "same");
    const oncoming = manager.vehicles.find((vehicle) => vehicle.active && vehicle.lane === "oncoming");
    expect(same && oncoming).toBeTruthy();
    if (!same || !oncoming) return;
    same.wheelAngle = 0;
    oncoming.wheelAngle = 0;
    const sameX = same.x;
    const oncomingX = oncoming.x;
    manager.update(1 / 60, context);
    expect(same.wheelAngle).toBeGreaterThan(0);
    expect(oncoming.wheelAngle).toBeLessThan(0);
    // Angle = distance / rayon de roulement, au signe du sens de marche.
    expect(Math.abs(same.wheelAngle)).toBeCloseTo(Math.abs(same.x - sameX) / same.rollRadius, 6);
    expect(Math.abs(oncoming.wheelAngle)).toBeCloseTo(Math.abs(oncoming.x - oncomingX) / oncoming.rollRadius, 6);
    // Plus la vitesse est élevée, plus la roue tourne vite.
    const slow = Math.abs(same.wheelAngle) / (same.speed || 1);
    expect(slow).toBeCloseTo(1 / (60 * same.rollRadius), 4);
  });

  it("s'arrête derrière Léo immobilisé dans sa voie, roues comprises, puis repart avec lui", () => {
    const manager = new TrafficManager({ capacity: 6, random: seeded(9) });
    const leoX = 1500;
    const context = (speed: number, x = leoX): TrafficContext => ({
      viewMinX: x - 450,
      viewMaxX: x + 450,
      leo: { pose: { x, y: MAIN_LANE_Y, heading: 0 }, speed },
    });
    for (let frame = 0; frame < 60 * 60; frame += 1) manager.update(1 / 60, context(0));
    const queued = manager.vehicles.filter((vehicle) => vehicle.active && vehicle.lane === "same" && vehicle.x < leoX);
    expect(queued.length).toBeGreaterThan(0);
    const nearest = queued.reduce((best, vehicle) => (vehicle.x > best.x ? vehicle : best));
    expect(nearest.speed).toBeLessThan(1);
    const angle = nearest.wheelAngle;
    manager.update(1 / 60, context(0));
    expect(nearest.wheelAngle).toBe(angle);
    expect(nearest.x + nearest.length / 2).toBeLessThan(leoX - VEHICLE_LENGTH / 2);
  });

  it("limite la densité au plafond par voie", () => {
    const { frames } = simulate({ seed: 4, seconds: 120, leoSpeed: 150, laneCap: 1 });
    expect(Math.max(...frames.map((frame) => frame.active))).toBeLessThanOrEqual(2);
  });
});

describe("Léo et le trafic", () => {
  it("empêche Léo de traverser un véhicule et de le superposer", () => {
    const manager = new TrafficManager({ capacity: 2, random: seeded(1) });
    const vehicle = manager.vehicles[0];
    Object.assign(vehicle, { active: true, lane: "same", spec: spec("family"), x: 2000, speed: 0, cruise: 0, length: 150, depth: 36, rollRadius: 10 });
    let state: LeoMotionState = { ...START_POSITION, x: 1500, speed: 0, heading: 0, steeringAngle: 0 };
    for (let frame = 0; frame < 600; frame += 1) {
      state = updateLeoMotion(state, { left: false, right: false, forward: true, brake: false }, 1 / 60, (pose) =>
        manager.blocksPose(pose, VEHICLE_LENGTH, VEHICLE_WIDTH));
      expect(manager.blocksPose(state, VEHICLE_LENGTH, VEHICLE_WIDTH)).toBe(false);
    }
    expect(state.x + VEHICLE_LENGTH / 2).toBeLessThanOrEqual(2000 - 75 + 1);
  });

  it("laisse Léo contourner un véhicule lent par la voie opposée", () => {
    const manager = new TrafficManager({ capacity: 2, random: seeded(1) });
    const vehicle = manager.vehicles[0];
    Object.assign(vehicle, { active: true, lane: "same", spec: spec("family"), x: 2000, speed: 0, cruise: 0, length: 150, depth: 36, rollRadius: 10 });
    let state: LeoMotionState = { ...START_POSITION, x: 1700, speed: 0, heading: 0, steeringAngle: 0 };
    const free = (pose: { x: number; y: number; heading: number }) => manager.blocksPose(pose, VEHICLE_LENGTH, VEHICLE_WIDTH);
    const step = (input: Partial<{ left: boolean; right: boolean; forward: boolean; brake: boolean }>) => {
      state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: false, ...input }, 1 / 60, free);
      expect(free(state)).toBe(false);
    };
    for (let frame = 0; frame < 40; frame += 1) step({ forward: true });
    for (let frame = 0; frame < 40 && state.heading > -0.5; frame += 1) step({ forward: true, left: true });
    for (let frame = 0; frame < 200 && state.x < 2400; frame += 1) step({ forward: true, right: state.heading < 0 });
    expect(state.x).toBeGreaterThan(2200);
  });

  it("garde l'empreinte de Léo à l'écart du trafic opposé quand il reste dans sa voie", () => {
    const manager = new TrafficManager({ capacity: 2, random: seeded(1) });
    Object.assign(manager.vehicles[1], { active: true, lane: "oncoming", spec: spec("city-bus"), x: 1500, speed: 0, cruise: 0, length: 280, depth: 44, rollRadius: 10 });
    expect(manager.blocksPose({ ...START_POSITION, x: 1500, heading: 0 }, VEHICLE_LENGTH, VEHICLE_WIDTH)).toBe(false);
    expect(manager.blocksPose({ x: 1500, y: ONCOMING_LANE_Y, heading: 0 }, VEHICLE_LENGTH, VEHICLE_WIDTH)).toBe(true);
  });
});

describe("mesure de fluidité et densité adaptative", () => {
  it("réduit la densité quand les images sont lentes et la rétablit quand elles redeviennent rapides", () => {
    const governor = new DensityGovernor(4, { min: 1, max: 6 });
    for (let index = 0; index < 600; index += 1) governor.record(40);
    expect(governor.cap).toBe(1);
    for (let index = 0; index < 3000; index += 1) governor.record(11);
    expect(governor.cap).toBe(6);
  });

  it("démarre plus prudemment sur téléphone", () => {
    expect(initialLaneCap(390)).toBeLessThan(initialLaneCap(1200));
    expect(initialLaneCap(390)).toBeGreaterThanOrEqual(1);
  });
});


describe("vitesse de Léo adaptée au trafic", () => {
  const pose = { x: 3000, y: MAIN_LANE_Y, heading: 0 };
  const withVehicle = (patch: Partial<TrafficVehicle>) => {
    const manager = new TrafficManager({ capacity: 2, random: seeded(1) });
    const vehicle = manager.vehicles[0];
    const display = vehicleDisplay(spec("family"));
    Object.assign(vehicle, {
      active: true,
      lane: "same",
      spec: spec("family"),
      x: 3600,
      speed: 200,
      cruise: 200,
      length: display.footprintLength,
      depth: display.footprintDepth,
      rollRadius: 10,
    }, patch);
    return manager;
  };

  it("n'impose aucune limite sur route libre", () => {
    expect(withVehicle({ active: false }).leoSpeedCap(pose)).toBe(Number.POSITIVE_INFINITY);
    // Trop loin devant, dans l'autre voie ou derrière Léo : aucune limite.
    expect(withVehicle({ x: 5000 }).leoSpeedCap(pose)).toBe(Number.POSITIVE_INFINITY);
    expect(withVehicle({ lane: "oncoming", x: 3300 }).leoSpeedCap(pose)).toBe(Number.POSITIVE_INFINITY);
    expect(withVehicle({ x: 2000 }).leoSpeedCap(pose)).toBe(Number.POSITIVE_INFINITY);
  });

  it("descend vers la vitesse du véhicule de devant en s'en approchant, sans jamais être négative", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const x of [3800, 3700, 3600, 3500, 3400, 3300, 3200]) {
      const cap = withVehicle({ x }).leoSpeedCap(pose);
      expect(cap).toBeLessThanOrEqual(previous);
      expect(cap).toBeGreaterThanOrEqual(0);
      previous = cap;
    }
    const close = withVehicle({ x: 3200 }).leoSpeedCap(pose);
    expect(close).toBeLessThan(260);
    expect(close).toBeGreaterThanOrEqual(200);
  });

  it("lève la limite quand Léo sort de la voie pour doubler", () => {
    const overtaking = { ...pose, y: ONCOMING_LANE_Y };
    expect(withVehicle({ x: 3250 }).leoSpeedCap(overtaking)).toBe(Number.POSITIVE_INFINITY);
  });

  it("limite plus fortement face à un véhicule qui vient en sens inverse", () => {
    const head = withVehicle({ lane: "oncoming", x: 3400, speed: 250 }).leoSpeedCap({ ...pose, y: ONCOMING_LANE_Y });
    const same = withVehicle({ lane: "same", x: 3400, speed: 250 }).leoSpeedCap(pose);
    expect(head).toBeLessThan(same);
  });
});
