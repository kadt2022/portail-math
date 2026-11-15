import { describe, expect, it } from "vitest";

import { BRIDGE_END_X, BRIDGE_START_X, cityLayout } from "./leoCityLayout";
import { SEDAN_TURN_PROFILE } from "./leoDepthVehicle";
import {
  ACCELERATION_MPS2,
  BRAKE_DECELERATION_MPS2,
  CAR_TOP_SPEED,
  CITY_SPEED_LIMIT,
  MAX_SPEED,
  updateLeoMotion,
  type LeoMotionInput,
  type LeoMotionState,
} from "./leoDriving";
import { DESTINATIONS, LANE_WIDTH, MAIN_LANE_Y, ROAD_WIDTH, START_POSITION } from "./leoGeometry";
import {
  GRAVITY,
  PX_PER_METER,
  REFERENCE_CAR,
  kmhToMps,
  kmhToPx,
  metersToPx,
  pxToKmh,
  pxToMeters,
} from "./leoUnits";
import { LEO_LENGTH_PX, TRAFFIC_SPECS, vehicleDisplay } from "./leoVehicleCatalog";

const FRAME = 1 / 60;
const idle: LeoMotionInput = { left: false, right: false, forward: false, brake: false, reverse: false };

function drive(state: LeoMotionState, input: Partial<LeoMotionInput>, seconds: number) {
  let current = state;
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame += 1) {
    const next = updateLeoMotion(current, { ...idle, ...input }, FRAME);
    current = { ...next, brakeLevel: next.brakeLevel ?? 0 };
  }
  return current;
}

const atSpeed = (speed: number): LeoMotionState => ({ x: 1000, y: MAIN_LANE_Y, speed, heading: 0, steeringAngle: 0, brakeLevel: 0 });

describe("échelle du monde : 1 m = 36,96 px", () => {
  it("déduit l'échelle de la voiture de Léo et de la Fiat 500 de référence (3,571 m)", () => {
    expect(PX_PER_METER).toBeCloseTo(LEO_LENGTH_PX / REFERENCE_CAR.lengthMeters, 12);
    expect(PX_PER_METER).toBeCloseTo(36.96, 2);
    expect(pxToMeters(metersToPx(138.89))).toBeCloseTo(138.89, 9);
    expect(kmhToMps(50)).toBeCloseTo(13.8889, 4);
    expect(pxToKmh(kmhToPx(50))).toBeCloseTo(50, 9);
  });

  it("donne des dimensions plausibles aux autres véhicules dessinés à la même échelle (vérification indépendante)", () => {
    const meters = (lengthRatio: number) => pxToMeters(lengthRatio * LEO_LENGTH_PX);
    const byKind = Object.fromEntries(TRAFFIC_SPECS.map((spec) => [spec.kind, meters(spec.lengthRatio)]));
    // Voitures : 3,5 à 5,5 m ; minibus : 5 à 7 m ; bus scolaire : 7 à 10 m ; autobus urbain : 10 à 12,5 m.
    for (const kind of ["compact", "family", "sedan", "taxi"]) {
      expect(byKind[kind]).toBeGreaterThan(3.5);
      expect(byKind[kind]).toBeLessThan(5.5);
    }
    expect(byKind.minibus).toBeGreaterThan(5);
    expect(byKind.minibus).toBeLessThan(7);
    expect(byKind["school-bus"]).toBeGreaterThan(7);
    expect(byKind["school-bus"]).toBeLessThan(10);
    expect(byKind["city-bus"]).toBeGreaterThan(10);
    expect(byKind["city-bus"]).toBeLessThan(12.5);
    expect(pxToMeters(vehicleDisplay(SEDAN_TURN_PROFILE).footprintLength / 0.94)).toBeCloseTo(4.41, 1);
  });

  it("mesure le monde en mètres sans déplacer aucune maison, aucun pont, aucun carrefour", () => {
    expect(pxToMeters(LANE_WIDTH)).toBeCloseTo(2.71, 2);
    expect(pxToMeters(ROAD_WIDTH)).toBeCloseTo(5.41, 2);
    expect(pxToMeters(BRIDGE_END_X - BRIDGE_START_X)).toBeCloseTo(129.9, 1);
    expect(DESTINATIONS[0].stop.x).toBe(750);
    expect(pxToMeters(DESTINATIONS[0].stop.x - START_POSITION.x)).toBeCloseTo(12.2, 1);
    expect(pxToMeters(cityLayout().stopLineEast - START_POSITION.x)).toBeGreaterThan(300);
  });
});

describe("critère de réussite : 50 km/h pendant 10 s = 138,89 m", () => {
  it("parcourt exactement 138,89 m en 10 s à 50 km/h constants, et sa position dans la ville le confirme", () => {
    expect(pxToKmh(CITY_SPEED_LIMIT)).toBeCloseTo(50, 9);
    // 50 km/h maintenus (l'enfant garde Avancer, la vitesse est tenue à 50 km/h).
    let state = atSpeed(CITY_SPEED_LIMIT);
    for (let frame = 0; frame < 600; frame += 1) {
      const next = updateLeoMotion(state, { ...idle, forward: true }, FRAME, undefined, CITY_SPEED_LIMIT);
      state = { ...next, brakeLevel: next.brakeLevel ?? 0 };
    }
    expect(state.speed).toBeCloseTo(CITY_SPEED_LIMIT, 9);
    expect(pxToMeters(state.x - 1000)).toBeCloseTo(138.89, 2);
  });

  it("distingue la vitesse de la route (50 km/h) et celle de la voiture (120 km/h)", () => {
    expect(pxToKmh(CITY_SPEED_LIMIT)).toBeCloseTo(50, 9);
    expect(pxToKmh(MAX_SPEED)).toBeCloseTo(120, 9);
    // Rien n'empêche mécaniquement de dépasser la limite : Avancer maintenu emmène la voiture au-delà de 50 km/h.
    const end = drive(atSpeed(CITY_SPEED_LIMIT), { forward: true }, 5);
    expect(pxToKmh(end.speed)).toBeGreaterThan(55);
    // 120 km/h pendant 10 s : 333,33 m.
    const fast = drive(atSpeed(MAX_SPEED), { forward: true }, 10);
    expect(pxToMeters(fast.x - 1000)).toBeCloseTo(333.33, 2);
  });

  it("donne aussi la bonne distance à 30 km/h (d = v · t) et à 30 images par seconde", () => {
    const at30fps = (() => {
      let state = atSpeed(CITY_SPEED_LIMIT);
      for (let frame = 0; frame < 300; frame += 1) {
        const next = updateLeoMotion(state, { ...idle, forward: true }, 1 / 30, undefined, CITY_SPEED_LIMIT);
        state = { ...next, brakeLevel: next.brakeLevel ?? 0 };
      }
      return pxToMeters(state.x - 1000);
    })();
    expect(at30fps).toBeCloseTo(138.89, 2);
    // 30 km/h imposés par le trafic devant pendant 10 s : 83,33 m.
    let state = atSpeed(kmhToPx(30));
    const x0 = state.x;
    for (let frame = 0; frame < 600; frame += 1) {
      const next = updateLeoMotion(state, { ...idle, forward: true }, FRAME, undefined, kmhToPx(30));
      state = { ...next, brakeLevel: next.brakeLevel ?? 0 };
    }
    expect(pxToMeters(state.x - x0)).toBeCloseTo(83.33, 2);
  });
});

describe("accélération et freinage calés sur la voiture de référence", () => {
  it("reproduit le 0 à 100 km/h de la fiche technique (12,9 s) avec le modèle a(v) = A0 · (1 − v / Vmax)", () => {
    const vTop = kmhToMps(REFERENCE_CAR.topSpeedKmh);
    let v = 0;
    let t = 0;
    const dt = 1 / 1000;
    while (v < kmhToMps(100)) {
      v += ACCELERATION_MPS2 * (1 - v / vTop) * dt;
      t += dt;
    }
    expect(t).toBeCloseTo(REFERENCE_CAR.zeroTo100Seconds, 1);
    expect(ACCELERATION_MPS2).toBeCloseTo(3.38, 2);
    expect(pxToKmh(CAR_TOP_SPEED)).toBeCloseTo(160, 9);
  });

  it("passe de 0 à 50 km/h en environ 4,9 s dans le jeu (avant : 2,8 s)", () => {
    let state = atSpeed(0);
    let t = 0;
    while (state.speed < CITY_SPEED_LIMIT - 1e-9 && t < 20) {
      state = drive(state, { forward: true }, FRAME);
      t += FRAME;
    }
    expect(t).toBeGreaterThan(4.7);
    expect(t).toBeLessThan(5.1);
  });

  it("passe de 0 à 120 km/h en environ 18,2 s (même modèle, sans limitation)", () => {
    let state = atSpeed(0);
    let t = 0;
    while (state.speed < MAX_SPEED - 1e-9 && t < 40) {
      state = drive(state, { forward: true }, FRAME);
      t += FRAME;
    }
    expect(t).toBeGreaterThan(17.8);
    expect(t).toBeLessThan(18.6);
  });

  it("s'arrête depuis 50 km/h en environ 13,4 m, sans dépasser l'adhérence d'un pneu (0,8 g)", () => {
    let state = atSpeed(CITY_SPEED_LIMIT);
    let t = 0;
    while (state.speed > 0 && t < 10) {
      state = drive(state, { brake: true }, FRAME);
      t += FRAME;
    }
    const distance = pxToMeters(state.x - 1000);
    expect(BRAKE_DECELERATION_MPS2).toBeCloseTo(0.8 * GRAVITY, 9);
    // Borne physique : jamais plus court que v² / (2 · 0,8 g) (= 12,3 m), pédale progressive en plus.
    expect(distance).toBeGreaterThan(kmhToMps(50) ** 2 / (2 * BRAKE_DECELERATION_MPS2));
    expect(distance).toBeGreaterThan(12.5);
    expect(distance).toBeLessThan(15);
    expect(t).toBeGreaterThan(1.6);
    expect(t).toBeLessThan(2);
  });

  it("ralentit pied levé d'environ 0,9 m/s² à 50 km/h (frein moteur, roulement, air)", () => {
    const start = atSpeed(CITY_SPEED_LIMIT);
    const next = updateLeoMotion(start, idle, FRAME);
    const deceleration = pxToMeters(start.speed - next.speed) / FRAME;
    expect(deceleration).toBeGreaterThan(0.5);
    expect(deceleration).toBeLessThan(1.2);
  });
});
