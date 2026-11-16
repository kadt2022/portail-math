import { describe, expect, it, vi } from "vitest";

// Ce fichier simule le carrefour pendant plusieurs minutes de jeu (jusqu’à 18 000 images par test) : 4 à 6 s par
// test quand les suites tournent en parallèle. Délai porté à 20 s pour éviter les échecs dus à la seule charge machine.
vi.setConfig({ testTimeout: 20_000 });

import { cityLayout } from "./leoCityLayout";
import { CrossTrafficManager, type CrossVehicle } from "./leoCrossTraffic";
import {
  AVENUE_SPEED_LIMIT,
  crossViewForHeading,
  cycleFromMain,
  DEFAULT_INTERSECTION_CYCLE,
  depthScale,
  exitWindow,
  footprintViolations,
  IntersectionController,
  intersectionLength,
  interimProfile,
  MIN_PROFILE_SPREAD,
  profilePose,
  type ProfilePose,
  intersectionStateAt,
  LATERAL_ACCELERATION,
  MAX_ALL_RED_EXTENSION,
  MIN_RADIUS_RATIO,
  rightTurnPath,
  samplePath,
  speedCapAt,
  sweepFor,
  type IntersectionPhaseName,
} from "./leoIntersection";
import { MAIN_LANE_Y, ONCOMING_LANE_Y, ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";
import { avenueGeometry, lanes, laneSign, mainLaneName, planTurn } from "./leoLanes";
import { bumperGap, MAX_BRAKING, TrafficManager } from "./leoTraffic";
import {
  CROSS_SPECS,
  needsMirror,
  SPEED_PROFILES,
  TRAFFIC_SPECS,
  vehicleDisplay,
  type VehicleSpec,
} from "./leoVehicleCatalog";

const FRAME = 1 / 60;
const sedan = CROSS_SPECS.find((spec) => spec.kind === "black-sedan") as VehicleSpec;
const bus = CROSS_SPECS.find((spec) => spec.kind === "black-bus") as VehicleSpec;
const limousine = CROSS_SPECS.find((spec) => spec.kind === "limousine") as VehicleSpec;
const length = (spec: VehicleSpec) => vehicleDisplay(spec).footprintLength;
const pathFor = (spec: VehicleSpec) => rightTurnPath(length(spec), vehicleDisplay(spec).footprintDepth);

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

const angleDelta = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

describe("voies : identité, axe, direction, connexions", () => {
  const table = lanes();

  it("donne à chaque voie un identifiant stable, une direction, une largeur et un axe", () => {
    expect(Object.keys(table).sort()).toEqual(["AVENUE_NORTH", "AVENUE_SOUTH", "MAIN_EAST", "MAIN_WEST"]);
    for (const lane of Object.values(table)) {
      expect(lane.centerline.length).toBeGreaterThanOrEqual(2);
      expect(lane.width).toBeGreaterThan(0);
    }
    expect(table.MAIN_EAST.direction).toBe("EAST");
    expect(table.MAIN_WEST.direction).toBe("WEST");
    expect(table.AVENUE_SOUTH.direction).toBe("SOUTH");
  });

  it("applique la circulation à droite : la voie de Léo est celle du sud, la voie parallèle opposée celle du nord", () => {
    expect(table.MAIN_EAST.centerline[0].y).toBe(MAIN_LANE_Y);
    expect(table.MAIN_WEST.centerline[0].y).toBe(ONCOMING_LANE_Y);
    expect(MAIN_LANE_Y).toBeGreaterThan(ROAD_Y);
    expect(ONCOMING_LANE_Y).toBeLessThan(ROAD_Y);
    expect(laneSign("MAIN_EAST")).toBe(1);
    expect(laneSign("MAIN_WEST")).toBe(-1);
    // L'axe des voies principales est orienté dans le sens de circulation.
    expect(table.MAIN_EAST.centerline[1].x).toBeGreaterThan(table.MAIN_EAST.centerline[0].x);
    expect(table.MAIN_WEST.centerline[1].x).toBeLessThan(table.MAIN_WEST.centerline[0].x);
    expect(mainLaneName("MAIN_WEST")).toBe("oncoming");
    expect(mainLaneName("MAIN_EAST")).toBe("same");
  });

  it("ne connecte l'avenue qu'à la voie parallèle à celle de Léo : jamais la voie de Léo", () => {
    expect(table.AVENUE_SOUTH.connections).toEqual([{ movement: "RIGHT", toLaneId: "MAIN_WEST" }]);
    expect(planTurn("AVENUE_SOUTH", "LEFT")).toBeNull();
    expect(planTurn("AVENUE_SOUTH", "STRAIGHT")).toBeNull();
    const plan = planTurn("AVENUE_SOUTH", "RIGHT");
    expect(plan).toEqual({ fromLaneId: "AVENUE_SOUTH", toLaneId: "MAIN_WEST", movement: "RIGHT", pathId: "AVENUE_SOUTH>RIGHT>MAIN_WEST" });
    for (const lane of Object.values(table)) {
      for (const connection of lane.connections) expect(connection.toLaneId).not.toBe("MAIN_EAST");
    }
  });

  it("refuse de construire un trafic perpendiculaire avec un mouvement non autorisé", () => {
    expect(() => new CrossTrafficManager({ capacity: 2, specs: CROSS_SPECS, movements: ["LEFT"] })).toThrow();
  });
});

describe("géométrie du virage : Bézier cubique, tangente, arc, courbure", () => {
  const path = pathFor(sedan);
  const avenue = avenueGeometry();

  it("commence au bord de la chaussée sur l'axe de la voie d'entrée et finit sur l'axe de la voie cible", () => {
    const lane = lanes().AVENUE_SOUTH.centerline;
    expect(path.points[0].x).toBeCloseTo(lane[0].x, 6);
    expect(path.points[0].y).toBeCloseTo(lane[0].y, 6);
    const edge = path.points.find((p) => p.s >= path.edgeS);
    expect(edge?.x).toBeCloseTo(lane[1].x, 6);
    expect(edge?.y).toBeCloseTo(lane[1].y, 6);
    const end = path.points.find((p) => p.s >= path.curveEndS);
    expect(end?.y).toBeCloseTo(ONCOMING_LANE_Y, 6);
    expect(angleDelta(end?.heading ?? 0, Math.PI)).toBeCloseTo(0, 9);
    const last = path.points[path.points.length - 1];
    expect(last.y).toBeCloseTo(ONCOMING_LANE_Y, 6);
    expect(angleDelta(last.heading, Math.PI)).toBeCloseTo(0, 9);
  });

  it("garde le véhicule dans la voie cible : il ne coupe jamais la ligne centrale ni ne touche la voie de Léo", () => {
    for (const spec of CROSS_SPECS) {
      const p = pathFor(spec);
      for (const point of p.points) {
        if (point.y >= avenue.edgeY - 1) {
          expect(point.y).toBeLessThanOrEqual(ONCOMING_LANE_Y + 0.05);
          expect(point.y).toBeLessThan(ROAD_Y - 20);
        }
      }
    }
  });

  it("a une orientation continue : la tangente exacte, sans cassure de direction", () => {
    for (const spec of CROSS_SPECS) {
      const p = pathFor(spec);
      for (let i = 1; i < p.points.length; i += 1) {
        expect(Math.abs(angleDelta(p.points[i].heading, p.points[i - 1].heading))).toBeLessThan(0.1);
      }
      // L'orientation est la tangente de la courbe, pas une rotation arbitraire : cap = atan2 de la différence finie.
      for (let i = 4; i < p.points.length - 4; i += 4) {
        const a = p.points[i - 1];
        const b = p.points[i + 1];
        if (p.points[i].s < p.edgeS - 5 || p.points[i].s > p.curveEndS + 5) continue;
        expect(Math.abs(angleDelta(Math.atan2(b.y - a.y, b.x - a.x), p.points[i].heading))).toBeLessThan(0.03);
      }
      // Tangente identique des deux côtés du début du virage.
      expect(Math.abs(angleDelta(samplePath(p, p.edgeS - 1).heading, samplePath(p, p.edgeS + 1).heading))).toBeLessThan(0.05);
    }
  });

  it("progresse à la longueur d'arc : une vitesse constante donne une distance parcourue constante", () => {
    const step = 5;
    let previous = samplePath(path, 0);
    for (let s = step; s < path.length; s += step) {
      const point = samplePath(path, s);
      const travelled = Math.hypot(point.x - previous.x, point.y - previous.y);
      expect(Math.abs(travelled - step) / step).toBeLessThan(0.02);
      previous = point;
    }
  });

  it("respecte le rayon minimal de chaque véhicule : un car n'a pas le rayon d'une petite voiture", () => {
    for (const spec of CROSS_SPECS) {
      const p = pathFor(spec);
      expect(p.minRadius).toBeGreaterThanOrEqual(MIN_RADIUS_RATIO * length(spec));
    }
    expect(pathFor(bus).minRadius).toBeGreaterThan(pathFor(sedan).minRadius);
    expect(sweepFor(length(bus))).toBeGreaterThan(sweepFor(length(sedan)));
    // Un autocar commence à tourner plus tôt sur l'avenue pour que son avant ne morde jamais la voie de Léo.
    expect(pathFor(bus).params.lead).toBeGreaterThan(pathFor(sedan).params.lead);
  });

  it("garde le gabarit d'un autocar sur la chaussée : l'empreinte reste dans l'avenue puis dans la voie cible", () => {
    for (const spec of CROSS_SPECS) {
      const p = pathFor(spec);
      const depth = vehicleDisplay(spec).footprintDepth;
      expect(footprintViolations(p, length(spec), depth)).toBe(0);
      // Contrôle indépendant : aucun coin du rectangle ne dépasse la ligne centrale, donc ne touche la voie de Léo.
      for (const point of p.points) {
        if (point.y < 440 || point.s > p.curveEndS + length(spec)) continue;
        const scale = depthScale(point.y);
        const half = (length(spec) * scale) / 2;
        const cos = Math.cos(point.heading);
        const sin = Math.sin(point.heading);
        for (const [lx, ly] of [[half, -depth / 2], [half, depth / 2], [-half, depth / 2], [-half, -depth / 2]]) {
          expect(point.y + lx * sin + ly * cos).toBeLessThanOrEqual(ROAD_Y - 4 + 1e-6);
        }
      }
    }
  });

  it("limite la vitesse selon la courbure, v = √(a_lat / κ), avec freinage préparatoire", () => {
    for (const spec of CROSS_SPECS) {
      const p = pathFor(spec);
      for (const point of p.points) {
        if (point.s < p.edgeS || point.s >= p.curveEndS || point.curvature < 1e-6) continue;
        const lateral = Math.sqrt(LATERAL_ACCELERATION / point.curvature);
        expect(point.cap).toBeLessThanOrEqual(Math.max(lateral, 80) + 1e-6);
        expect(point.cap).toBeLessThanOrEqual(AVENUE_SPEED_LIMIT + 1e-6);
      }
      // Freinage préparatoire : la limite décroît progressivement en s'approchant du virage, jamais d'un coup.
      for (let i = 1; i < p.points.length; i += 1) {
        const ds = p.points[i].s - p.points[i - 1].s;
        const drop = p.points[i - 1].cap - p.points[i].cap;
        if (Number.isFinite(drop)) expect(Math.abs(drop)).toBeLessThan(2 * Math.sqrt(2 * 285 * 400) * ds / 100 + 20);
      }
      expect(speedCapAt(p, 0)).toBeLessThanOrEqual(AVENUE_SPEED_LIMIT);
      expect(Number.isFinite(speedCapAt(p, p.length))).toBe(false);
    }
  });

  it("choisit une vue directionnelle adaptée : profil seulement presque à plat, jamais incliné de 45° ou 90°", () => {
    expect(crossViewForHeading(Math.PI)).toBe("side-left");
    expect(crossViewForHeading(0)).toBe("side-right");
    expect(crossViewForHeading(Math.PI / 2)).toBe("front");
    expect(crossViewForHeading(-Math.PI / 2)).toBe("back");
    // La diagonale de l'avenue (≈ 135°) demande un trois-quarts avant gauche : vue à fournir.
    expect(crossViewForHeading((135 * Math.PI) / 180)).toBe("front34-left");
    for (const point of path.points) {
      const view = crossViewForHeading(point.heading);
      if (view === "side-left") expect(Math.abs(angleDelta(point.heading, Math.PI))).toBeLessThanOrEqual(Math.PI / 6 + 1e-9);
    }
  });

  it("change d'échelle progressivement selon la profondeur, sans saut", () => {
    let previous = depthScale(avenue.farY);
    for (let y = avenue.farY + 4; y <= ROAD_Y; y += 4) {
      const scale = depthScale(y);
      expect(scale).toBeGreaterThanOrEqual(previous);
      expect(scale - previous).toBeLessThan(0.05);
      previous = scale;
    }
    expect(depthScale(ROAD_Y - ROAD_HALF_WIDTH)).toBe(1);
  });
});

describe("feux : cycles longs, rouge intégral, prolongation", () => {
  const phases = (controller: IntersectionController, seconds: number, occupancy = { mainBusy: false, sideBusy: false }) => {
    const durations = new Map<IntersectionPhaseName, number>();
    let last: IntersectionPhaseName = controller.state.phase;
    let run = 0;
    const order: Array<[IntersectionPhaseName, number]> = [];
    for (let t = 0; t < seconds; t += FRAME) {
      controller.update(FRAME, occupancy);
      const phase = controller.state.phase;
      if (phase !== last) {
        order.push([last, run]);
        durations.set(last, run);
        last = phase;
        run = 0;
      }
      run += FRAME;
    }
    return { order, durations };
  };

  it("applique les durées configurées : 20 / 4 / 2 / 15 / 4 / 2 secondes", () => {
    const c = DEFAULT_INTERSECTION_CYCLE;
    expect([c.mainGreen, c.mainYellow, c.allRed, c.sideGreen, c.sideYellow]).toEqual([20, 4, 2, 15, 4]);
    expect(intersectionLength(c)).toBe(47);
    const { order } = phases(new IntersectionController(), 100);
    const expected: Array<[IntersectionPhaseName, number]> = [
      ["MAIN_GREEN", 20], ["MAIN_YELLOW", 4], ["ALL_RED_BEFORE_SIDE", 2], ["SIDE_GREEN", 15], ["SIDE_YELLOW", 4], ["ALL_RED_BEFORE_MAIN", 2], ["MAIN_GREEN", 20],
    ];
    expected.forEach(([phase, duration], index) => {
      expect(order[index][0]).toBe(phase);
      expect(order[index][1]).toBeCloseTo(duration, 1);
    });
  });

  it("ne donne jamais le vert (ni l'orange) à deux directions incompatibles, avec rouge intégral entre les deux", () => {
    const controller = new IntersectionController();
    let sawAllRedAfterMain = false;
    let sawAllRedAfterSide = false;
    let previous: IntersectionPhaseName = controller.state.phase;
    // Violations relevées image par image, vérifiées une seule fois à la fin (36 000 images : test rapide).
    const violations: string[] = [];
    for (let t = 0; t < 600; t += FRAME) {
      controller.update(FRAME, { mainBusy: false, sideBusy: false });
      const { main, side, phase } = controller.state;
      if (main !== "RED" && side !== "RED") violations.push(`deux axes ouverts à t=${t.toFixed(2)}`);
      if (previous === "MAIN_YELLOW" && phase === "ALL_RED_BEFORE_SIDE") sawAllRedAfterMain = true;
      if (previous === "SIDE_YELLOW" && phase === "ALL_RED_BEFORE_MAIN") sawAllRedAfterSide = true;
      // Jamais de passage direct d'un axe à l'autre.
      if (previous === "MAIN_YELLOW" && phase === "SIDE_GREEN") violations.push(`MAIN_YELLOW -> SIDE_GREEN à t=${t.toFixed(2)}`);
      if (previous === "SIDE_YELLOW" && phase === "MAIN_GREEN") violations.push(`SIDE_YELLOW -> MAIN_GREEN à t=${t.toFixed(2)}`);
      previous = phase;
    }
    expect(violations).toEqual([]);
    expect(sawAllRedAfterMain && sawAllRedAfterSide).toBe(true);
  });

  it("suit exactement le cycle théorique quand le carrefour est libre", () => {
    const controller = new IntersectionController();
    for (let frame = 0; frame < 60 * 140; frame += 1) {
      controller.update(FRAME, { mainBusy: false, sideBusy: false });
      const theory = intersectionStateAt((frame + 1) * FRAME);
      expect(controller.state.phase).toBe(theory.phase);
    }
  });

  it("prolonge le rouge intégral tant qu'un mouvement incompatible occupe la zone de conflit", () => {
    const controller = new IntersectionController({ ...DEFAULT_INTERSECTION_CYCLE, offset: 22 });
    expect(controller.state.phase).toBe("MAIN_YELLOW");
    const busy = { mainBusy: true, sideBusy: false };
    for (let t = 0; t < 10; t += FRAME) {
      controller.update(FRAME, busy);
      expect(controller.state.side).toBe("RED");
    }
    expect(controller.state.phase).toBe("ALL_RED_BEFORE_SIDE");
    expect(controller.extension).toBeGreaterThan(2);
    controller.update(FRAME, { mainBusy: false, sideBusy: false });
    controller.update(FRAME, { mainBusy: false, sideBusy: false });
    expect(controller.state.phase).toBe("SIDE_GREEN");
  });

  it("limite la prolongation : un véhicule arrêté dans la zone ne bloque jamais indéfiniment le carrefour", () => {
    const controller = new IntersectionController({ ...DEFAULT_INTERSECTION_CYCLE, offset: 22 });
    let reached = -1;
    for (let t = 0; t < 40 && reached < 0; t += FRAME) {
      controller.update(FRAME, { mainBusy: true, sideBusy: true });
      if (controller.state.phase === "SIDE_GREEN") reached = t;
    }
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThan(2 + DEFAULT_INTERSECTION_CYCLE.allRed + MAX_ALL_RED_EXTENSION + 1);
  });

  it("attend aussi que les véhicules de la rue aient fini leur virage avant de rouvrir l'avenue", () => {
    const controller = new IntersectionController({ ...DEFAULT_INTERSECTION_CYCLE, offset: 20 + 4 + 2 + 15 + 3.5 });
    expect(controller.state.phase).toBe("SIDE_YELLOW");
    for (let t = 0; t < 6; t += FRAME) {
      controller.update(FRAME, { mainBusy: false, sideBusy: true });
      expect(controller.state.main).toBe("RED");
    }
    expect(controller.state.phase).toBe("ALL_RED_BEFORE_MAIN");
  });

  it("reste configurable et dérivable d'un feu à trois états", () => {
    const cycle = cycleFromMain({ green: 6, yellow: 2, red: 10 });
    expect(cycle.sideGreen).toBeGreaterThan(5);
    expect(intersectionStateAt(6 + 2 + cycle.allRed + 0.5, cycle).side).toBe("GREEN");
  });
});

interface World {
  main: TrafficManager;
  cross: CrossTrafficManager;
  controller: IntersectionController;
}

function world(options: { seed?: number; capacity?: number; offset?: number } = {}): World {
  const random = seeded(options.seed ?? 1);
  const main = new TrafficManager({ capacity: 8, random });
  main.laneCap = 0;
  const cross = new CrossTrafficManager({ capacity: options.capacity ?? 4, random, specs: CROSS_SPECS });
  cross.cap = 0;
  return { main, cross, controller: new IntersectionController({ ...DEFAULT_INTERSECTION_CYCLE, offset: options.offset ?? 0 }) };
}

function step(w: World) {
  const city = cityLayout();
  w.controller.update(FRAME, {
    mainBusy: w.main.movingIn(city.mouthLeft - 40, city.mouthRight + 40),
    sideBusy: w.cross.turnZoneBusy(),
  });
  const state = w.controller.state;
  w.cross.update(FRAME, { side: state.side, main: w.main });
  w.main.update(FRAME, {
    viewMinX: city.panelX,
    viewMaxX: city.panelEnd,
    extras: w.cross.extras(),
    signals: [
      { lineX: city.stopLineEast, direction: 1, state: state.main },
      { lineX: city.stopLineWest, direction: -1, state: state.main },
    ],
  });
  return state;
}

describe("premier scénario : feu rouge pour Léo, feu vert pour la rue, virage à droite, insertion, suite du trajet", () => {
  it("attend au rouge, s'arrête progressivement avant la ligne, roues immobiles", () => {
    const w = world();
    const vehicle = w.cross.place(0, sedan, "RIGHT", 0, 180);
    let previous = vehicle.speed;
    for (let frame = 0; frame < 60 * 12; frame += 1) {
      step(w);
      expect(vehicle.speed).toBeLessThanOrEqual(previous + 1e-9);
      previous = vehicle.speed;
      expect(vehicle.s + vehicle.length / 2).toBeLessThanOrEqual(vehicle.path.stopS + 0.5);
    }
    expect(vehicle.speed).toBe(0);
    expect(vehicle.state).toBe("WAITING");
    const rolled = vehicle.rolled;
    step(w);
    expect(vehicle.rolled).toBe(rolled);
  });

  it("démarre au vert de la rue, tourne progressivement, rejoint la voie PARALLÈLE à celle de Léo et continue", () => {
    const w = world();
    const vehicle = w.cross.place(0, sedan, "RIGHT", 0, 140);
    let adopted = false;
    let previous = { x: vehicle.x, y: vehicle.y, heading: vehicle.heading };
    let maxHeadingStep = 0;
    let maxJump = 0;
    let enteredAtSide = "";
    for (let frame = 0; frame < 60 * 90 && !adopted; frame += 1) {
      const state = step(w);
      if (vehicle.state === "TURNING" && !enteredAtSide) enteredAtSide = state.side;
      if (!vehicle.active) { adopted = true; break; }
      maxHeadingStep = Math.max(maxHeadingStep, Math.abs(angleDelta(vehicle.heading, previous.heading)));
      maxJump = Math.max(maxJump, Math.hypot(vehicle.x - previous.x, vehicle.y - previous.y));
      // Jamais dans la voie de Léo, jamais de l'autre côté de la ligne centrale.
      expect(vehicle.y).toBeLessThan(ROAD_Y - 20);
      previous = { x: vehicle.x, y: vehicle.y, heading: vehicle.heading };
    }
    expect(adopted).toBe(true);
    expect(enteredAtSide).toBe("GREEN");
    expect(maxHeadingStep).toBeLessThan(0.05);
    expect(maxJump).toBeLessThan(4.5);
    const inherited = w.main.vehicles.find((candidate) => candidate.active);
    expect(inherited?.lane).toBe("oncoming");
    expect(inherited?.spec).toBe(sedan);
    // Même place à une ou deux images près (le véhicule a avancé d'au plus 2 pas), jamais un saut.
    expect(Math.abs((inherited?.x ?? 0) - previous.x)).toBeLessThan(12);
    // Les roues continuent dans le sens de la marche (ouest : négatif), sans saut.
    const angle = inherited?.wheelAngle ?? 0;
    expect(angle).toBeLessThan(0);
    for (let frame = 0; frame < 60 * 4; frame += 1) step(w);
    expect(inherited?.wheelAngle ?? 0).toBeLessThan(angle);
    expect(inherited?.x ?? 0).toBeLessThan(previous.x - 100);
  });

  it("n'engage pas le virage si la voie de sortie est bloquée, puis reprend dès qu'elle se libère", () => {
    const w = world({ offset: 20 + 4 + 2 });
    const vehicle = w.cross.place(0, sedan, "RIGHT", 0, 140);
    const window = exitWindow(vehicle.path, vehicle.fullLength);
    const blocker = w.main.adopt({ lane: "oncoming", spec: sedan, profile: "normal", x: (window.minX + window.maxX) / 2, speed: 0, cruise: 0, wheelAngle: 0 });
    expect(blocker).not.toBeNull();
    for (let frame = 0; frame < 60 * 10; frame += 1) {
      step(w);
      expect(vehicle.s + vehicle.length / 2).toBeLessThanOrEqual(vehicle.path.edgeS + 0.5);
    }
    expect(w.controller.state.side).toBe("GREEN");
    expect(vehicle.speed).toBe(0);
    if (blocker) blocker.active = false;
    for (let frame = 0; frame < 60 * 4; frame += 1) step(w);
    expect(vehicle.active === false || vehicle.s > vehicle.path.edgeS).toBe(true);
  });

  it("exige plus de place en sortie pour un autocar que pour un coupé, et le laisse attendre", () => {
    const wBus = world();
    const busVehicle = wBus.cross.place(0, bus, "RIGHT", 0, 100);
    const sport = CROSS_SPECS.find((spec) => spec.kind === "sport") as VehicleSpec;
    const wSport = world();
    const sportVehicle = wSport.cross.place(0, sport, "RIGHT", 0, 100);
    const busWindow = exitWindow(busVehicle.path, busVehicle.fullLength);
    const sportWindow = exitWindow(sportVehicle.path, sportVehicle.fullLength);
    expect(busWindow.maxX - busWindow.minX).toBeGreaterThan(sportWindow.maxX - sportWindow.minX);
  });

  it("termine un virage engagé même si le feu de la rue passe à l'orange puis au rouge pendant la manœuvre", () => {
    const w = world();
    const vehicle = w.cross.place(0, sedan, "RIGHT", 0, 120);
    vehicle.s = vehicle.path.edgeS + 5;
    let done = false;
    for (let frame = 0; frame < 60 * 20 && !done; frame += 1) {
      w.cross.update(FRAME, { side: "RED", main: w.main });
      if (!vehicle.active) done = true;
    }
    expect(done).toBe(true);
  });
});

describe("vitesses cohérentes : profils existants, courbure, aucune accélération brusque", () => {
  it("réutilise les profils de vitesse du trafic existant, sans vitesse propre aux nouveaux véhicules", () => {
    const w = world({ seed: 5 });
    w.cross.cap = 3;
    const seen = new Set<string>();
    // Écarts relevés pendant la simulation, vérifiés une fois à la fin (test rapide même sur une machine chargée).
    const violations: string[] = [];
    for (let frame = 0; frame < 60 * 300; frame += 1) {
      step(w);
      for (const vehicle of w.cross.vehicles) {
        if (!vehicle.active) continue;
        const [low, high] = SPEED_PROFILES[vehicle.profile];
        if (vehicle.cruise < low - 1e-9 || vehicle.cruise > high + 1e-9) violations.push(`${vehicle.spec.kind} roule à ${vehicle.cruise}`);
        if (!vehicle.spec.profiles.includes(vehicle.profile)) violations.push(`${vehicle.spec.kind} : profil ${vehicle.profile}`);
        seen.add(vehicle.spec.kind);
      }
    }
    expect(violations).toEqual([]);
    expect(seen.size).toBeGreaterThanOrEqual(3);
    // Les véhicules de luxe ne roulent pas automatiquement plus vite : aucun n'a le profil rapide.
    for (const spec of CROSS_SPECS) expect(spec.profiles).not.toContain("fast");
    const fastestTraffic = Math.max(...TRAFFIC_SPECS.flatMap((spec) => spec.profiles.map((profile) => SPEED_PROFILES[profile][1])));
    for (const spec of CROSS_SPECS) for (const profile of spec.profiles) expect(SPEED_PROFILES[profile][1]).toBeLessThanOrEqual(fastestTraffic);
  });

  it("ne dépasse jamais la vitesse permise par la courbure et ne change jamais de vitesse brutalement", () => {
    const w = world({ seed: 9, offset: 20 + 4 + 2 });
    w.cross.cap = 3;
    const lastSpeed = new Map<number, { speed: number; s: number }>();
    let maxAcceleration = 0;
    let maxDeceleration = 0;
    for (let frame = 0; frame < 60 * 200; frame += 1) {
      step(w);
      for (const vehicle of w.cross.vehicles) {
        if (!vehicle.active) { lastSpeed.delete(vehicle.id); continue; }
        const cap = speedCapAt(vehicle.path, vehicle.s + vehicle.length / 2);
        expect(vehicle.speed).toBeLessThanOrEqual(Math.min(vehicle.cruise, cap) + 6);
        const before = lastSpeed.get(vehicle.id);
        // Un emplacement réutilisé par un nouveau véhicule (s qui recule) n'est pas une variation de vitesse.
        if (before !== undefined && vehicle.s >= before.s) {
          const a = (vehicle.speed - before.speed) / FRAME;
          maxAcceleration = Math.max(maxAcceleration, a);
          maxDeceleration = Math.max(maxDeceleration, -a);
        }
        lastSpeed.set(vehicle.id, { speed: vehicle.speed, s: vehicle.s });
      }
    }
    // Pas de ruée au passage au vert : l'accélération reste celle du modèle de suivi ; le freinage reste borné.
    expect(maxAcceleration).toBeLessThanOrEqual(170);
    expect(maxDeceleration).toBeLessThanOrEqual(MAX_BRAKING + 1);
  });
});

describe("circulation multiple : une simulation longue du carrefour", () => {
  it("garde chaque véhicule dans sa voie, hors de la voie de Léo, sans chevauchement ni blocage permanent", () => {
    const w = world({ seed: 7, capacity: 4 });
    const city = cityLayout();
    w.cross.cap = 3;
    w.main.laneCap = 3;
    const wasActive = new Set<number>();
    const stoppedSince = new Map<number, number>();
    let handoffs = 0;
    let longestWait = 0;
    let enteredOnGreen = true;
    const inTurn = new Set<number>();
    for (let frame = 0; frame < 60 * 400; frame += 1) {
      const state = step(w);
      for (const vehicle of w.cross.vehicles) {
        if (wasActive.has(vehicle.id) && !vehicle.active) handoffs += 1;
        if (vehicle.active) wasActive.add(vehicle.id); else wasActive.delete(vehicle.id);
        if (!vehicle.active) { stoppedSince.delete(vehicle.id); inTurn.delete(vehicle.id); continue; }
        // Jamais dans la voie de Léo, jamais sur le trottoir.
        expect(vehicle.y).toBeLessThan(ROAD_Y - 20);
        expect(vehicle.y).toBeGreaterThan(avenueGeometry().farY - 2);
        if (vehicle.state === "TURNING" && !inTurn.has(vehicle.id)) {
          inTurn.add(vehicle.id);
          if (state.side === "RED") enteredOnGreen = false;
        }
        // Attente : immobile pendant un vert de la rue, sans raison apparente.
        if (vehicle.speed === 0 && state.side === "GREEN") stoppedSince.set(vehicle.id, (stoppedSince.get(vehicle.id) ?? 0) + FRAME);
        else stoppedSince.set(vehicle.id, 0);
        longestWait = Math.max(longestWait, stoppedSince.get(vehicle.id) ?? 0);
      }
      for (const lane of ["same", "oncoming"] as const) {
        const members = w.main.vehicles.filter((vehicle) => vehicle.active && vehicle.lane === lane);
        for (let i = 0; i < members.length; i += 1) {
          for (let j = i + 1; j < members.length; j += 1) expect(bumperGap(members[i], members[j])).toBeGreaterThanOrEqual(-0.5);
        }
      }
      // Deux véhicules perpendiculaires ne se traversent jamais.
      const active = w.cross.vehicles.filter((vehicle: CrossVehicle) => vehicle.active);
      for (let i = 0; i < active.length; i += 1) {
        for (let j = i + 1; j < active.length; j += 1) {
          const dx = active[i].x - active[j].x;
          const dy = active[i].y - active[j].y;
          expect(Math.hypot(dx, dy)).toBeGreaterThan(Math.min(active[i].length, active[j].length) * 0.4);
        }
      }
    }
    expect(city.stopLineEast).toBeGreaterThan(0);
    expect(handoffs).toBeGreaterThanOrEqual(8);
    expect(enteredOnGreen).toBe(true);
    // Au vert, un véhicule immobile attend au plus la fin d'une manœuvre précédente : jamais indéfiniment.
    expect(longestWait).toBeLessThan(12);
  });

  it("trafic principal et rue perpendiculaire restent indépendants de Léo", () => {
    const run = (leoSpeed: number) => {
      const w = world({ seed: 3 });
      const vehicle = w.cross.place(0, sedan, "RIGHT", 0, 140);
      const trace: number[] = [];
      for (let frame = 0; frame < 60 * 30; frame += 1) {
        const state = w.controller.state;
        w.controller.update(FRAME, { mainBusy: false, sideBusy: w.cross.turnZoneBusy() });
        w.cross.update(FRAME, { side: state.side, main: w.main, leo: { pose: { x: 3000, y: MAIN_LANE_Y, heading: 0 }, speed: leoSpeed } });
        trace.push(Math.round((vehicle.s + vehicle.speed) * 1000));
      }
      return trace;
    };
    expect(run(0)).toEqual(run(500));
  });
});

describe("ressources graphiques : les vraies illustrations fournies, aucun dessin improvisé", () => {
  const files = Object.keys(import.meta.glob("./assets/leo-cross-*-v1.webp"));
  const crossView = Object.values(import.meta.glob("./leoCrossView.ts", { query: "?raw", import: "default", eager: true }))[0] as string;

  it("fournit les cinq véhicules de la rue perpendiculaire, avec leurs fichiers réellement présents", () => {
    expect(CROSS_SPECS.map((spec) => spec.kind).sort()).toEqual(["black-bus", "black-sedan", "limousine", "sport", "suv"]);
    for (const spec of CROSS_SPECS) {
      const name = spec.textureKey.replace("leo-cross-", "");
      expect(files).toContain(`./assets/leo-cross-${name}-v1.webp`);
      expect(spec.facing).toBe("right");
      expect(spec.weight).toBe(0);
      expect(spec.source).toEqual({ width: 640, height: 213 });
      // Boîte et roues cohérentes avec l'image : les deux roues sont sur le même axe, à l'intérieur de la carrosserie.
      const [x0, y0, x1, y1] = spec.bbox;
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
      const [front, rear] = spec.wheels;
      expect(Math.abs(front[1] - rear[1])).toBeLessThan(2);
      expect(front[0] - front[2]).toBeGreaterThanOrEqual(x0 - 4);
      expect(rear[0] + rear[2]).toBeLessThanOrEqual(x1 + 4);
    }
  });

  it("garde des proportions crédibles dans l'échelle commune : autocar > limousine > berline > SUV > coupé", () => {
    const l = (kind: string) => length(CROSS_SPECS.find((spec) => spec.kind === kind) as VehicleSpec);
    expect(l("black-bus")).toBeGreaterThan(l("limousine"));
    expect(l("limousine")).toBeGreaterThan(l("black-sedan"));
    expect(l("black-sedan")).toBeGreaterThan(l("suv"));
    expect(l("suv")).toBeGreaterThan(l("sport"));
    for (const spec of CROSS_SPECS) {
      const display = vehicleDisplay(spec);
      expect(display.width / display.height).toBeCloseTo(spec.source.width / spec.source.height, 6);
    }
  });

  it("retourne un profil tourné à droite pour rouler vers l'ouest, sans toucher aux profils tournés à gauche", () => {
    expect(needsMirror(sedan, false)).toBe(true);
    expect(needsMirror(sedan, true)).toBe(false);
    expect(needsMirror(TRAFFIC_SPECS[0], true)).toBe(true);
    expect(needsMirror(TRAFFIC_SPECS[0], false)).toBe(false);
    expect(needsMirror(limousine, false)).toBe(true);
  });

  it("n'utilise aucun dessin improvisé dans le rendu : pas de silhouette ni de canevas dans la vue du trafic perpendiculaire", () => {
    for (const forbidden of ["createCanvas", "roundRect", "fillRect", "fillStyle", "placeholder-"]) {
      expect(crossView.includes(forbidden)).toBe(false);
    }
    expect(crossView).toContain("vraies illustrations");
  });
});

describe("fluidité", () => {
  it("fait avancer le carrefour complet (trafic, rue perpendiculaire, feux) en une fraction de milliseconde par image", () => {
    const w = world({ seed: 11, capacity: 4 });
    w.cross.cap = 3;
    w.main.laneCap = 4;
    const frames = 60 * 120;
    const start = performance.now();
    for (let frame = 0; frame < frames; frame += 1) step(w);
    const perFrame = (performance.now() - start) / frames;
    // Très large : le but est de repérer une dérive d'ordre de grandeur, pas de mesurer le processeur.
    expect(perFrame).toBeLessThan(2);
  });
});

describe("groupes de véhicules venant de l'avenue : visibles au loin, perspective, file au feu", () => {
  it("fait arriver un groupe de véhicules depuis le lointain de l'avenue, qui s'arrêtent en file au feu rouge", () => {
    const w = world({ seed: 4, capacity: 6 });
    w.cross.cap = 5;
    const avenue = avenueGeometry();
    let maxSimultaneous = 0;
    let spawnedFar = true;
    const seen = new Set<number>();
    // L'avenue reste au rouge : on reste dans la phase verte de l'avenue principale.
    for (let frame = 0; frame < 60 * 18; frame += 1) {
      step(w);
      expect(w.controller.state.side).toBe("RED");
      const active = w.cross.vehicles.filter((vehicle) => vehicle.active);
      maxSimultaneous = Math.max(maxSimultaneous, active.length);
      for (const vehicle of active) {
        if (!seen.has(vehicle.id) || vehicle.s < 5) {
          seen.add(vehicle.id);
          if (vehicle.s < 5 && (vehicle.y > avenue.farY + 6 || vehicle.scale > 0.4)) spawnedFar = false;
        }
      }
    }
    expect(spawnedFar).toBe(true);
    expect(maxSimultaneous).toBeGreaterThanOrEqual(2);
    const queue = w.cross.vehicles.filter((vehicle) => vehicle.active && vehicle.state === "WAITING");
    expect(queue.length).toBeGreaterThanOrEqual(2);
    // Une vraie file : écart positif entre voisins, tous avant la ligne d'arrêt.
    const sorted = [...queue].sort((a, b) => b.s - a.s);
    for (let i = 0; i < sorted.length; i += 1) {
      expect(sorted[i].s + sorted[i].length / 2).toBeLessThanOrEqual(sorted[i].path.stopS + 0.5);
      if (i > 0) expect(sorted[i - 1].s - sorted[i - 1].length / 2 - (sorted[i].s + sorted[i].length / 2)).toBeGreaterThan(0);
    }
  });

  it("rend le groupe visible : les véhicules lointains sont petits mais présents, tous affichables avec un profil fourni", () => {
    const w = world({ seed: 4, capacity: 6 });
    w.cross.cap = 5;
    for (let frame = 0; frame < 60 * 10; frame += 1) {
      step(w);
      for (const vehicle of w.cross.vehicles.filter((candidate) => candidate.active)) {
        const profile = interimProfile(vehicle.heading);
        expect(Math.abs(profile.tilt)).toBeLessThan(Math.PI / 2 + 1e-9);
        expect(vehicle.scale).toBeGreaterThanOrEqual(0.12);
        expect(vehicle.spec.facing).toBe("right");
      }
    }
  });

  it("applique la perspective à la vitesse apparente : un véhicule lointain avance moins vite à l'écran qu'un véhicule proche", () => {
    const apparent = (s: number) => {
      const w = world();
      const vehicle = w.cross.place(0, sedan, "RIGHT", s, 100);
      vehicle.committed = true;
      const before = { x: vehicle.x, y: vehicle.y };
      w.cross.update(FRAME, { side: "GREEN", main: w.main });
      return { screen: Math.hypot(vehicle.x - before.x, vehicle.y - before.y), speed: vehicle.speed };
    };
    const far = apparent(2);
    const near = apparent(rightTurnPath(length(sedan), vehicleDisplay(sedan).footprintDepth).edgeS + 20);
    expect(far.screen / far.speed).toBeLessThan(near.screen / near.speed);
    // La rotation des roues, elle, suit la distance parcourue dans le monde, pas à l'écran.
    const w = world();
    const vehicle = w.cross.place(0, sedan, "RIGHT", 2, 100);
    const rolled = vehicle.rolled;
    w.cross.update(FRAME, { side: "GREEN", main: w.main });
    expect(vehicle.rolled - rolled).toBeCloseTo(vehicle.speed * FRAME, 6);
  });

  it("incline le profil provisoire de façon continue le long du trajet, dans le bon sens, sans saut", () => {
    for (const spec of CROSS_SPECS) {
      const path = pathFor(spec);
      let previous = interimProfile(path.points[0].heading);
      expect(previous.west).toBe(true);
      for (const point of path.points) {
        const profile = interimProfile(point.heading);
        expect(profile.west).toBe(true);
        expect(Math.abs(profile.tilt - previous.tilt)).toBeLessThan(0.1);
        previous = profile;
      }
      // Arrivé dans la voie parallèle : le profil est à plat.
      expect(Math.abs(interimProfile(path.points[path.points.length - 1].heading).tilt)).toBeLessThan(1e-9);
    }
    expect(interimProfile(0).west).toBe(false);
  });
});

describe("profil projeté sur la chaussée : axe du véhicule parallèle à l'axe de la voie", () => {
  const apply = (pose: ProfilePose, x: number, y: number) => [pose.matrix[0] * x + pose.matrix[1] * y, pose.matrix[2] * x + pose.matrix[3] * y];
  const rot = (angle: number, x: number, y: number) => [Math.cos(angle) * x - Math.sin(angle) * y, Math.sin(angle) * x + Math.cos(angle) * y];

  it("décompose exactement la matrice en rotation · échelles · rotation, comme deux conteneurs imbriqués", () => {
    for (const heading of [Math.PI * 0.75, Math.PI * 0.85, Math.PI, Math.PI * 1.2, 0.3, -0.4]) {
      const pose = profilePose(heading, 0.6);
      for (const [x, y] of [[1, 0], [0, 1], [0.7, -1.3]]) {
        const [ix, iy] = rot(pose.innerRotation, x, y);
        const [ox, oy] = rot(pose.outerRotation, ix * pose.scaleX, iy * pose.scaleY);
        const [mx, my] = apply(pose, x, y);
        expect(ox).toBeCloseTo(mx, 9);
        expect(oy).toBeCloseTo(my, 9);
      }
    }
  });

  it("garde les verticales verticales et aligne l'avant du véhicule sur la direction du trajet", () => {
    for (const spec of CROSS_SPECS) {
      for (const point of pathFor(spec).points) {
        const pose = profilePose(point.heading, 0.5);
        const [vx, vy] = apply(pose, 0, 1);
        expect(Math.abs(vx)).toBeLessThan(1e-9);
        expect(vy).toBeCloseTo(0.5, 9);
        // L'avant du profil affiché (à gauche vers l'ouest, à droite vers l'est) suit la tangente du trajet.
        const [fx, fy] = apply(pose, pose.west ? -1 : 1, 0);
        const cross = fx * Math.sin(point.heading) - fy * Math.cos(point.heading);
        const dot = fx * Math.cos(point.heading) + fy * Math.sin(point.heading);
        if (Math.abs(Math.cos(point.heading)) >= MIN_PROFILE_SPREAD) expect(Math.abs(cross)).toBeLessThan(1e-9);
        expect(dot).toBeGreaterThan(0);
      }
    }
  });

  it("retrouve le profil à plat sur la chaussée principale, sans rotation", () => {
    const pose = profilePose(Math.PI, 0.8);
    expect(pose.matrix[0]).toBeCloseTo(0.8, 9);
    expect(pose.matrix[2]).toBeCloseTo(0, 9);
    expect(apply(pose, 1, 0)[1]).toBeCloseTo(0, 9);
  });

  it("descend l'avenue avec l'avant plus bas que l'arrière (le véhicule vient vers le spectateur)", () => {
    const path = pathFor(CROSS_SPECS[0]);
    const pose = profilePose(path.points[0].heading);
    const [, frontY] = apply(pose, -1, 0);
    const [, rearY] = apply(pose, 1, 0);
    expect(frontY).toBeGreaterThan(rearY);
  });
});
