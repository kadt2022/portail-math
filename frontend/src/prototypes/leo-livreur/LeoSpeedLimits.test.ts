import { describe, expect, it } from "vitest";

import { BRIDGE_END_X, BRIDGE_START_X } from "./leoCityLayout";
import {
  DRIVER_FACTORS,
  ZONE_SPEED_LIMITS_KMH,
  anticipatedLimit,
  speedLimitAt,
} from "./leoSpeedLimits";
import { TrafficManager, type TrafficLane, type TrafficVehicle } from "./leoTraffic";
import { kmhToPx, pxToKmh, pxToMeters } from "./leoUnits";
import { TRAFFIC_SPECS, vehicleDisplay } from "./leoVehicleCatalog";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

const FRAME = 1 / 60;
const sedan = TRAFFIC_SPECS.find((spec) => spec.kind === "sedan") ?? TRAFFIC_SPECS[0];

function driver(lane: TrafficLane, x: number, speedFactor: number, speed: number) {
  const manager = new TrafficManager({ capacity: 2, random: () => 0.5 });
  manager.laneCap = 0;
  const vehicle = manager.vehicles[lane === "same" ? 0 : 1];
  const display = vehicleDisplay(sedan);
  Object.assign(vehicle, {
    active: true, lane, spec: sedan, profile: "normal", x, speed, cruise: speed, speedFactor, wheelAngle: 0,
    length: display.footprintLength, depth: display.footprintDepth, rollRadius: display.wheels[0].rollRadius,
  } satisfies Partial<TrafficVehicle>);
  return { manager, vehicle };
}

const step = (manager: TrafficManager) => manager.update(FRAME, { viewMinX: -1e9, viewMaxX: 1e9 });

describe("limites de vitesse par zone", () => {
  it("fixe une limite à chaque zone : village 50, pont 70, ville 50, école 30 km/h", () => {
    expect(ZONE_SPEED_LIMITS_KMH.village).toBe(50);
    expect(ZONE_SPEED_LIMITS_KMH.boulevard).toBe(40);
    expect(pxToKmh(speedLimitAt(WORLD_ZONE_WIDTH * 0.5))).toBeCloseTo(50, 9);
    expect(pxToKmh(speedLimitAt((BRIDGE_START_X + BRIDGE_END_X) / 2))).toBeCloseTo(70, 9);
    expect(pxToKmh(speedLimitAt(BRIDGE_END_X + 100))).toBeCloseTo(50, 9);
    expect(pxToKmh(speedLimitAt(WORLD_ZONE_WIDTH * 9.5))).toBeCloseTo(30, 9);
  });

  it("anticipe une zone plus lente : la limite à respecter décroît continûment jusqu'au panneau", () => {
    let previous = Infinity;
    for (let x = BRIDGE_START_X; x <= BRIDGE_END_X; x += 10) {
      const limit = anticipatedLimit(x, 1);
      expect(limit).toBeLessThanOrEqual(previous + 1e-9);
      expect(limit).toBeLessThanOrEqual(kmhToPx(70) + 1e-9);
      previous = limit;
    }
    expect(anticipatedLimit(BRIDGE_END_X - 0.01, 1)).toBeCloseTo(kmhToPx(50), 0);
    // Vers une zone plus rapide, aucune anticipation : on garde la limite courante jusqu'au panneau.
    expect(anticipatedLimit(BRIDGE_START_X - 10, 1)).toBeCloseTo(kmhToPx(50), 9);
  });
});

describe("le trafic adapte sa vitesse à la zone", () => {
  it("fait rouler les nouveaux véhicules près de la limite locale, selon le tempérament du conducteur", () => {
    const manager = new TrafficManager({ capacity: 12, random: Math.random });
    manager.laneCap = 6;
    for (let frame = 0; frame < 60 * 6; frame += 1) {
      manager.update(FRAME, { viewMinX: BRIDGE_START_X + 1000, viewMaxX: BRIDGE_START_X + 2100 });
    }
    const cruising = manager.vehicles.filter((vehicle) => vehicle.active);
    expect(cruising.length).toBeGreaterThan(0);
    for (const vehicle of cruising) {
      const [low, high] = DRIVER_FACTORS[vehicle.profile];
      expect(vehicle.speedFactor).toBeGreaterThanOrEqual(low);
      expect(vehicle.speedFactor).toBeLessThanOrEqual(high);
    }
  });

  it("accélère en entrant sur le pont (50 -> 70 km/h)", () => {
    const { manager, vehicle } = driver("same", BRIDGE_START_X - 600, 1, kmhToPx(50));
    let fastest = 0;
    for (let frame = 0; frame < 60 * 12; frame += 1) {
      step(manager);
      if (vehicle.x > BRIDGE_START_X && vehicle.x < BRIDGE_END_X) fastest = Math.max(fastest, pxToKmh(vehicle.speed));
    }
    // Le pont ne mesure que 130 m : le conducteur atteint 70 km/h puis ralentit déjà pour la ville.
    expect(fastest).toBeGreaterThan(65);
    expect(fastest).toBeLessThanOrEqual(70.01);
  });

  it("ralentit avant d'entrer en ville (70 -> 50 km/h), sans coup de frein, et arrive à 50 au panneau", () => {
    const { manager, vehicle } = driver("same", BRIDGE_START_X + 500, 1, kmhToPx(70));
    let worst = 0;
    let atSign: number | null = null;
    let previous = vehicle.speed;
    for (let frame = 0; frame < 60 * 12; frame += 1) {
      const before = vehicle.x + vehicle.length / 2;
      step(manager);
      worst = Math.max(worst, pxToMeters(previous - vehicle.speed) / FRAME);
      previous = vehicle.speed;
      const front = vehicle.x + vehicle.length / 2;
      if (atSign === null && before < BRIDGE_END_X && front >= BRIDGE_END_X) atSign = pxToKmh(vehicle.speed);
    }
    expect(atSign).not.toBeNull();
    expect(atSign as number).toBeLessThanOrEqual(52);
    expect(worst).toBeLessThan(3);
  });

  it("dans l'autre sens aussi : en quittant la ville vers le pont, il accélère, et à l'école il ralentit", () => {
    const { manager, vehicle } = driver("oncoming", BRIDGE_END_X + 400, 1, kmhToPx(50));
    let fastest = 0;
    for (let frame = 0; frame < 60 * 8; frame += 1) {
      step(manager);
      if (vehicle.x > BRIDGE_START_X && vehicle.x < BRIDGE_END_X) fastest = Math.max(fastest, pxToKmh(vehicle.speed));
    }
    expect(fastest).toBeGreaterThan(65);
    const school = driver("same", WORLD_ZONE_WIDTH * 9 - 1500, 1, kmhToPx(50));
    for (let frame = 0; frame < 60 * 10; frame += 1) step(school.manager);
    expect(pxToKmh(school.vehicle.speed)).toBeLessThanOrEqual(31);
  });

  it("garde immobile un véhicule dont la vitesse souhaitée est nulle (consigne d'arrêt), quelle que soit la zone", () => {
    const { manager, vehicle } = driver("same", BRIDGE_START_X + 500, 0, 0);
    vehicle.cruise = 0;
    for (let frame = 0; frame < 120; frame += 1) step(manager);
    expect(vehicle.speed).toBe(0);
  });
});
