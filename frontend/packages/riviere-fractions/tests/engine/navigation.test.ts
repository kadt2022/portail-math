import { describe, expect, it } from "vitest";

import { createLevelOneLayout, ISLAND_CENTER, ISLAND_HALF_WIDTH, LANE_CENTERS, LANE_HALF_WIDTH, laneOf, maxCurvature, shoreDistance } from "../../src/engine/geometry/layout";
import { DEFAULT_TUNING, initialBoat, lateralBounds, stepBoat, stopBeforeBarrier, type BoatState } from "../../src/engine/navigation/boat";
import { createTraffic, trafficPose } from "../../src/engine/navigation/traffic";
import { CALM_WATER, WAVES, waterHeight } from "../../src/engine/geometry/water";
import { WATER_VERTEX } from "../../src/engine/scene/shaders";

const layout = createLevelOneLayout();
const BOAT_WIDTH = 1.75;
const DT = 1 / 60;

/** Pilote simple : vise un écart d, comme un enfant qui garde le doigt sur ◀ ou ▶. */
function sail(state: BoatState, until: (state: BoatState) => boolean, target: number, onCrossing?: (fork: number, lane: number) => void): BoatState {
  let boat = state;
  for (let i = 0; i < 60 * 600 && !until(boat); i += 1) {
    const error = target - boat.d;
    const step = stepBoat(boat, Math.abs(error) < 0.5 ? 0 : Math.sign(error), DT, layout);
    boat = step.state;
    if (step.crossing) onCrossing?.(step.crossing.fork, step.crossing.lane);
  }
  return boat;
}

describe("Tracé du niveau 1", () => {
  it("compte sept embranchements successifs, dans l'ordre", () => {
    expect(layout.forks).toHaveLength(7);
    layout.forks.forEach((fork, index) => {
      expect(fork.reachStart).toBeLessThan(fork.approachStart);
      expect(fork.approachStart).toBeLessThan(fork.tip);
      expect(fork.tip).toBeLessThan(fork.gate);
      expect(fork.gate).toBeLessThan(fork.barrier);
      expect(fork.barrier).toBeLessThan(fork.islandEnd);
      if (index > 0) expect(fork.reachStart).toBe(layout.forks[index - 1].mergeEnd);
    });
    expect(layout.finish).toBeGreaterThan(layout.forks[6].mergeEnd);
  });

  it("n'impose jamais de virage impossible (rayon d'au moins 60 m)", () => {
    expect(1 / maxCurvature(layout)).toBeGreaterThan(60);
  });

  it("donne à chaque voie au moins trois largeurs de bateau", () => {
    expect(2 * LANE_HALF_WIDTH).toBeGreaterThanOrEqual(3 * BOAT_WIDTH);
    for (const fork of layout.forks) {
      const middle = (fork.tip + fork.islandEnd) / 2;
      const half = layout.halfWidth(middle);
      // Voie de droite : de l'îlot à la berge.
      expect(half - (ISLAND_CENTER + ISLAND_HALF_WIDTH)).toBeGreaterThanOrEqual(3 * BOAT_WIDTH);
      expect(2 * (ISLAND_CENTER - ISLAND_HALF_WIDTH)).toBeGreaterThanOrEqual(3 * BOAT_WIDTH);
      expect(shoreDistance(layout, middle, LANE_CENTERS[0])).toBeGreaterThan(2);
      expect(shoreDistance(layout, middle, LANE_CENTERS[1])).toBeGreaterThan(2);
      expect(shoreDistance(layout, middle, LANE_CENTERS[2])).toBeGreaterThan(2);
    }
  });

  it("ne place des îlots que dans les embranchements", () => {
    expect(layout.islandHalfWidth(layout.forks[0].reachStart + 10)).toBe(0);
    expect(layout.islandHalfWidth(layout.forks[0].tip - 1)).toBe(0);
    expect(layout.islandHalfWidth((layout.forks[0].tip + layout.forks[0].islandEnd) / 2)).toBeCloseTo(ISLAND_HALF_WIDTH);
  });

  it("partage la largeur en trois couloirs à la ligne de décision", () => {
    expect(laneOf(-15)).toBe(0);
    expect(laneOf(-6.9)).toBe(1);
    expect(laneOf(0)).toBe(1);
    expect(laneOf(6.9)).toBe(1);
    expect(laneOf(12)).toBe(2);
  });
});

describe("Navigation du bateau", () => {
  it("attend au ponton tant que les amarres ne sont pas larguées", () => {
    const boat = sail(initialBoat(layout), () => false, 0);
    expect(boat.s).toBe(layout.start);
    expect(boat.speed).toBe(0);
  });

  it.each([0, 1, 2] as const)("la position réelle du bateau choisit la voie %i", (lane) => {
    const crossings: number[][] = [];
    const start = { ...initialBoat(layout), moored: false };
    const boat = sail(start, (state) => state.nextFork > 0, LANE_CENTERS[lane], (fork, chosen) => crossings.push([fork, chosen]));
    expect(crossings).toEqual([[0, lane]]);
    expect(boat.lane).toBe(lane);
    // Entre les îlots, le bateau reste dans sa voie même si l'enfant tire de l'autre côté.
    const stuck = sail(boat, (state) => state.s > layout.forks[0].tip + 20, -LANE_CENTERS[lane] || 20);
    const [low, high] = lateralBounds(stuck, layout, DEFAULT_TUNING);
    expect(stuck.d).toBeGreaterThanOrEqual(low - 0.3);
    expect(stuck.d).toBeLessThanOrEqual(high + 0.3);
  });

  it("ralentit avant un embranchement pour laisser le temps de lire", () => {
    const fork = layout.forks[0];
    const cruising = sail({ ...initialBoat(layout), moored: false }, (state) => state.s > fork.reachStart + 30, 0);
    const approaching = sail(cruising, (state) => state.s > fork.tip - 3, 0);
    expect(cruising.speed).toBeGreaterThan(DEFAULT_TUNING.approachSpeed + 1);
    expect(approaching.speed).toBeLessThanOrEqual(DEFAULT_TUNING.approachSpeed + 0.05);
  });

  it("s'arrête doucement devant le barrage d'une mauvaise voie", () => {
    const fork = layout.forks[0];
    const committed = sail({ ...initialBoat(layout), moored: false }, (state) => state.nextFork > 0, LANE_CENTERS[2]);
    const stopped = sail({ ...committed, stopAt: stopBeforeBarrier(fork) }, () => false, LANE_CENTERS[2]);
    expect(stopped.speed).toBeLessThan(0.05);
    expect(stopped.s).toBeLessThan(fork.barrier - 2);
    expect(stopped.s).toBeGreaterThan(fork.gate);
  });

  it("garde le bateau dans le chenal sans choc", () => {
    const boat = sail({ ...initialBoat(layout), moored: false }, (state) => state.s > 120, 50);
    expect(boat.d).toBeLessThanOrEqual(layout.halfWidth(boat.s) - DEFAULT_TUNING.clearance + 0.3);
  });

  it("s'écarte d'un autre bateau au lieu de le percuter", () => {
    let boat: BoatState = { ...initialBoat(layout), moored: false, s: 80, d: 0.2, speed: 5 };
    for (let i = 0; i < 120; i += 1) boat = stepBoat(boat, 0, DT, layout, [{ s: boat.s + 3, d: 0, radius: 1.3 }]).state;
    expect(Math.abs(boat.d)).toBeGreaterThan(1);
  });
});

describe("Autres bateaux", () => {
  it("ne circulent jamais dans les zones d'embranchement", () => {
    const traffic = createTraffic(layout);
    expect(traffic.length).toBeGreaterThan(5);
    for (const boat of traffic) {
      for (let t = 0; t < 400; t += 2.5) {
        const pose = trafficPose(boat, t);
        expect(layout.forkAt(pose.s)).toBeNull();
        expect(Math.abs(pose.d)).toBeLessThan(layout.halfWidth(pose.s));
      }
    }
  });
});

describe("Eau", () => {
  it("reste calme au niveau 1 : vagues de quelques centimètres", () => {
    const bound = WAVES.reduce((sum, wave) => sum + CALM_WATER.amplitude * wave.weight, 0);
    for (let x = -20; x <= 20; x += 3.7) {
      for (let t = 0; t < 10; t += 0.9) expect(Math.abs(waterHeight(x, x * 1.3, t, CALM_WATER))).toBeLessThanOrEqual(bound + 1e-9);
    }
    expect(bound).toBeLessThan(0.15);
  });

  it("utilise dans le shader les mêmes vagues que pour faire flotter les bateaux", () => {
    for (const wave of WAVES) expect(WATER_VERTEX).toContain(wave.length.toFixed(3));
  });
});
