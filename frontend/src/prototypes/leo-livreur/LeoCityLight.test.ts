import { describe, expect, it } from "vitest";

import { bridgeLayout, BRIDGE_CAMERA_OFFSET } from "./leoBridgeLayout";
import {
  BRIDGE_END_X,
  CITY_CAMERA_OFFSET,
  CITY_FADE,
  CITY_OVERLAP,
  CITY_REF,
  CITY_ZOOM_FACTOR,
  cameraProfile,
  cityLayout,
} from "./leoCityLayout";
import { updateLeoMotion, type LeoMotionState } from "./leoDriving";
import { MAIN_LANE_Y, ONCOMING_LANE_Y, ROAD_HALF_WIDTH, ROAD_Y, VEHICLE_LENGTH } from "./leoGeometry";
import { TrafficManager, type SignalStop, type TrafficVehicle } from "./leoTraffic";
import {
  cycleLength,
  DEFAULT_LIGHT_CYCLE,
  lightPhaseAt,
  shouldStopForLight,
  SIGNAL_MESSAGES,
  SignalJudge,
  type LightCycle,
  type LightState,
} from "./leoTrafficLight";
import { TRAFFIC_SPECS, vehicleDisplay } from "./leoVehicleCatalog";
import { visibleZoneIds, WORLD_ZONE_WIDTH, zoneForWorldX } from "./leoWorldZones";

const FRAME = 1 / 60;

describe("feu tricolore : cycle", () => {
  it("passe du vert à l'orange puis au rouge, puis recommence", () => {
    const { green, yellow, red } = DEFAULT_LIGHT_CYCLE;
    expect(lightPhaseAt(0).state).toBe("GREEN");
    expect(lightPhaseAt(green - 0.01).state).toBe("GREEN");
    expect(lightPhaseAt(green + 0.01).state).toBe("YELLOW");
    expect(lightPhaseAt(green + yellow + 0.01).state).toBe("RED");
    expect(lightPhaseAt(green + yellow + red - 0.01).state).toBe("RED");
    expect(lightPhaseAt(cycleLength(DEFAULT_LIGHT_CYCLE) + 0.01).state).toBe("GREEN");
    expect(lightPhaseAt(-1).state).toBe("RED");
  });

  it("suit un cycle configurable, avec décalage, et indique le temps restant", () => {
    const cycle: LightCycle = { green: 3, yellow: 1, red: 2, offset: 3 };
    expect(lightPhaseAt(0, cycle).state).toBe("YELLOW");
    const phase = lightPhaseAt(0.25, cycle);
    expect(phase.remaining).toBeCloseTo(0.75, 6);
    expect(phase.elapsed).toBeCloseTo(0.25, 6);
    const order: LightState[] = [];
    for (let t = 0; t < 12; t += 0.1) {
      const { state } = lightPhaseAt(t, cycle);
      if (order[order.length - 1] !== state) order.push(state);
    }
    expect(order.slice(0, 4)).toEqual(["YELLOW", "RED", "GREEN", "YELLOW"]);
  });
});

describe("feu tricolore : arrêt d'un conducteur", () => {
  it("ne s'arrête jamais au vert, toujours au rouge s'il en a le temps", () => {
    expect(shouldStopForLight("GREEN", 100, 300)).toBe(false);
    expect(shouldStopForLight("RED", 400, 300)).toBe(true);
    expect(shouldStopForLight("RED", 5, 300)).toBe(false);
    expect(shouldStopForLight("RED", -3, 0)).toBe(false);
  });

  it("à l'orange, freine seulement si l'arrêt reste confortable", () => {
    expect(shouldStopForLight("YELLOW", 400, 200)).toBe(true);
    expect(shouldStopForLight("YELLOW", 40, 300)).toBe(false);
  });
});

describe("Léo face au feu : messages sans sanction mécanique", () => {
  const city = cityLayout();
  const line = city.stopLineEast;
  const front = (state: LeoMotionState) => state.x + VEHICLE_LENGTH / 2;
  const start = (x: number, speed: number): LeoMotionState => ({ x, y: MAIN_LANE_Y, speed, heading: 0, steeringAngle: 0 });

  function drive(
    initial: LeoMotionState,
    light: (t: number) => LightState,
    input: (s: LeoMotionState, t: number) => { forward?: boolean; brake?: boolean; reverse?: boolean },
    seconds: number,
  ) {
    const judge = new SignalJudge();
    let state = initial;
    const events: string[] = [];
    let moved = 0;
    for (let frame = 0; frame < seconds * 60; frame += 1) {
      const t = frame * FRAME;
      const before = state.x;
      state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: false, reverse: false, ...input(state, t) }, FRAME);
      moved += Math.abs(state.x - before);
      const event = judge.update(light(t), front(state), state.speed, line);
      if (event) events.push(event);
    }
    return { events, state, moved };
  }

  it("félicite Léo qui s'arrête devant la ligne au rouge, une seule fois", () => {
    const run = drive(start(line - 520, 0), () => "RED", (s) => {
      const distance = line - front(s);
      return distance > 190 ? { forward: true } : { brake: true };
    }, 14);
    expect(run.events).toContain("respected");
    expect(run.events.filter((e) => e === "respected")).toHaveLength(1);
    expect(run.events).not.toContain("violated");
    expect(front(run.state)).toBeLessThan(line);
    expect(run.state.speed).toBe(0);
    expect(SIGNAL_MESSAGES.respected).toBe("Bravo Léo ! Tu as respecté le feu rouge !");
  });

  it("avertit Léo qui franchit la ligne au rouge, sans le téléporter ni le bloquer", () => {
    const run = drive(start(line - 300, 200), () => "RED", () => ({ forward: true }), 5);
    expect(run.events).toContain("violated");
    expect(run.events.filter((e) => e === "violated")).toHaveLength(1);
    expect(front(run.state)).toBeGreaterThan(line);
    expect(run.moved).toBeGreaterThan(500);
    expect(SIGNAL_MESSAGES.violated).toBe("Attention Léo ! Il faut s'arrêter au feu rouge.");
  });

  it("ne dit rien au vert, et prévient à l'orange", () => {
    const green = drive(start(line - 300, 200), () => "GREEN", () => ({ forward: true }), 5);
    expect(green.events).toEqual([]);
    const yellow = drive(start(line - 300, 200), () => "YELLOW", () => ({ forward: true }), 0.5);
    expect(yellow.events).toContain("yellow");
  });

  it("permet la reprise : en reculant derrière la ligne, un nouveau franchissement est de nouveau jugé", () => {
    const judge = new SignalJudge();
    expect(judge.update("RED", line - 20, 100, line)).toBeNull();
    expect(judge.update("RED", line + 5, 100, line)).toBe("violated");
    expect(judge.update("RED", line + 6, 100, line)).toBeNull();
    // Léo recule derrière la ligne (marche arrière), puis réessaie.
    expect(judge.update("RED", line - 80, -50, line)).toBeNull();
    expect(judge.update("RED", line - 10, 100, line)).toBeNull();
    expect(judge.update("RED", line + 4, 100, line)).toBe("violated");
  });

  it("n'immobilise jamais le parcours : au vert Léo repart et dépasse la ligne sans message", () => {
    const run = drive(start(line - 160, 0), (t) => (t < 6 ? "RED" : "GREEN"), (_s, t) => (t < 6 ? { brake: true } : { forward: true }), 14);
    expect(front(run.state)).toBeGreaterThan(line + 200);
    expect(run.events).not.toContain("violated");
  });
});

describe("trafic et feux : chaque véhicule décide pour lui-même", () => {
  const city = cityLayout();
  const display = vehicleDisplay(TRAFFIC_SPECS[1]);

  function place(manager: TrafficManager, index: number, patch: Partial<TrafficVehicle>) {
    Object.assign(manager.vehicles[index], {
      active: true,
      lane: "same",
      spec: TRAFFIC_SPECS[1],
      profile: "normal",
      x: city.stopLineEast - 700,
      speed: 260,
      cruise: 260,
      wheelAngle: 0,
      length: display.footprintLength,
      depth: display.footprintDepth,
      rollRadius: display.wheels[0].rollRadius,
    }, patch);
    return manager.vehicles[index];
  }
  const signals = (state: LightState): SignalStop[] => [
    { lineX: city.stopLineEast, direction: 1, state },
    { lineX: city.stopLineWest, direction: -1, state },
  ];
  const frontOf = (v: TrafficVehicle, direction: 1 | -1) => v.x + (direction * v.length) / 2;

  it("s'arrête avant la ligne au rouge, roues comprises, de façon progressive", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const car = place(manager, 0, {});
    let previous = car.speed;
    for (let frame = 0; frame < 60 * 30; frame += 1) {
      manager.update(FRAME, { viewMinX: car.x - 600, viewMaxX: car.x + 900, signals: signals("RED") });
      expect(car.speed).toBeLessThanOrEqual(previous + 1e-9);
      expect(frontOf(car, 1)).toBeLessThanOrEqual(city.stopLineEast + 0.5);
      previous = car.speed;
    }
    expect(car.speed).toBe(0);
    const angle = car.wheelAngle;
    manager.update(FRAME, { viewMinX: car.x - 600, viewMaxX: car.x + 900, signals: signals("RED") });
    expect(car.wheelAngle).toBe(angle);
  });

  it("repart quand le feu repasse au vert : aucun blocage définitif", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const car = place(manager, 0, {});
    let state: LightState = "RED";
    for (let frame = 0; frame < 60 * 20; frame += 1) {
      manager.update(FRAME, { viewMinX: car.x - 600, viewMaxX: car.x + 900, signals: signals(state) });
    }
    expect(car.speed).toBe(0);
    state = "GREEN";
    for (let frame = 0; frame < 60 * 12; frame += 1) {
      manager.update(FRAME, { viewMinX: car.x - 600, viewMaxX: car.x + 900, signals: signals(state) });
    }
    expect(frontOf(car, 1)).toBeGreaterThan(city.stopLineEast + 100);
    expect(car.speed).toBeGreaterThan(100);
  });

  it("traverse un cycle complet : s'arrête au rouge puis passe, sans jamais être figé", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const car = place(manager, 0, { x: city.stopLineEast - 1500 });
    let crossed = false;
    for (let frame = 0; frame < 60 * 70 && !crossed; frame += 1) {
      const { state } = lightPhaseAt(frame * FRAME + 8, DEFAULT_LIGHT_CYCLE);
      manager.update(FRAME, { viewMinX: car.x - 600, viewMaxX: car.x + 900, signals: signals(state) });
      if (frontOf(car, 1) > city.stopLineEast + 5) crossed = true;
    }
    expect(crossed).toBe(true);
  });

  it("n'affecte pas un véhicule déjà passé la ligne, ni celui qui roule dans l'autre sens", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const passed = place(manager, 0, { x: city.stopLineEast + 400, speed: 240, cruise: 240 });
    const oncoming = place(manager, 1, { lane: "oncoming", x: city.stopLineEast - 600, speed: 220, cruise: 220 });
    for (let frame = 0; frame < 60 * 4; frame += 1) {
      manager.update(FRAME, { viewMinX: city.stopLineEast - 900, viewMaxX: city.stopLineEast + 1200, signals: signals("RED") });
    }
    // Passé la ligne : sa vitesse est exactement celle de croisière.
    expect(passed.speed).toBe(240);
    // En sens inverse, sa propre ligne est à l'est de l'avenue : loin devant lui, il roule encore à sa vitesse.
    expect(oncoming.speed).toBeGreaterThan(200);
  });

  it("le sens opposé respecte sa propre ligne, à l'autre bout de l'avenue", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const oncoming = place(manager, 1, { lane: "oncoming", x: city.stopLineWest + 700, speed: 260, cruise: 260 });
    for (let frame = 0; frame < 60 * 30; frame += 1) {
      manager.update(FRAME, { viewMinX: oncoming.x - 900, viewMaxX: oncoming.x + 600, signals: signals("RED") });
      expect(frontOf(oncoming, -1)).toBeGreaterThanOrEqual(city.stopLineWest - 0.5);
    }
    expect(oncoming.speed).toBe(0);
  });

  it("garde les états séparés : un véhicule arrêté au rouge ne ralentit pas un autre déjà engagé", () => {
    const manager = new TrafficManager({ capacity: 4, random: () => 0.5 });
    manager.laneCap = 0;
    const waiting = place(manager, 0, { x: city.stopLineEast - 120 - 10, speed: 0, cruise: 260 });
    const sameLaneFar = place(manager, 2, { lane: "oncoming", x: city.stopLineWest + 2000, speed: 200, cruise: 200 });
    for (let frame = 0; frame < 60 * 3; frame += 1) {
      manager.update(FRAME, { viewMinX: city.stopLineEast - 600, viewMaxX: city.stopLineWest + 2400, signals: signals("RED") });
    }
    expect(waiting.speed).toBe(0);
    // Loin de sa ligne, l'autre véhicule garde sa propre allure : il ne s'est pas arrêté avec le premier.
    expect(sameLaneFar.speed).toBeGreaterThan(150);
    expect(new Set(manager.vehicles).size).toBe(manager.vehicles.length);
  });
});

describe("Zone 3 : mise en page et continuité", () => {
  const city = cityLayout();
  const bridge = bridgeLayout();

  it("commence avant la fin du pont : fondu croisé, aucune bande vide entre les zones", () => {
    expect(city.panelX).toBe(BRIDGE_END_X - CITY_OVERLAP);
    expect(city.panelX + CITY_FADE).toBeGreaterThan(BRIDGE_END_X);
    expect(city.panelEnd).toBeGreaterThan(BRIDGE_END_X + 1500);
  });

  it("raccorde les images à la chaussée du jeu, sans deuxième route", () => {
    // Le haut s'arrête au trottoir arrière du tablier ; le bas commence sous la ligne blanche avant.
    expect(city.topBottom).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH);
    expect(city.topBottom).toBeGreaterThan(ROAD_Y - ROAD_HALF_WIDTH - 30);
    expect(city.bottomTop).toBeGreaterThan(ROAD_Y + ROAD_HALF_WIDTH);
    expect(city.bottomTop).toBeLessThan(ROAD_Y + ROAD_HALF_WIDTH + 20);
    expect(city.topBottom - city.topY).toBeCloseTo(CITY_REF.topRows * city.scale, 6);
    expect(city.bottomEnd).toBeLessThan(960);
    expect(bridge.deckScale).toBeGreaterThan(0);
  });

  it("place les lignes d'arrêt sur la chaussée, avant et après la bouche de l'avenue", () => {
    expect(city.stopLineEast).toBeLessThan(city.mouthLeft);
    expect(city.stopLineWest).toBeGreaterThan(city.mouthRight);
    expect(city.mouthRight - city.mouthLeft).toBeGreaterThan(400);
    // Le pare-chocs de Léo peut s'arrêter avant la ligne sans sortir du panneau.
    expect(city.stopLineEast - VEHICLE_LENGTH).toBeGreaterThan(city.panelX + CITY_FADE / 2);
    expect(ONCOMING_LANE_Y).toBeLessThan(ROAD_Y);
  });

  it("pose la tête de feu dans le panneau, au-dessus de l'avenue secondaire", () => {
    expect(city.lightX).toBeGreaterThan(city.mouthLeft);
    expect(city.lightX).toBeLessThan(city.mouthRight);
    expect(city.lightY + city.lightHeight / 2).toBeLessThan(city.topBottom);
    expect(city.lampOffsets.red).toBeLessThan(city.lampOffsets.yellow);
    expect(city.lampOffsets.yellow).toBeLessThan(city.lampOffsets.green);
    expect(city.lampOffsets.green + city.lampOffsets.radius).toBeLessThanOrEqual(city.lightHeight / 2 + 2);
  });

  it("enchaîne la caméra sans saut : campagne, pont, ville, puis retour", () => {
    let previous = cameraProfile(0, BRIDGE_CAMERA_OFFSET);
    expect(previous.offset).toBe(0);
    expect(previous.zoomFactor).toBe(1);
    for (let x = 0; x <= city.panelEnd + 2000; x += 20) {
      const profile = cameraProfile(x, BRIDGE_CAMERA_OFFSET);
      expect(Math.abs(profile.offset - previous.offset)).toBeLessThan(5);
      expect(Math.abs(profile.zoomFactor - previous.zoomFactor)).toBeLessThan(0.01);
      previous = profile;
    }
    const inTown = cameraProfile(city.stopLineEast, BRIDGE_CAMERA_OFFSET);
    expect(inTown.offset).toBe(CITY_CAMERA_OFFSET);
    expect(inTown.zoomFactor).toBeCloseTo(CITY_ZOOM_FACTOR, 6);
    // Léo recule vers le pont : on retrouve exactement le profil du pont.
    expect(cameraProfile(9000, BRIDGE_CAMERA_OFFSET).offset).toBe(BRIDGE_CAMERA_OFFSET);
  });

  it("garde les zones utiles chargées tout le long du panneau, y compris en reculant (précédente, actuelle, suivante)", () => {
    for (let x = city.panelX - 500; x <= city.panelEnd + 500; x += 50) {
      const loaded = new Set(visibleZoneIds(x));
      // Même une vue de 1600 px de large autour de Léo ne dépasse pas les zones chargées.
      for (const edge of [x - 800, x + 800]) expect(loaded.has(zoneForWorldX(Math.max(0, edge)).id)).toBe(true);
    }
    expect(zoneForWorldX(city.panelX + CITY_FADE).kind).toBe("city-entry");
    expect(zoneForWorldX(BRIDGE_END_X - 1).kind).toBe("bridge");
    expect(city.stopLineWest).toBeLessThan(zoneForWorldX(BRIDGE_END_X).endX);
    expect(WORLD_ZONE_WIDTH).toBeGreaterThan(city.stopLineWest - BRIDGE_END_X);
  });
});
