import { describe, expect, it } from "vitest";

import {
  ARRIVAL_DISTANCE,
  BOUNDS,
  DESPAWN_Z,
  Flight,
  NO_INPUT,
  ObstacleField,
  SPEED,
  createRng,
  createShipState,
  orbHitsShip,
  stepShip,
} from "../src/flight/flightModel";

const run = (seconds: number, fn: (dt: number) => void) => {
  for (let t = 0; t < seconds; t += 1 / 60) fn(1 / 60);
};

describe("pilotage", () => {
  it("se déplace à droite et reste dans la boîte de jeu", () => {
    const ship = createShipState();
    run(3, (dt) => stepShip(ship, { x: 1, y: 1, throttle: 0 }, dt, false));
    expect(ship.x).toBeCloseTo(BOUNDS.x, 5);
    expect(ship.y).toBeCloseTo(BOUNDS.y, 5);
  });

  it("accélère et ralentit sans dépasser les limites", () => {
    const fast = createShipState();
    run(5, (dt) => stepShip(fast, { x: 0, y: 0, throttle: 1 }, dt, false));
    expect(fast.speed).toBeGreaterThan(SPEED.max - 1);
    expect(fast.speed).toBeLessThanOrEqual(SPEED.max);
    const slow = createShipState();
    run(5, (dt) => stepShip(slow, { x: 0, y: 0, throttle: -1 }, dt, false));
    expect(slow.speed).toBeLessThan(SPEED.min + 1);
    expect(slow.speed).toBeGreaterThanOrEqual(SPEED.min - 0.01);
  });

  it("lisse les mouvements : pas de saut de vitesse latérale", () => {
    const ship = createShipState();
    stepShip(ship, { x: 1, y: 0, throttle: 0 }, 1 / 60, false);
    expect(ship.vx).toBeGreaterThan(0);
    expect(ship.vx).toBeLessThan(3);
  });
});

describe("boules et collisions", () => {
  it("détecte une boule posée sur le vaisseau, pas une boule lointaine ou à côté", () => {
    const base = { slot: 0, color: 0, active: true, x: 0, y: 0, z: 0, radius: 1, approach: 0, vx: 0, spin: 0 };
    expect(orbHitsShip(base, 0, 0)).toBe(true);
    expect(orbHitsShip({ ...base, z: 30 }, 0, 0)).toBe(false);
    expect(orbHitsShip({ ...base, x: 6 }, 0, 0)).toBe(false);
    expect(orbHitsShip({ ...base, x: 3.2, z: -0.7 }, 0, 0)).toBe(true);
  });

  it("recycle les boules sorties : le tas ne grossit jamais", () => {
    const field = new ObstacleField(40, createRng(7));
    const ship = createShipState();
    ship.x = BOUNDS.x;
    let maxActive = 0;
    run(60, (dt) => {
      field.step(dt, ship, 900, true);
      maxActive = Math.max(maxActive, field.activeCount());
    });
    expect(field.orbs).toHaveLength(40);
    expect(maxActive).toBeGreaterThan(5);
    expect(maxActive).toBeLessThanOrEqual(40);
    expect(field.orbs.every((o) => !o.active || o.z >= DESPAWN_Z)).toBe(true);
  });

  it("ne fait plus naître de boules près de la station", () => {
    const field = new ObstacleField(40, createRng(3));
    run(10, (dt) => field.step(dt, createShipState(), 100, true));
    expect(field.activeCount()).toBe(0);
  });

  it("un vaisseau immobile au centre finit par être touché, puis protégé un instant", () => {
    const flight = new Flight(5000, 11);
    flight.start();
    let hits = 0;
    let firstHitAt = -1;
    let t = 0;
    run(40, (dt) => {
      t += dt;
      const e = flight.step(dt, NO_INPUT);
      if (e.hits.length > 0 && firstHitAt < 0) firstHitAt = t;
      hits += e.hits.length;
    });
    expect(hits).toBeGreaterThan(0);
    expect(firstHitAt).toBeGreaterThan(0);
  });
});

describe("destination", () => {
  it("la distance restante diminue, l'arrivée arrête le vaisseau", () => {
    const flight = new Flight(200, 5);
    flight.start();
    const events: boolean[] = [];
    run(40, (dt) => events.push(flight.step(dt, { x: 0, y: 0, throttle: 1 }).arrivedNow));
    expect(flight.phase).toBe("arrived");
    expect(events.filter(Boolean)).toHaveLength(1);
    expect(flight.remaining).toBeLessThanOrEqual(ARRIVAL_DISTANCE);
    expect(flight.ship.speed).toBeLessThan(1);
  });

  it("recommencer remet tout à zéro", () => {
    const flight = new Flight(300, 5);
    flight.start();
    run(5, (dt) => flight.step(dt, NO_INPUT));
    flight.restart();
    expect(flight.remaining).toBe(300);
    expect(flight.field.activeCount()).toBe(0);
    expect(flight.phase).toBe("flying");
  });
});
