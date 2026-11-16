import { describe, expect, it } from "vitest";

import { cameraZoomFor } from "./leoBridgeLayout";
import { CITY_ZOOM_FACTOR, cityLayout } from "./leoCityLayout";
import { CITY_SPEED_LIMIT, MAX_SPEED, updateLeoMotion, type LeoMotionState } from "./leoDriving";
import { MAIN_LANE_Y, VEHICLE_LENGTH } from "./leoGeometry";
import {
  brakingDistance,
  CHILD_REACTION_SECONDS,
  framedViewRange,
  LOOK_AHEAD_RATIO,
  lookAheadFraming,
  lookDirection,
  MAX_SIGHT_DISTANCE,
  MIN_LOOK_RATIO,
  MIN_LOOK_ZOOM,
  reactionPhase,
  READOUT_RANGE,
  requiredSightDistance,
  SIGHT_MARGIN,
  signalReadout,
  smoothToward,
  visibleAhead,
} from "./leoSightline";
import { WORLD_ZONE_WIDTH, zoneIdsForRange, zoneForWorldX, zonesToKeep } from "./leoWorldZones";
import { PX_PER_METER } from "./leoUnits";

const FRAME = 1 / 60;
const NEEDED = (speed: number) => requiredSightDistance(speed) + VEHICLE_LENGTH / 2;

/** Largeur du monde visible en ville pour un cadre de `width` × `height` pixels (zoom de base). */
const cityViewWidth = (width: number, height: number) => width / (cameraZoomFor(width, height) * CITY_ZOOM_FACTOR);

describe("distance de visibilité : physique réelle, temps de réaction d'enfant, marge", () => {
  it("mesure la distance de freinage avec le vrai modèle de conduite, croissante avec la vitesse", () => {
    let previous = 0;
    for (const speed of [50, 150, 260, 390, 520]) {
      const distance = brakingDistance(speed);
      expect(distance).toBeGreaterThan(previous);
      previous = distance;
    }
    // Contrôle indépendant : on refait la mesure ici, image par image.
    let state: LeoMotionState = { x: 1000, y: MAIN_LANE_Y, speed: 390, heading: 0, steeringAngle: 0 };
    const start = state.x;
    for (let frame = 0; frame < 3000 && state.speed > 0; frame += 1) {
      state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: true, reverse: false }, FRAME);
    }
    expect(brakingDistance(390)).toBeCloseTo(state.x - start, -0.5);
  });

  it("additionne réaction, freinage et marge, et grandit avec la vitesse", () => {
    const v = 260;
    const reaction = reactionPhase(v);
    expect(reaction.distance).toBeGreaterThanOrEqual(v * CHILD_REACTION_SECONDS - 1);
    expect(requiredSightDistance(v)).toBeCloseTo(reaction.distance + brakingDistance(reaction.speed) + SIGHT_MARGIN, 6);
    expect(requiredSightDistance(MAX_SPEED)).toBe(MAX_SIGHT_DISTANCE);
    expect(requiredSightDistance(0)).toBeGreaterThan(SIGHT_MARGIN);
    expect(CHILD_REACTION_SECONDS).toBeGreaterThan(0.75);
  });

  it("permet vraiment de s'arrêter avant la ligne : voir le feu à la distance calculée, réagir, freiner", () => {
    for (const speed of [150, 260, 390, MAX_SPEED]) {
      const lineFront = 10_000;
      const startFront = lineFront - requiredSightDistance(speed);
      let state: LeoMotionState = { x: startFront - VEHICLE_LENGTH / 2, y: MAIN_LANE_Y, speed, heading: 0, steeringAngle: 0 };
      // L'enfant voit le feu, réagit (la voiture roule encore à pleine vitesse), puis freine à fond.
      for (let frame = 0; frame < CHILD_REACTION_SECONDS * 60; frame += 1) {
        state = updateLeoMotion(state, { left: false, right: false, forward: true, brake: false, reverse: false }, FRAME);
      }
      for (let frame = 0; frame < 3000 && state.speed > 0; frame += 1) {
        state = updateLeoMotion(state, { left: false, right: false, forward: false, brake: true, reverse: false }, FRAME);
      }
      expect(state.speed).toBe(0);
      expect(state.x + VEHICLE_LENGTH / 2).toBeLessThan(lineFront);
    }
  });
});

describe("caméra à anticipation", () => {
  it("place Léo à 30 % de l'écran quand il roule, avec plus de route devant", () => {
    const framing = lookAheadFraming(100, 1700);
    expect(framing.ratio).toBe(LOOK_AHEAD_RATIO);
    expect(framing.zoomFactor).toBe(1);
    expect(visibleAhead(framing, 1700)).toBeCloseTo(0.7 * 1700, 6);
  });

  it("voit toujours le feu avant la distance de freinage jusqu'à la limite de la route (50 km/h), sur tous les écrans", () => {
    const screens: Array<[number, number]> = [[1150, 592], [870, 592], [430, 480], [390, 400], [360, 480], [320, 400]];
    for (const [width, height] of screens) {
      const viewWidth = cityViewWidth(width, height);
      for (const speed of [0, 100, 260, 390, CITY_SPEED_LIMIT]) {
        const framing = lookAheadFraming(speed, viewWidth);
        expect(framing.ratio).toBeGreaterThanOrEqual(MIN_LOOK_RATIO);
        expect(framing.ratio).toBeLessThanOrEqual(LOOK_AHEAD_RATIO);
        expect(framing.zoomFactor).toBeGreaterThanOrEqual(MIN_LOOK_ZOOM);
        expect(visibleAhead(framing, viewWidth)).toBeGreaterThanOrEqual(NEEDED(speed) - 1e-6);
      }
    }
  });

  it("cas le plus défavorable : limite de la route, feu rouge, écran mobile étroit", () => {
    const viewWidth = cityViewWidth(320, 400);
    const framing = lookAheadFraming(CITY_SPEED_LIMIT, viewWidth);
    // Le cadrage recule Léo vers le bord et élargit un peu le champ ; la physique n'est pas touchée.
    expect(framing.ratio).toBe(MIN_LOOK_RATIO);
    expect(framing.zoomFactor).toBeLessThan(1);
    expect(framing.zoomFactor).toBeGreaterThanOrEqual(MIN_LOOK_ZOOM);
    const city = cityLayout();
    const distanceWhenSeen = requiredSightDistance(CITY_SPEED_LIMIT);
    const leoX = city.stopLineEast - distanceWhenSeen - VEHICLE_LENGTH / 2;
    const range = framedViewRange(leoX, 1, framing, viewWidth);
    // La ligne d'arrêt est dans le champ au moment où l'enfant doit commencer à réagir.
    expect(range.maxX).toBeGreaterThanOrEqual(city.stopLineEast - 0.5);
    // L'indicateur annonce le feu rouge et la consigne bien avant, dans les mêmes unités que le compteur.
    const readout = signalReadout(leoX + VEHICLE_LENGTH / 2, city.stopLineEast, "RED", CITY_SPEED_LIMIT);
    expect(readout?.prepare).toBe(true);
    expect(readout?.state).toBe("RED");
    // Distance affichée en mètres réels : px du monde / PX_PER_METER, arrondie au mètre.
    expect(Math.abs((readout?.distance ?? 0) - distanceWhenSeen / PX_PER_METER)).toBeLessThanOrEqual(0.5);
  });

  it("garde le champ minimal utile : en dessous d'un certain champ (px du monde), tout ne peut plus être montré", () => {
    // Limite documentée : avec le dézoom maximal il faut au moins ce champ pour la vitesse maximale.
    const minimumView = (NEEDED(CITY_SPEED_LIMIT) * MIN_LOOK_ZOOM) / (1 - MIN_LOOK_RATIO);
    expect(minimumView).toBeLessThan(cityViewWidth(320, 400));
  });

  it("au-delà de la limite (voiture jusqu'à 120 km/h), la caméra ne peut plus tout montrer, mais l'indicateur prévient à la distance d'arrêt", () => {
    const viewWidth = cityViewWidth(1150, 592);
    const framing = lookAheadFraming(MAX_SPEED, viewWidth);
    expect(framing).toEqual(lookAheadFraming(CITY_SPEED_LIMIT, viewWidth));
    expect(visibleAhead(framing, viewWidth)).toBeLessThan(NEEDED(MAX_SPEED));
    // À 120 km/h il faut voir le feu à plus de 100 m : l'indicateur l'annonce dès cette distance.
    expect(requiredSightDistance(MAX_SPEED) / PX_PER_METER).toBeGreaterThan(100);
    expect(READOUT_RANGE).toBeGreaterThan(requiredSightDistance(MAX_SPEED));
    const front = 20_000 - requiredSightDistance(MAX_SPEED);
    const readout = signalReadout(front, 20_000, "RED", MAX_SPEED);
    expect(readout?.prepare).toBe(true);
  });

  it("passe de 30 % à 70 % en marche arrière pour montrer la route derrière, sans rotation ni saut", () => {
    expect(lookDirection(1, 200)).toBe(1);
    expect(lookDirection(1, -100)).toBe(-1);
    expect(lookDirection(-1, 0)).toBe(-1);
    expect(lookDirection(1, 5)).toBe(1);
    const viewWidth = 1300;
    const framing = lookAheadFraming(100, viewWidth);
    const forward = framedViewRange(5000, 1, framing, viewWidth);
    const backward = framedViewRange(5000, -1, framing, viewWidth);
    expect(forward.minX).toBeCloseTo(5000 - 0.3 * viewWidth, 6);
    expect(backward.maxX).toBeCloseTo(5000 + 0.3 * viewWidth, 6);
    // En marche arrière, il y a davantage de route visible derrière (à l'ouest) que devant.
    expect(5000 - backward.minX).toBeGreaterThan(backward.maxX - 5000);
  });

  it("se déplace de façon fluide : lissage exponentiel indépendant du nombre d'images par seconde", () => {
    const one = smoothToward(0.3, 0.15, 2.2, 1 / 30);
    const two = smoothToward(smoothToward(0.3, 0.15, 2.2, 1 / 60), 0.15, 2.2, 1 / 60);
    expect(one).toBeCloseTo(two, 9);
    let value = 0.3;
    let previous = value;
    for (let frame = 0; frame < 240; frame += 1) {
      value = smoothToward(value, 0.15, 2.2, FRAME);
      expect(value).toBeLessThanOrEqual(previous);
      expect(previous - value).toBeLessThan(0.01);
      previous = value;
    }
    expect(value).toBeCloseTo(0.15, 2);
  });

  it("ne dépend que de la caméra : les coordonnées de la voiture ne sont jamais recalculées", () => {
    const state: LeoMotionState = { x: 12000, y: MAIN_LANE_Y, speed: 300, heading: 0, steeringAngle: 0 };
    const before = { ...state };
    framedViewRange(state.x, 1, lookAheadFraming(state.speed, 1100), 1100);
    expect(state).toEqual(before);
  });
});

describe("chargement des zones : prêtes avant d'entrer dans le champ, jamais retirées trop tôt", () => {
  it("garde chargées toutes les zones que la vue peut montrer, devant comme derrière", () => {
    for (const viewWidth of [1045, 1341, 1706]) {
      for (const speed of [0, 260, MAX_SPEED]) {
        const framing = lookAheadFraming(speed, viewWidth);
        for (const direction of [1, -1] as const) {
          for (let x = 11_000; x <= 16_000; x += 25) {
            const range = framedViewRange(x, direction, framing, viewWidth);
            const loaded = new Set(zonesToKeep(x, range.minX, range.maxX));
            for (const id of zoneIdsForRange(range.minX, range.maxX)) expect(loaded.has(id)).toBe(true);
          }
        }
      }
    }
  });

  it("charge la zone suivante avant que le feu entre dans le champ", () => {
    const city = cityLayout();
    const framing = lookAheadFraming(MAX_SPEED, cityViewWidth(320, 400));
    const viewWidth = cityViewWidth(320, 400);
    // Quand la ligne d'arrêt entre dans le champ, la zone qui la porte est déjà chargée.
    for (let x = city.stopLineEast - 2500; x <= city.stopLineEast; x += 25) {
      const range = framedViewRange(x, 1, framing, viewWidth);
      if (range.maxX >= city.stopLineEast) {
        expect(zonesToKeep(x, range.minX, range.maxX)).toContain(zoneForWorldX(city.stopLineEast).id);
        expect(zonesToKeep(x, range.minX, range.maxX)).toContain(zoneForWorldX(city.lightX).id);
        break;
      }
    }
    // Les zones lointaines, elles, sont libérées : au plus quatre zones à la fois.
    const range = framedViewRange(city.stopLineEast, 1, framing, viewWidth);
    expect(zonesToKeep(city.stopLineEast, range.minX, range.maxX).length).toBeLessThanOrEqual(4);
    expect(WORLD_ZONE_WIDTH).toBeGreaterThan(viewWidth);
  });
});

describe("indicateur d'approche du feu", () => {
  const line = cityLayout().stopLineEast;

  it("n'apparaît ni trop loin, ni une fois la ligne dépassée", () => {
    expect(signalReadout(line - READOUT_RANGE - 50, line, "GREEN", 200)).toBeNull();
    expect(signalReadout(line + 5, line, "RED", 0)).toBeNull();
    expect(signalReadout(line, line, "RED", 0)).toBeNull();
    expect(signalReadout(line - READOUT_RANGE + 10, line, "GREEN", 200)).not.toBeNull();
  });

  it("annonce la distance réelle en mètres (px du monde / PX_PER_METER, arrondie au mètre), pour chaque état", () => {
    for (const raw of [150, 333, 702, 1000]) {
      const readout = signalReadout(line - raw, line, "GREEN", 200);
      expect(readout).not.toBeNull();
      expect(Math.abs((readout?.distance ?? 0) - raw / PX_PER_METER)).toBeLessThanOrEqual(0.5);
      expect(Number.isInteger(readout?.distance)).toBe(true);
    }
    // 150 px du monde = 4,06 m : le feu est annoncé à 4 m, pas à « 150 m ».
    expect(signalReadout(line - 150, line, "GREEN", 200)?.distance).toBe(4);
  });

  it("ne demande de se préparer qu'aux feux rouge et orange", () => {
    expect(signalReadout(line - 150, line, "GREEN", 260)?.prepare).toBe(false);
    expect(signalReadout(line - 150, line, "YELLOW", 260)?.prepare).toBe(true);
    expect(signalReadout(line - 150, line, "RED", 260)?.prepare).toBe(true);
    expect(signalReadout(line - 1000, line, "RED", 100)?.prepare).toBe(false);
  });
});
