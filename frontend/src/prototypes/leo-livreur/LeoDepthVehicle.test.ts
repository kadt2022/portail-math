import { describe, expect, it } from "vitest";

import { cityLayout } from "./leoCityLayout";
import {
  DepthTraffic,
  PROFILE_WORLD_SCALE,
  REFERENCE_TYRE_RADIUS,
  SEDAN_TURN_PROFILE,
  SHEET_VIEWS,
  SHEET_WHEELS,
  TURN_RADIUS,
  TURN_SHEET,
  VIEW_FADE,
  depthPath,
  depthProjection,
  relativeScale,
  sheetCrop,
  viewAngle,
  viewForAngle,
  viewWorldScale,
  type DepthContext,
  type DepthLayer,
} from "./leoDepthVehicle";
import { ONCOMING_LANE_Y, ROAD_Y } from "./leoGeometry";
import { DEFAULT_INTERSECTION_CYCLE, IntersectionController, LATERAL_ACCELERATION } from "./leoIntersection";
import { avenueGeometry } from "./leoLanes";
import { TrafficManager } from "./leoTraffic";
import type { LightState } from "./leoTrafficLight";
import { vehicleDisplay, wheelDiscSourceRadius } from "./leoVehicleCatalog";

const FRAME = 1 / 60;
const source = import.meta.glob("./leoDepthVehicle.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const sheet = import.meta.glob("./assets/leo-cross-sedan-turn-v1.webp", { query: "?url", import: "default", eager: true }) as Record<string, string>;

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

const green = (main?: TrafficManager): DepthContext => ({ side: "GREEN", main });
const red = (main?: TrafficManager): DepthContext => ({ side: "RED", main });

function spawned(seed = 3) {
  const traffic = new DepthTraffic(seeded(seed));
  for (let i = 0; i < 120 && !traffic.vehicle.active; i += 1) traffic.update(FRAME, red());
  expect(traffic.vehicle.active).toBe(true);
  return traffic;
}

function emptyMain() {
  const main = new TrafficManager({ capacity: 8, random: seeded(2) });
  main.laneCap = 0;
  return main;
}

const viewOf = (angle: number) => SHEET_VIEWS.find((view) => view.angle === angle) as (typeof SHEET_VIEWS)[number];

/** Hauteur toit -> sol affichée (unités d'écran) d'une couche, à partir de la boîte mesurée de sa vue. */
function displayedHeight(layer: DepthLayer) {
  const view = viewOf(layer.angle);
  return ((view.box[3] - view.box[1]) * layer.height) / sheetCrop(view).height;
}

/** Diamètre affiché de la roue avant gauche (vues où la jante est visible). */
function displayedRim(layer: DepthLayer) {
  const view = viewOf(layer.angle);
  return view.rim === null ? null : (view.rim * layer.height) / sheetCrop(view).height;
}

describe("berline des 7 vues : planche et calibrage physique", () => {
  it("utilise la planche fournie (même berline, 7 vues), sans rotation, cisaillement, miroir ni dessin", () => {
    expect(Object.keys(sheet)).toHaveLength(1);
    expect(SHEET_VIEWS.map((view) => view.angle)).toEqual([0, 15, 30, 45, 60, 75, 90]);
    const code = Object.values(source)[0];
    for (const forbidden of ["setRotation", ".rotation", "skew", "setFlip", "createCanvas", "fillRect", "setTransform"]) {
      expect(code.includes(forbidden)).toBe(false);
    }
  });

  it("découpe chaque vue dans la planche sans la rogner", () => {
    for (const view of SHEET_VIEWS) {
      const crop = sheetCrop(view);
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(TURN_SHEET.width);
      expect(crop.y + crop.height).toBeLessThanOrEqual(TURN_SHEET.height);
      expect(crop.x).toBeLessThanOrEqual(view.box[0]);
      expect(crop.x + crop.width - 1).toBeGreaterThanOrEqual(view.box[2]);
      expect(view.contact[1]).toBeLessThanOrEqual(view.box[3] + 1e-9);
    }
  });

  it("égalise la hauteur de carrosserie entre les 7 vues ; les roues restent cohérentes à moins de 10 %", () => {
    const profile = SHEET_VIEWS[SHEET_VIEWS.length - 1];
    const height = (view: (typeof SHEET_VIEWS)[number]) => (view.box[3] - view.box[1]) * relativeScale(view);
    for (const view of SHEET_VIEWS) {
      expect(height(view) / height(profile)).toBeCloseTo(1, 12);
      if (view.rim !== null) expect(Math.abs((view.rim * relativeScale(view)) / (profile.rim as number) - 1)).toBeLessThan(0.1);
    }
    expect(relativeScale(profile)).toBe(1);
  });

  it("donne au profil la taille physique des berlines de l'avenue du Savoir (même rayon de pneu)", () => {
    const display = vehicleDisplay(SEDAN_TURN_PROFILE);
    expect(display.scale).toBeCloseTo(PROFILE_WORLD_SCALE, 9);
    expect(display.wheels[0].rollRadius / 0.95).toBeCloseTo(REFERENCE_TYRE_RADIUS, 6);
    expect(SEDAN_TURN_PROFILE.facing).toBe("left");
    // Une berline, pas un car : entre 1,1 et 1,5 fois la voiture de Léo.
    expect(SEDAN_TURN_PROFILE.lengthRatio).toBeGreaterThan(1.1);
    expect(SEDAN_TURN_PROFILE.lengthRatio).toBeLessThan(1.5);
  });
});

describe("rue des Jardins : projection et trajet au sol", () => {
  it("place la berline sur l'axe de sa voie pendant l'approche et la fait grandir avec la perspective", () => {
    const p = depthProjection();
    const avenue = avenueGeometry();
    let previous = 0;
    for (let z = p.spawnZ; z >= 0; z -= 25) {
      const point = p.project(p.laneU, z);
      expect(point.x).toBeCloseTo(avenue.southLaneX(point.y), 9);
      expect(point.k).toBeGreaterThan(previous);
      previous = point.k;
    }
  });

  it("raccorde la rue et la chaussée principale sans cassure (position et pente continues)", () => {
    const p = depthProjection();
    for (const u of [-300, p.laneU, 0, 120]) {
      expect(p.project(u, 1e-6).x).toBeCloseTo(p.project(u, -1e-6).x, 4);
      expect(p.project(u, 1e-6).y).toBeCloseTo(p.project(u, -1e-6).y, 4);
    }
    expect(p.project(0, 0).y - p.project(0, 1).y).toBeCloseTo(p.project(0, -1).y - p.project(0, 0).y, 2);
    expect(p.project(0, p.laneZ).y).toBeCloseTo(ONCOMING_LANE_Y, 9);
    for (const z of [0, 40, p.stopZ, 900, p.spawnZ, -30, p.laneZ]) expect(p.zAtY(p.project(0, z).y)).toBeCloseTo(z, 6);
  });

  it("enchaîne approche, quart de cercle et voie ouest avec une tangente continue, après la ligne d'arrêt", () => {
    const path = depthPath();
    const p = depthProjection();
    for (const s of [path.approachLength, path.approachLength + path.arcLength]) {
      const before = path.at(s - 1e-6);
      const after = path.at(s + 1e-6);
      expect(Math.hypot(before.u - after.u, before.z - after.z)).toBeLessThan(1e-4);
      expect(Math.abs(before.heading - after.heading)).toBeLessThan(1e-4);
    }
    expect(path.at(path.approachLength + path.arcLength).z).toBeCloseTo(p.laneZ, 9);
    expect(path.turnStartZ).toBeLessThan(p.stopZ);
  });

  it("n'entre jamais dans la voie de Léo", () => {
    const path = depthPath();
    const p = depthProjection();
    for (let s = 0; s <= path.length; s += 5) {
      const point = path.at(s);
      expect(p.project(point.u, point.z).y).toBeLessThanOrEqual(ONCOMING_LANE_Y + 1e-9);
      expect(p.project(point.u, point.z).y).toBeLessThan(ROAD_Y);
    }
  });

  it("limite la vitesse dans le virage et prépare le freinage avant", () => {
    const path = depthPath();
    expect(path.speedCap(path.approachLength + path.arcLength / 2)).toBeCloseTo(Math.sqrt(LATERAL_ACCELERATION * TURN_RADIUS), 9);
    let previous = Infinity;
    for (let s = path.approachLength - 400; s <= path.approachLength; s += 5) {
      expect(path.speedCap(s)).toBeLessThanOrEqual(previous + 1e-9);
      previous = path.speedCap(s);
    }
  });
});

describe("rue des Jardins : vues successives, aucun saut de taille", () => {
  it("passe d'une vue à la voisine dans l'ordre (0° -> 90°), sans retour en arrière", () => {
    const path = depthPath();
    const seen: number[] = [];
    for (let s = 0; s <= path.approachLength + path.arcLength + 40; s += 1) {
      const angle = viewForAngle(viewAngle(path.at(s))).angle;
      if (seen[seen.length - 1] !== angle) {
        if (seen.length > 0) expect(angle - seen[seen.length - 1]).toBe(15);
        seen.push(angle);
      }
    }
    expect(seen[seen.length - 1]).toBe(90);
    expect(seen[0]).toBe(0);
  });

  it("garde une taille physique continue sur tout le trajet, aux changements de vue comme au relais", () => {
    const traffic = spawned();
    const main = emptyMain();
    let previous: { height: number; rim: number | null; angle: number } | null = null;
    let worstStep = 0;
    let lastSide: DepthLayer | null = null;
    while (traffic.vehicle.active) {
      const pose = traffic.pose();
      const current = pose.layers[pose.layers.length - 1];
      expect(pose.layers.reduce((sum, layer) => sum + layer.alpha, 0)).toBeCloseTo(traffic.vehicle.alpha, 9);
      const height = displayedHeight(current);
      const rim = displayedRim(current);
      if (previous) {
        // D'une image à l'autre, la taille ne bouge que par la perspective (k) : jamais de saut au changement de vue.
        // Jamais de diminution : la taille reste égale ou grandit (perspective), y compris pendant le virage.
        expect(height).toBeGreaterThanOrEqual(previous.height * (1 - 1e-9));
        const step = Math.abs(height / previous.height - 1);
        worstStep = Math.max(worstStep, step);
        if (rim !== null && previous.rim !== null) expect(Math.abs(rim / previous.rim - 1)).toBeLessThan(0.1);
      }
      for (const layer of pose.layers) {
        const crop = sheetCrop(viewOf(layer.angle));
        expect(layer.height / layer.width).toBeCloseTo(crop.height / crop.width, 9);
      }
      previous = { height, rim, angle: current.angle };
      if (current.angle === 90) lastSide = current;
      traffic.update(FRAME, green(main));
    }
    expect(worstStep).toBeLessThan(0.06);
    // Relais : le trafic ordinaire dessine la même image, au même endroit, à la même taille.
    const adopted = main.vehicles.filter((vehicle) => vehicle.active);
    expect(adopted).toHaveLength(1);
    expect(adopted[0].spec).toBe(SEDAN_TURN_PROFILE);
    const display = vehicleDisplay(SEDAN_TURN_PROFILE);
    const side = lastSide as DepthLayer;
    expect(side.height / display.height).toBeCloseTo(1, 6);
    expect(side.width / display.width).toBeCloseTo(1, 6);
    // Contact au sol de la roue avant identique : le pool pose le pneu à l'axe de la voie + profondeur / 2.
    expect(side.y).toBeCloseTo(ONCOMING_LANE_Y + SEDAN_TURN_PROFILE.depth / 2, 6);
    const poolFrontWheelX = adopted[0].x + display.wheels[0].x;
    expect(Math.abs(poolFrontWheelX - side.x)).toBeLessThan(traffic.vehicle.speed * FRAME + 6);
    // Roues : le trafic ordinaire reprend l’angle des jantes là où il en était (aucun saut, au pas d’une image près).
    const lastRotation = side.wheels[0].rotation;
    expect(Math.abs(adopted[0].wheelAngle - lastRotation)).toBeLessThanOrEqual((traffic.vehicle.speed * FRAME) / display.wheels[0].rollRadius + 1e-9);
    expect(adopted[0].wheelAngle).toBeLessThan(0);
  });

  it("fait chaque changement de vue par un fondu court", () => {
    const traffic = spawned();
    const main = emptyMain();
    let fades = 0;
    let fading = false;
    while (traffic.vehicle.active) {
      traffic.update(FRAME, green(main));
      if (!traffic.vehicle.active) break;
      const now = traffic.pose().layers.length === 2;
      if (now && !fading) fades += 1;
      fading = now;
    }
    expect(fades).toBeGreaterThanOrEqual(6);
    expect(VIEW_FADE).toBeLessThanOrEqual(0.15);
  });

  it("calcule l'échelle de chaque vue comme le produit de l'échelle physique et de la perspective", () => {
    const traffic = spawned();
    const pose = traffic.pose();
    const layer = pose.layers[pose.layers.length - 1];
    const crop = sheetCrop(viewOf(layer.angle));
    const k = layer.height / (crop.height * viewWorldScale(viewOf(layer.angle)));
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(0.2);
  });
});

describe("rue des Jardins : feux, engagement et relais", () => {
  it("avance à une vitesse logique indépendante de la fréquence d'affichage", () => {
    const run = (dt: number) => {
      const traffic = spawned();
      const start = traffic.vehicle.s;
      for (let t = 0; t < 2 - 1e-9; t += dt) traffic.update(dt, green());
      return traffic.vehicle.s - start;
    };
    expect(Math.abs(run(1 / 60) - run(1 / 30)) / run(1 / 60)).toBeLessThan(0.02);
    const traffic = spawned();
    const before = traffic.vehicle.s;
    traffic.update(FRAME, green());
    expect(traffic.vehicle.s - before).toBeCloseTo(traffic.vehicle.speed * FRAME, 9);
  });

  it("ralentit progressivement au rouge et s'arrête avant la ligne, sans jamais la dépasser", () => {
    const path = depthPath();
    const traffic = spawned();
    let previous = traffic.vehicle.speed;
    for (let frame = 0; frame < 60 * 40; frame += 1) {
      traffic.update(FRAME, red());
      expect(traffic.vehicle.s).toBeLessThanOrEqual(path.stopS + 1e-6);
      expect(previous - traffic.vehicle.speed).toBeLessThanOrEqual(630 * FRAME + 1e-6);
      previous = traffic.vehicle.speed;
    }
    expect(traffic.vehicle.speed).toBe(0);
    expect(path.stopS - traffic.vehicle.s).toBeLessThan(3);
  });

  it("attend au vert tant que la voie ouest n'est pas libre, puis s'engage et repart progressivement", () => {
    const path = depthPath();
    const traffic = spawned();
    const main = emptyMain();
    const window = traffic.exitWindow();
    const blocker = main.adopt({ lane: "oncoming", spec: SEDAN_TURN_PROFILE, profile: "normal", x: (window.minX + window.maxX) / 2, speed: 0, cruise: 0, wheelAngle: 0 });
    expect(blocker).not.toBeNull();
    for (let frame = 0; frame < 60 * 40; frame += 1) {
      traffic.update(FRAME, green(main));
      expect(traffic.vehicle.s).toBeLessThanOrEqual(path.stopS + 1e-6);
    }
    expect(traffic.vehicle.speed).toBe(0);
    if (blocker) blocker.active = false;
    let previous = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      traffic.update(FRAME, green(main));
      expect(traffic.vehicle.speed - previous).toBeLessThanOrEqual(165 * FRAME + 1e-6);
      previous = traffic.vehicle.speed;
    }
    expect(traffic.vehicle.committed).toBe(true);
  });

  it("une fois engagée, termine son virage même si le feu repasse au rouge", () => {
    const traffic = spawned();
    const main = emptyMain();
    while (!traffic.vehicle.committed) traffic.update(FRAME, green(main));
    const s = traffic.vehicle.s;
    for (let frame = 0; frame < 30; frame += 1) traffic.update(FRAME, red(main));
    expect(traffic.vehicle.s).toBeGreaterThan(s + 20);
  });

  it("suit le contrôleur de feux existant : jamais d'engagement au rouge, rouge intégral pendant le virage", () => {
    const controller = new IntersectionController({ ...DEFAULT_INTERSECTION_CYCLE, offset: 0 });
    const traffic = spawned();
    const main = emptyMain();
    const path = depthPath();
    const states = new Set<LightState>();
    let committedOnRed = false;
    for (let frame = 0; frame < 60 * 120; frame += 1) {
      controller.update(FRAME, { mainBusy: false, sideBusy: traffic.busy() });
      const side = controller.state.side;
      states.add(side);
      const wasCommitted = traffic.vehicle.committed;
      const before = traffic.vehicle.s;
      traffic.update(FRAME, { side, main });
      if (side === "RED" && !wasCommitted && before <= path.stopS && traffic.vehicle.s > path.stopS + 1e-6) committedOnRed = true;
      if (traffic.vehicle.committed && traffic.vehicle.active) expect(controller.state.main).not.toBe("GREEN");
    }
    expect(states.has("GREEN")).toBe(true);
    expect(committedOnRed).toBe(false);
  });
});

describe("rue des Jardins : avenue du Savoir intacte, fluidité", () => {
  it("laisse le trafic horizontal strictement identique tant que la berline attend au feu", () => {
    const city = cityLayout();
    const run = (withDepth: boolean) => {
      const main = new TrafficManager({ capacity: 8, random: seeded(9) });
      main.laneCap = 4;
      const depth = new DepthTraffic(seeded(5));
      for (let frame = 0; frame < 60 * 20; frame += 1) {
        if (withDepth) depth.update(FRAME, red(main));
        main.update(FRAME, { viewMinX: city.panelX, viewMaxX: city.panelEnd, extras: withDepth ? depth.extras() : [] });
      }
      return main.vehicles.map((vehicle) => `${vehicle.active}:${vehicle.lane}:${vehicle.x.toFixed(6)}:${vehicle.speed.toFixed(6)}`).join("|");
    };
    expect(run(true)).toBe(run(false));
  });

  it("coûte une fraction de milliseconde par image (mobile)", () => {
    const traffic = spawned();
    const main = emptyMain();
    const frames = 60 * 120;
    const start = performance.now();
    for (let frame = 0; frame < frames; frame += 1) {
      traffic.update(FRAME, frame % 1200 < 600 ? red(main) : green(main));
      traffic.pose();
    }
    expect((performance.now() - start) / frames).toBeLessThan(0.2);
  });
});

describe("rue des Jardins : les roues de la berline tournent", () => {
  it("fait tourner les roues dans le virage, proportionnellement à la distance, sens antihoraire", () => {
    const traffic = spawned();
    const main = emptyMain();
    let checked = 0;
    let previous: { rotation: number; rolled: number } | null = null;
    while (traffic.vehicle.active) {
      traffic.update(FRAME, green(main));
      if (!traffic.vehicle.active) break;
      const layer = traffic.pose().layers.at(-1) as DepthLayer;
      if (layer.wheels.length === 0) continue;
      const rotation = layer.wheels[0].rotation;
      if (previous) {
        const distance = traffic.vehicle.rolled - previous.rolled;
        expect(rotation - previous.rotation).toBeCloseTo(-distance / vehicleDisplay(SEDAN_TURN_PROFILE).wheels[0].rollRadius, 9);
        if (distance > 0) expect(rotation).toBeLessThan(previous.rotation);
        checked += 1;
      }
      previous = { rotation, rolled: traffic.vehicle.rolled };
    }
    expect(checked).toBeGreaterThan(30);
  });

  it("immobilise les roues à l'arrêt au feu rouge", () => {
    const traffic = spawned();
    for (let frame = 0; frame < 60 * 40; frame += 1) traffic.update(FRAME, red());
    const before = traffic.wheelRotation();
    for (let frame = 0; frame < 60; frame += 1) traffic.update(FRAME, red());
    expect(traffic.wheelRotation()).toBe(before);
  });

  it("pose chaque roue sur sa jante, dans l'illustration, et garde à 90° le disque du trafic ordinaire", () => {
    for (const view of SHEET_VIEWS) {
      for (const wheel of SHEET_WHEELS[view.angle]) {
        expect(wheel.cx).toBeGreaterThan(view.box[0]);
        expect(wheel.cx).toBeLessThan(view.box[2]);
        expect(wheel.cy + wheel.ry).toBeLessThanOrEqual(view.box[3]);
        expect(wheel.rx).toBeGreaterThan(0);
      }
    }
    // De face et à 15°, la jante n'est pas visible : rien à faire tourner.
    expect(SHEET_WHEELS[0]).toHaveLength(0);
    expect(SHEET_WHEELS[15]).toHaveLength(0);
    for (const wheel of SHEET_WHEELS[90]) {
      expect(wheel.rx).toBe(wheelDiscSourceRadius(SEDAN_TURN_PROFILE.wheels[0][2]));
      expect(wheel.ry).toBe(wheel.rx);
    }
  });
});
