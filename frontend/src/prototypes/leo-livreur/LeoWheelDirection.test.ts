import { describe, expect, it } from "vitest";

import { SEDAN_TURN_PROFILE } from "./leoDepthVehicle";
import { TrafficManager, trafficWheelPose, type TrafficLane, type TrafficVehicle } from "./leoTraffic";
import { CROSS_SPECS, TRAFFIC_SPECS, vehicleDisplay, type VehicleSpec } from "./leoVehicleCatalog";

const FRAME = 1 / 60;
const sources = import.meta.glob("./LeoLivreurGame.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

function moving(spec: VehicleSpec, lane: TrafficLane, speed: number) {
  const manager = new TrafficManager({ capacity: 1, random: () => 0.5 });
  manager.laneCap = 0;
  const vehicle = manager.vehicles[0];
  const display = vehicleDisplay(spec);
  Object.assign(vehicle, {
    active: true, lane, spec, profile: "normal", x: 4000, speed, cruise: speed, wheelAngle: 0,
    length: display.footprintLength, depth: display.footprintDepth, rollRadius: display.wheels[0].rollRadius,
  } satisfies Partial<TrafficVehicle>);
  return { manager, vehicle };
}

describe("roues du trafic : sens de rotation à l'écran", () => {
  it("tourne dans le sens horaire vers la droite et antihoraire vers la gauche, quel que soit le retournement de l'image", () => {
    const flips = new Set<boolean>();
    for (const spec of [...TRAFFIC_SPECS, ...CROSS_SPECS, SEDAN_TURN_PROFILE]) {
      for (const lane of ["same", "oncoming"] as const) {
        const { manager, vehicle } = moving(spec, lane, 200);
        const before = trafficWheelPose(vehicle, 0);
        const x0 = vehicle.x;
        for (let frame = 0; frame < 30; frame += 1) manager.update(FRAME, { viewMinX: 0, viewMaxX: 100000 });
        const after = trafficWheelPose(vehicle, 0);
        flips.add(after.flipX);
        const towardRight = vehicle.x > x0;
        // Rotation positive = sens horaire à l'écran (axe y vers le bas dans Phaser).
        expect(Math.sign(after.rotation - before.rotation)).toBe(towardRight ? 1 : -1);
        // Vitesse angulaire proportionnelle au déplacement : angle = distance / rayon.
        expect(Math.abs(after.rotation - before.rotation)).toBeCloseTo(Math.abs(vehicle.x - x0) / vehicle.rollRadius, 6);
        expect(after.rotation).toBe(vehicle.wheelAngle);
      }
    }
    // Les deux cas ont bien été vérifiés : images retournées et non retournées.
    expect([...flips].sort()).toEqual([false, true]);
  });

  it("immobilise les roues à l'arrêt et les fait tourner deux fois plus vite à vitesse double", () => {
    const { manager, vehicle } = moving(TRAFFIC_SPECS[2], "same", 0);
    vehicle.cruise = 0;
    const angle = trafficWheelPose(vehicle, 1).rotation;
    for (let frame = 0; frame < 30; frame += 1) manager.update(FRAME, { viewMinX: 0, viewMaxX: 100000 });
    expect(trafficWheelPose(vehicle, 1).rotation).toBe(angle);
    const spin = (speed: number) => {
      const run = moving(TRAFFIC_SPECS[2], "same", speed);
      run.manager.update(FRAME, { viewMinX: 0, viewMaxX: 100000 });
      return run.vehicle.wheelAngle;
    };
    expect(spin(240) / spin(120)).toBeCloseTo(2, 1);
  });

  it("n'inverse plus la rotation selon l'orientation du sprite dans le rendu", () => {
    const game = Object.values(sources)[0];
    expect(game.includes("flipped ? -vehicle.wheelAngle")).toBe(false);
    expect(game.includes("trafficWheelPose(vehicle, wheelIndex)")).toBe(true);
  });
});
