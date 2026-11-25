import { describe, expect, it } from "vitest";

import { consistLength, consistMass, createConsist, poseVehicle, vehicleFronts, VEHICLES } from "../../src/domain/consist";
import { createNetwork, isUnderground, stationsOn } from "../../src/domain/network";
import { brakingDistance, initialState, reverse, stepTrain, type DriverInput } from "../../src/domain/physics";
import { buildTrack, trackFrame } from "../../src/domain/track";

const network = createNetwork();
const main = network.routes.main;
const branch = network.routes.branch;

const drive = (state: ReturnType<typeof initialState>, input: Partial<DriverInput>, seconds: number, consist = createConsist(4, 6), track = main) => {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) s = stepTrain(s, { throttle: false, brake: false, emergency: false, ...input }, consist, track, 1 / 60, 50, track.length - 1);
  return s;
};

describe("tracé", () => {
  it("mesure la voie en mètres de rail et ne casse jamais son cap", () => {
    expect(main.length).toBeCloseTo(2820, 5);
    for (let i = 1; i < main.samples.length; i += 1) {
      const a = main.samples[i - 1];
      const b = main.samples[i];
      expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeCloseTo(b.s - a.s, 3);
      expect(Math.abs(b.heading - a.heading)).toBeLessThan(0.01);
    }
  });

  it("raccorde les courbes par une clothoïde (courbure linéaire) et incline la voie vers l'intérieur", () => {
    const track = buildTrack({ x: 0, y: 0, z: 0, heading: 0 }, [{ length: 50, curvature: 0 }, { length: 100, curvature: 0.01, ramp: 40 }], [{ length: 150, grade: 0 }]);
    expect(track.pointAt(70).curvature).toBeCloseTo(0.005, 3);
    expect(track.pointAt(120).curvature).toBeCloseTo(0.01, 5);
    const p = track.pointAt(120);
    expect(p.cant).toBeGreaterThan(0);
    // Le rail extérieur (gauche, dans une courbe à droite) est plus haut que le rail intérieur.
    const { right } = trackFrame(p);
    expect(right[1]).toBeLessThan(0);
  });

  it("monte et descend : le pont de la gorge est plus haut que la gare de départ, la gare du village plus basse que le col", () => {
    const gorge = network.structures.find((st) => st.kind === "truss-bridge")!;
    const col = network.stations.find((st) => st.id === "col")!;
    const village = network.stations.find((st) => st.id === "village-1")!;
    expect(main.pointAt(gorge.from).y).toBeGreaterThan(main.pointAt(100).y + 8);
    expect(main.pointAt(village.stop).y).toBeLessThan(main.pointAt(col.stop).y - 4);
  });

  it("enchaîne montagne, pont et montagne : on sort d'un tunnel sur le pont, on entre dans l'autre à sa sortie", () => {
    const [kibo, dent] = network.structures.filter((st) => st.kind === "rock-tunnel");
    const gorge = network.structures.find((st) => st.kind === "truss-bridge")!;
    expect(gorge.from - kibo.to).toBeLessThan(10);
    expect(dent.from - gorge.to).toBeLessThan(10);
    expect(gorge.to - gorge.from).toBeGreaterThan(150);
    const viaduct = network.structures.find((st) => st.kind === "stone-viaduct")!;
    expect(viaduct.to - viaduct.from).toBeGreaterThan(350);
  });

  it("dévie la branche à l'aiguillage : même voie avant, voie parallèle à 9 m après", () => {
    for (const s of [100, 900, network.switchAt - 1]) expect(branch.pointAt(s)).toEqual(main.pointAt(s));
    const a = main.pointAt(main.length - 30);
    const b = branch.pointAt(main.length - 30);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(network.trackSpacing, 0);
    expect(Math.abs(a.heading - b.heading)).toBeLessThan(1e-6);
    expect(network.trackSpacing).toBeGreaterThan(8.5);
  });

  it("repère les passages sous terre", () => {
    for (const st of network.structures) expect(isUnderground(network, (st.from + st.to) / 2)).toBe(st.kind === "rock-tunnel" || st.kind === "gallery");
    expect(isUnderground(network, 116)).toBe(false);
  });
});

describe("wagons sur la voie", () => {
  it("pose chaque wagon par ses essieux : dans une courbe, chacun a sa propre direction", () => {
    const consist = createConsist(4, 6);
    const head = 320;
    const headings = vehicleFronts(consist, head).map((front, i) => {
      const pose = poseVehicle(main, consist.vehicles[i].spec, front);
      // Chaque appui est bien sur la voie, et le milieu de la caisse se déporte vers l'intérieur de la courbe.
      const a = main.pointAt(front - consist.vehicles[i].spec.pivots[0]);
      const b = main.pointAt(front - consist.vehicles[i].spec.pivots[1]);
      expect(pose.position[0]).toBeCloseTo((a.x + b.x) / 2, 6);
      return Math.atan2(pose.forward[0], pose.forward[2]);
    });
    for (let i = 1; i < headings.length; i += 1) expect(headings[i - 1] - headings[i]).toBeGreaterThan(0.01);
    expect(consistLength(consist)).toBeCloseTo(VEHICLES.locomotive.length + VEHICLES.tender.length + 4 * VEHICLES.wagon.length, 6);
  });
});

describe("physique", () => {
  it("accélère progressivement, moins vite quand le train est chargé", () => {
    const empty = drive(initialState(116), { throttle: true }, 10, createConsist(4, 0));
    const loaded = drive(initialState(116), { throttle: true }, 10, createConsist(4, 6));
    expect(empty.speed).toBeGreaterThan(loaded.speed);
    expect(loaded.speed).toBeGreaterThan(2);
    expect(consistMass(createConsist(4, 6)) - consistMass(createConsist(4, 0))).toBe(4 * 6 * 320);
  });

  it("garde son élan (inertie) et freine sur une distance proche de v² / 2a", () => {
    const consist = createConsist(4, 6);
    let state = { ...initialState(200), speed: 12 };
    const coasting = drive(state, {}, 5, consist);
    expect(coasting.speed).toBeGreaterThan(11);
    state = { ...initialState(200), speed: 12, brake: 1 };
    const start = state.head;
    while (state.speed > 0) state = stepTrain(state, { throttle: false, brake: true, emergency: false }, consist, main, 1 / 60, 0, main.length);
    const distance = state.head - start;
    expect(distance).toBeGreaterThan(brakingDistance(12) * 0.8);
    expect(distance).toBeLessThan(brakingDistance(12) * 1.1);
  });

  it("ralentit en montée, accélère seul en descente, et le frein le retient en pente", () => {
    const consist = createConsist(4, 6);
    const climbing = drive({ ...initialState(1150), speed: 10 }, {}, 4, consist);
    const flat = drive({ ...initialState(200), speed: 10 }, {}, 4, consist);
    expect(climbing.speed).toBeLessThan(flat.speed - 0.6);
    const rolling = drive({ ...initialState(2450) }, {}, 6, consist);
    expect(rolling.speed).toBeGreaterThan(0.5);
    const held = drive({ ...initialState(2450) }, { brake: true }, 6, consist);
    expect(Math.abs(held.head - 2450)).toBeLessThan(0.3);
  });

  it("fait tourner les roues exactement au rythme de la distance parcourue", () => {
    const state = drive(initialState(116), { throttle: true }, 8);
    expect(state.distance).toBeCloseTo(state.head - 116, 6);
  });

  it("s'arrête contre le heurtoir, et ne change de sens qu'à l'arrêt", () => {
    const moving = { ...initialState(1840), speed: 5 };
    expect(reverse(moving).direction).toBe(1);
    const bumped = stepTrain(moving, { throttle: false, brake: false, emergency: false }, createConsist(4, 6), main, 3, 50, 1850);
    expect(bumped.head).toBe(1850);
    expect(bumped.speed).toBe(0);
    expect(bumped.bumped).toBe(true);
    expect(reverse(bumped).direction).toBe(-1);
    const backwards = drive(reverse(initialState(300)), { throttle: true }, 6);
    expect(backwards.speed).toBeLessThan(-1);
  });

  it("arrête le train au frein d'urgence plus court qu'au frein de service", () => {
    const consist = createConsist(4, 6);
    const run = (emergency: boolean) => {
      let state = { ...initialState(200), speed: 15 };
      const start = state.head;
      for (let i = 0; i < 2000 && (state.speed > 0 || i === 0); i += 1) state = stepTrain(state, { throttle: false, brake: !emergency, emergency }, consist, main, 1 / 60, 0, main.length);
      return state.head - start;
    };
    expect(run(true)).toBeLessThan(run(false));
  });
});

describe("quais par itinéraire", () => {
  it("le départ et la halte du col, avant l'aiguillage, sont sur les deux voies ; le village a un quai par voie", () => {
    const ids = (route: "main" | "branch") => stationsOn(network, route).map((station) => station.id);
    // Voie 1 : départ, col, village. Voie 2 (déviée) : les mêmes avant l'aiguillage, puis le quai de la voie 2.
    expect(ids("main")).toEqual(["depart", "col", "village-1"]);
    expect(ids("branch")).toEqual(["depart", "col", "village-2"]);
  });

  it("les quais communs sont tous avant l'aiguillage : un joueur qui choisit la voie 2 les dessert encore", () => {
    for (const station of stationsOn(network, "branch").filter((st) => st.route === "both")) {
      expect(station.stop).toBeLessThan(network.switchAt);
    }
    // Les trois arrêts comptés par le jeu (départ, col, village) existent donc sur chaque itinéraire.
    for (const route of ["main", "branch"] as const) {
      expect(new Set(stationsOn(network, route).map((st) => st.id.replace(/-\d$/, "")))).toEqual(new Set(["depart", "col", "village"]));
    }
  });
});
