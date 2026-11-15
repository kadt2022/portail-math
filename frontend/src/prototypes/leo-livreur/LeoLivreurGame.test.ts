import { describe, expect, it } from "vitest";

import {
  canDeliver,
  DESTINATIONS,
  destinationForDelivery,
  isInCorrectLane,
  isLeoRoadPoint,
  isVehicleOnRoad,
  laneAt,
  MAIN_LANE_Y,
  normalizeAngle,
  ROAD_HALF_WIDTH,
  ROAD_Y,
  ROUTE_LENGTH_METERS,
  START_POSITION,
  VEHICLE_WIDTH,
  vehicleCorners,
} from "./leoGeometry";
import {
  CITY_SPEED_LIMIT,
  MAX_REVERSE_SPEED,
  MAX_SPEED,
  MAX_STEERING_ANGLE,
  updateLeoMotion,
  type LeoMotionInput,
  type LeoMotionState,
} from "./leoDriving";
import { vehicleViewForHeading } from "./leoVehicleView";
import { brakingDistance } from "./leoSightline";

const NONE: LeoMotionInput = { left: false, right: false, forward: false, brake: false };
const stopped: LeoMotionState = { ...START_POSITION, speed: 0, heading: 0, steeringAngle: 0 };
const FRAME = 1 / 60;

function step(state: LeoMotionState, input: Partial<LeoMotionInput>) {
  return updateLeoMotion(state, { ...NONE, ...input }, FRAME);
}

/** Tient `input` jusqu'à ce que `until` soit vrai (ou `max` images). Seules les quatre commandes sont utilisées. */
function hold(state: LeoMotionState, input: Partial<LeoMotionInput>, until: (s: LeoMotionState) => boolean, max = 900) {
  let current = state;
  for (let frame = 0; frame < max && !until(current); frame += 1) current = step(current, input);
  return current;
}

/** Distance d'arrêt approximative d'un joueur prudent : il commence à freiner assez tôt. */
// Distance d'arrêt mesurée avec le vrai modèle de conduite (freinage à fond, pédale progressive), plus une petite marge.
const stoppingDistance = (speed: number) => brakingDistance(speed) + 20;

const deg = (radians: number) => (radians * 180) / Math.PI;

describe("démarrage et orientation", () => {
  it("démarre dans la voie de droite, sans toucher la ligne centrale", () => {
    expect(laneAt(stopped.x, stopped.y)).toBe("main-right");
    expect(isInCorrectLane(stopped)).toBe(true);
    const yMin = Math.min(...vehicleCorners(stopped).map(([, y]) => y));
    expect(yMin).toBeGreaterThan(ROAD_Y + 4);
    expect(isVehicleOnRoad(stopped)).toBe(true);
  });

  it("choisit le vrai profil, la face ou le dos selon la direction de roulage", () => {
    expect(vehicleViewForHeading(0)).toEqual({ sprite: "right", angleDeg: 0 });
    const west = vehicleViewForHeading(Math.PI);
    expect(west.sprite).toBe("left");
    expect(west.angleDeg).toBeCloseTo(0, 6);
    expect(vehicleViewForHeading(Math.PI / 2)).toEqual({ sprite: "front", angleDeg: 0 });
    expect(vehicleViewForHeading(-Math.PI / 2)).toEqual({ sprite: "back", angleDeg: 0 });
  });

  it("à cap 0 la carrosserie est parallèle à la route : aucun décalage appliqué", () => {
    expect(vehicleViewForHeading(0).angleDeg).toBe(0);
  });

  it("affiche toujours le cap logique, sans rotation partielle ni mélange", () => {
    for (const degrees of [-50, -30, 0, 30, 50]) {
      const view = vehicleViewForHeading((degrees * Math.PI) / 180);
      expect(view.sprite).toBe("right");
      expect(view.angleDeg).toBeCloseTo(degrees, 6);
    }
    expect(vehicleViewForHeading((150 * Math.PI) / 180).sprite).toBe("left");
  });

  it("normalise le cap pour qu'il ne dérive jamais au-delà d'un demi-tour", () => {
    expect(Math.abs(normalizeAngle(3 * Math.PI))).toBeCloseTo(Math.PI, 6);
    expect(normalizeAngle(2 * Math.PI + 0.5)).toBeCloseTo(0.5, 6);
    const spinning = hold({ ...stopped, speed: 200 }, { forward: true, left: true }, () => false, 600);
    expect(Math.abs(spinning.heading)).toBeLessThanOrEqual(Math.PI);
  });
});

describe("commandes", () => {
  it("Avancer accélère progressivement jusqu'à la vitesse maximale", () => {
    const first = step(stopped, { forward: true });
    const second = step(first, { forward: true });
    expect(first.speed).toBeGreaterThan(0);
    expect(second.speed).toBeGreaterThan(first.speed);
    expect(first.speed).toBeLessThan(MAX_SPEED / 10);
    // 0 → 120 km/h en environ 18 s (voiture de référence) : on maintient Avancer 25 s.
    expect(hold(stopped, { forward: true }, () => false, 1500).speed).toBe(MAX_SPEED);
    expect(second.x).toBeGreaterThan(stopped.x);
  });

  it("Gauche et Droite pivotent progressivement le braquage, limité à 30°", () => {
    const left = step(stopped, { left: true });
    expect(left.steeringAngle).toBeLessThan(0);
    expect(left.steeringAngle).toBeGreaterThan(-MAX_STEERING_ANGLE);
    const full = hold(stopped, { left: true }, () => false, 60);
    expect(deg(full.steeringAngle)).toBeCloseTo(-30, 5);
    const right = hold(stopped, { right: true }, () => false, 60);
    expect(deg(right.steeringAngle)).toBeCloseTo(30, 5);
    expect(step(stopped, { left: true, right: true }).steeringAngle).toBe(0);
  });

  it("Avancer + Gauche change la trajectoire vers le haut de l'écran", () => {
    const state = hold({ ...stopped, speed: 150 }, { forward: true, left: true }, () => false, 30);
    expect(state.heading).toBeLessThan(0);
    expect(state.y).toBeLessThan(stopped.y);
  });

  it("Avancer + Droite change la trajectoire vers le bas de l'écran, symétriquement", () => {
    const base = { ...stopped, y: ROAD_Y, speed: 150 };
    const left = hold(base, { forward: true, left: true }, () => false, 8);
    const right = hold(base, { forward: true, right: true }, () => false, 8);
    expect(right.heading).toBeCloseTo(-left.heading, 6);
    expect(right.y - base.y).toBeCloseTo(base.y - left.y, 3);
  });

  it("une voiture arrêtée ne pivote pas sur place", () => {
    const next = hold(stopped, { left: true }, () => false, 120);
    expect(next.heading).toBe(0);
    expect(next.x).toBe(stopped.x);
    expect(next.y).toBe(stopped.y);
  });

  it("Freiner : d'abord une décélération progressive, puis l'arrêt réel, sans reculer", () => {
    // Depuis 50 km/h (limite de la route).
    const rolling = { ...stopped, speed: CITY_SPEED_LIMIT };
    // Aucune décélération instantanée : la pédale s'enfonce, la voiture ralentit d'abord peu.
    const first = step(rolling, { brake: true });
    expect(first.speed).toBeGreaterThan(rolling.speed * 0.97);
    const tenth = hold(rolling, { brake: true }, () => false, 6);
    expect(tenth.speed).toBeGreaterThan(rolling.speed * 0.8);
    // Vitesse strictement décroissante jusqu'à l'arrêt complet, qui prend un vrai temps.
    let state = rolling;
    let frames = 0;
    let previous = state.speed;
    while (state.speed > 0 && frames < 600) {
      state = step(state, { brake: true });
      expect(state.speed).toBeLessThanOrEqual(previous);
      previous = state.speed;
      frames += 1;
    }
    expect(state.speed).toBe(0);
    expect(frames).toBeGreaterThan(60);
    expect(frames).toBeLessThan(180);
    expect(state.x - rolling.x).toBeGreaterThan(150);
    // Relâcher tout ralentit aussi, plus doucement que le frein.
    const coasting = hold(rolling, {}, () => false, 60);
    expect(coasting.speed).toBeLessThan(rolling.speed);
    expect(coasting.speed).toBeGreaterThan(state.speed);
  });

  it("ne freine jamais instantanément, à aucune vitesse", () => {
    for (const speed of [80, 200, 360, 520]) {
      const start = { ...stopped, speed };
      const next = step(start, { brake: true });
      expect(next.speed).toBeGreaterThan(speed * 0.96);
    }
  });

  it("adapte la vitesse maximale au trafic : libre = pleine vitesse, véhicule devant = on s'aligne dessus", () => {
    const free = hold(stopped, { forward: true }, () => false, 1500);
    expect(free.speed).toBe(MAX_SPEED);
    let capped = free;
    for (let frame = 0; frame < 240; frame += 1) capped = updateLeoMotion(capped, { ...NONE, forward: true }, FRAME, undefined, 200);
    expect(capped.speed).toBe(200);
    // Le ralentissement est progressif : jamais de saut d'une image à l'autre.
    let previous = free.speed;
    let state = free;
    for (let frame = 0; frame < 120; frame += 1) {
      state = updateLeoMotion(state, { ...NONE, forward: true }, FRAME, undefined, 200);
      expect(previous - state.speed).toBeLessThan(5);
      previous = state.speed;
    }
  });

  it("le braquage revient vers le centre quand on relâche", () => {
    const turning = hold({ ...stopped, speed: 100 }, { left: true }, () => false, 20);
    const centered = hold(turning, {}, () => false, 60);
    expect(centered.steeringAngle).toBe(0);
  });
});

describe("chaussée principale uniquement", () => {
  it("garde Léo sur la route droite lorsqu'il braque vers un côté", () => {
    const state = hold(stopped, { forward: true, left: true }, (s) => s.y < ROAD_Y - 10, 300);
    expect(isVehicleOnRoad(state)).toBe(true);
    expect(Math.abs(state.y - ROAD_Y)).toBeLessThanOrEqual(ROAD_HALF_WIDTH);
    expect(laneAt(state.x, state.y)).toBe("main-left");
  });

  it("roule tout droit sans bifurcation sur toute la chaussée", () => {
    const state = hold(stopped, { forward: true }, (s) => s.x > 1500);
    expect(state.heading).toBe(0);
    expect(state.y).toBe(MAIN_LANE_Y);
    expect(isVehicleOnRoad(state)).toBe(true);
  });

  it("reste dans les zones routières : un obstacle ne la téléporte jamais hors chaussée", () => {
    for (const heading of [-Math.PI / 2, Math.PI / 2, Math.PI, -2.5, 1]) {
      const state = hold({ ...stopped, x: 400, y: ROAD_Y, heading, speed: 240 }, { forward: true }, () => false, 240);
      expect(isVehicleOnRoad(state)).toBe(true);
    }
  });

  it("le contrôle porte sur l'empreinte entière : la carrosserie ne déborde pas du bord", () => {
    const hugging = hold({ ...stopped, heading: -0.3, speed: 200 }, { forward: true }, () => false, 40);
    expect(isVehicleOnRoad(hugging)).toBe(true);
    expect(Math.min(...vehicleCorners(hugging).map(([, y]) => y))).toBeGreaterThanOrEqual(ROAD_Y - ROAD_HALF_WIDTH);
    expect(isLeoRoadPoint(300, ROAD_Y - ROAD_HALF_WIDTH - 10)).toBe(false);
    expect(VEHICLE_WIDTH).toBeLessThan(70);
  });

  it("contre un bord, on peut braquer et repartir : pas de blocage définitif", () => {
    let state: LeoMotionState = { ...stopped, x: 400, y: ROAD_Y + 20, heading: -Math.PI / 2, speed: 200 };
    state = hold(state, { forward: true }, () => false, 60);
    expect(isVehicleOnRoad(state)).toBe(true);
    // Vers l'est en tournant à droite, la voiture se dégage et roule le long de la route.
    state = hold(state, { forward: true, right: true }, (s) => Math.abs(s.heading) < 0.1, 400);
    state = hold(state, { forward: true }, () => false, 60);
    expect(Math.abs(state.heading)).toBeLessThan(0.3);
    expect(state.speed).toBeGreaterThan(100);
    expect(isVehicleOnRoad(state)).toBe(true);
  });
});

describe("marche arrière : revenir d'une mauvaise direction", () => {
  it("Reculer : à l'arrêt, la voiture recule progressivement, cap inchangé", () => {
    const reversing = hold({ ...stopped, x: 600 }, { reverse: true }, (s) => s.speed < -100, 300);
    expect(reversing.speed).toBeLessThan(-100);
    expect(reversing.speed).toBeGreaterThanOrEqual(-MAX_REVERSE_SPEED);
    expect(reversing.x).toBeLessThan(600);
    expect(reversing.heading).toBe(0);
    const first = step({ ...stopped, x: 600 }, { reverse: true });
    expect(first.speed).toBeLessThan(0);
    expect(first.speed).toBeGreaterThan(-10);
  });

  it("Reculer en roulant vers l'avant freine d'abord jusqu'à l'arrêt, sans inversion instantanée", () => {
    let state = hold(stopped, { forward: true }, () => false, 200);
    let previous = state.speed;
    for (let frame = 0; frame < 300 && state.speed > 0; frame += 1) {
      state = step(state, { reverse: true });
      expect(state.speed).toBeLessThanOrEqual(previous);
      expect(state.speed).toBeGreaterThanOrEqual(0);
      previous = state.speed;
    }
    expect(state.speed).toBe(0);
    state = hold(state, { reverse: true }, (s) => s.speed < -50, 120);
    expect(state.speed).toBeLessThan(-50);
  });

  it("Freiner à l'arrêt ne fait pas reculer", () => {
    const state = hold({ ...stopped, x: 600 }, { brake: true }, () => false, 120);
    expect(state.speed).toBe(0);
    expect(state.x).toBe(600);
  });

});

describe("livraison", () => {
  const [house1, house2, house3] = DESTINATIONS;

  it("n'est possible qu'à l'arrêt, dans la zone de la maison en cours", () => {
    expect(canDeliver(house1.stop.x, house1.stop.y, 0, 0)).toBe(true);
    expect(canDeliver(house1.stop.x, house1.stop.y, 30, 0)).toBe(false);
    expect(canDeliver(house2.stop.x, house2.stop.y, 0, 0)).toBe(false);
    expect(canDeliver(300, MAIN_LANE_Y, 0, 0)).toBe(false);
    expect(canDeliver(house2.stop.x, house2.stop.y, 0, 1)).toBe(true);
    expect(canDeliver(house1.stop.x, house1.stop.y, 0, 1)).toBe(false);
    expect(canDeliver(house3.stop.x, house3.stop.y, 0, 3)).toBe(false);
  });

  it("les zones d'arrêt sont sur la chaussée et dans la voie de droite", () => {
    for (const destination of DESTINATIONS) expect(isLeoRoadPoint(destination.stop.x, destination.stop.y)).toBe(true);
    expect(laneAt(house1.stop.x, house1.stop.y)).toBe("main-right");
    expect(laneAt(house2.stop.x, house2.stop.y)).toBe("main-right");
    expect(laneAt(house3.stop.x, house3.stop.y)).toBe("main-right");
  });

  it("déploie un parcours de plusieurs kilomètres avec des étapes espacées", () => {
    expect(ROUTE_LENGTH_METERS).toBe(Number.POSITIVE_INFINITY);
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(10);
    expect(DESTINATIONS.at(-1)?.stop.x).toBeGreaterThan(10_000);
    expect(isLeoRoadPoint(11_600, MAIN_LANE_Y)).toBe(true);
  });

  it("continue à créer des destinations jouables au-delà du premier cycle", () => {
    const next = destinationForDelivery(DESTINATIONS.length);
    const later = destinationForDelivery(DESTINATIONS.length + 8);
    expect(next.stop.x).toBeGreaterThan(DESTINATIONS.at(-1)!.stop.x);
    expect(later.stop.x).toBeGreaterThan(next.stop.x);
    expect(canDeliver(next.stop.x, next.stop.y, 0, DESTINATIONS.length)).toBe(true);
  });
});

describe("parcours complet piloté uniquement avec Gauche, Avancer, Freiner, Droite", () => {
  it("livre trois maisons successives sur la route droite, sans téléportation", () => {
    const [house1, house2, house3] = DESTINATIONS;
    let state = stopped;
    let previous = state;
    let delivered = 0;
    const checkpoints: string[] = [];
    const advance = (input: Partial<LeoMotionInput>, until: (s: LeoMotionState) => boolean, max = 900) => {
      for (let frame = 0; frame < max && !until(state); frame += 1) {
        state = step(state, input);
        // Aucune téléportation : jamais plus de 10 px entre deux images (520 px/s à 60 Hz = 8,7 px).
        expect(Math.hypot(state.x - previous.x, state.y - previous.y)).toBeLessThan(10);
        expect(isVehicleOnRoad(state)).toBe(true);
        previous = state;
      }
    };
    const deliver = () => {
      if (!canDeliver(state.x, state.y, state.speed, delivered)) throw new Error(`stop manqué: ${JSON.stringify({ x: state.x, y: state.y, v: state.speed, delivered })}`);
      delivered += 1;
      checkpoints.push(`maison ${delivered}`);
    };

    // Première livraison sur la chaussée principale.
    advance({ forward: true }, (s) => house1.stop.x - s.x <= stoppingDistance(s.speed), 900);
    advance({ brake: true }, (s) => s.speed === 0, 300);
    deliver();

    // Maison 1 → Maison 2 → Maison 3, toujours sur la route droite.
    advance({ forward: true }, (s) => house2.stop.x - s.x <= stoppingDistance(s.speed), 900);
    advance({ brake: true }, (s) => s.speed === 0, 300);
    deliver();

    // Maison 2 → Maison 3, toujours à droite.
    advance({ forward: true }, (s) => house3.stop.x - s.x <= stoppingDistance(s.speed), 900);
    advance({ brake: true }, (s) => s.speed === 0, 300);
    deliver();

    // Cette non-régression couvre les trois premières étapes historiques. Les
    // étapes suivantes prolongent maintenant le parcours jusqu'à plusieurs km.
    expect(delivered).toBe(3);
    expect(checkpoints).toEqual(["maison 1", "maison 2", "maison 3"]);
    expect(house1.stop.y).toBe(MAIN_LANE_Y);
  });
});
