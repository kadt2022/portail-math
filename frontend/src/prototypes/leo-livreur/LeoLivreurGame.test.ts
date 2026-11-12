import { describe, expect, it } from "vitest";

import {
  BRANCH_LANE_X,
  canDeliver,
  DESTINATIONS,
  INTERSECTION_X,
  isInCorrectLane,
  isLeoRoadPoint,
  isVehicleOnRoad,
  laneAt,
  MAIN_LANE_Y,
  normalizeAngle,
  ROAD_Y,
  ROUTE_LENGTH_METERS,
  START_POSITION,
  VEHICLE_WIDTH,
  vehicleCorners,
} from "./leoGeometry";
import {
  MAX_SPEED,
  MAX_STEERING_ANGLE,
  updateLeoMotion,
  type LeoMotionInput,
  type LeoMotionState,
} from "./leoDriving";
import { vehicleViewForHeading } from "./leoVehicleView";

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
    expect(hold(stopped, { forward: true }, () => false, 300).speed).toBe(MAX_SPEED);
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

  it("Freiner immobilise réellement la voiture, sans la faire reculer", () => {
    const rolling = hold(stopped, { forward: true }, () => false, 120);
    expect(rolling.speed).toBeGreaterThan(100);
    const stoppedAgain = hold(rolling, { brake: true }, (s) => s.speed === 0, 60);
    expect(stoppedAgain.speed).toBe(0);
    expect(stoppedAgain.x).toBeLessThan(rolling.x + 100);
  });

  it("le braquage revient vers le centre quand on relâche", () => {
    const turning = hold({ ...stopped, speed: 100 }, { left: true }, () => false, 20);
    const centered = hold(turning, {}, () => false, 60);
    expect(centered.steeringAngle).toBe(0);
  });
});

describe("virage à 90° et suivi routier", () => {
  it("quitte la route principale et monte la branche par un virage à gauche choisi par le joueur", () => {
    let state = hold(stopped, { forward: true }, (s) => s.x >= 780);
    state = hold(state, { forward: true, left: true }, (s) => s.heading <= -Math.PI / 2 + 0.05, 300);
    expect(deg(state.heading)).toBeLessThan(-85);
    state = hold(state, { forward: true }, (s) => s.y <= 380, 300);
    expect(isVehicleOnRoad(state)).toBe(true);
    expect(Math.abs(state.x - BRANCH_LANE_X)).toBeLessThan(30);
    expect(laneAt(state.x, state.y)).toBe("branch-right");
  });

  it("sans action du joueur, la voiture ne tourne pas toute seule à l'intersection", () => {
    const state = hold(stopped, { forward: true }, (s) => s.x > INTERSECTION_X + 200);
    expect(state.heading).toBe(0);
    expect(state.y).toBe(MAIN_LANE_Y);
  });

  it("reste dans les zones routières : un obstacle ne la téléporte jamais hors chaussée", () => {
    for (const heading of [-Math.PI / 2, Math.PI / 2, Math.PI, -2.5, 1]) {
      const state = hold({ ...stopped, x: 400, y: ROAD_Y, heading, speed: 240 }, { forward: true }, () => false, 240);
      expect(isVehicleOnRoad(state)).toBe(true);
    }
  });

  it("le contrôle porte sur l'empreinte entière : la carrosserie ne déborde pas du bord", () => {
    const hugging = hold({ ...stopped, heading: -0.3, speed: 200 }, { forward: true }, () => false, 120);
    expect(isVehicleOnRoad(hugging)).toBe(true);
    expect(Math.min(...vehicleCorners(hugging).map(([, y]) => y))).toBeGreaterThanOrEqual(ROAD_Y - 70);
    expect(isLeoRoadPoint(300, ROAD_Y - 90)).toBe(false);
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
  it("Freiner maintenu à l'arrêt recule lentement, mais pas en roulant", () => {
    const rolling = hold(stopped, { forward: true }, () => false, 60);
    const braking = hold(rolling, { brake: true }, () => false, 5);
    expect(braking.speed).toBeGreaterThanOrEqual(0);
    const reversing = hold({ ...stopped, x: 400 }, { brake: true }, (s) => s.speed < -20, 120);
    expect(reversing.speed).toBeLessThan(-20);
    expect(reversing.x).toBeLessThan(400);
    expect(reversing.heading).toBe(0);
  });

  it("depuis le bout de la branche, on peut ressortir en marche arrière et repartir vers l'est", () => {
    let state: LeoMotionState = { x: BRANCH_LANE_X, y: 313, speed: 0, heading: -1.62, steeringAngle: 0 };
    state = hold(state, { brake: true }, (s) => s.y >= 580, 900);
    state = hold(state, { brake: true, left: true }, (s) => s.heading >= -0.4, 600);
    state = hold(state, {}, (s) => s.speed === 0, 200);
    state = hold(state, { forward: true, right: true }, (s) => s.heading >= -0.02, 300);
    expect(Math.abs(state.heading)).toBeLessThan(0.1);
    expect(state.y).toBeGreaterThan(ROAD_Y);
    expect(isInCorrectLane(state)).toBe(true);
    expect(isVehicleOnRoad(state)).toBe(true);
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
    expect(laneAt(house1.stop.x, house1.stop.y)).toBe("branch-right");
    expect(laneAt(house2.stop.x, house2.stop.y)).toBe("main-right");
    expect(laneAt(house3.stop.x, house3.stop.y)).toBe("main-right");
  });

  it("déploie un parcours de plusieurs kilomètres avec des étapes espacées", () => {
    expect(ROUTE_LENGTH_METERS).toBeGreaterThan(10_000);
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(10);
    expect(DESTINATIONS.at(-1)?.stop.x).toBeGreaterThan(10_000);
    expect(isLeoRoadPoint(11_600, MAIN_LANE_Y)).toBe(true);
  });
});

describe("parcours complet piloté uniquement avec Gauche, Avancer, Freiner, Droite", () => {
  it("restaurant → Maison 1 → route principale → Maison 2 → Maison 3, sans téléportation", () => {
    const [house1, house2, house3] = DESTINATIONS;
    let state = stopped;
    let previous = state;
    let delivered = 0;
    const checkpoints: string[] = [];
    const advance = (input: Partial<LeoMotionInput>, until: (s: LeoMotionState) => boolean, max = 900) => {
      for (let frame = 0; frame < max && !until(state); frame += 1) {
        state = step(state, input);
        // Aucune téléportation : jamais plus de 6 px entre deux images (260 px/s à 60 Hz = 4,4 px).
        expect(Math.hypot(state.x - previous.x, state.y - previous.y)).toBeLessThan(6);
        expect(isVehicleOnRoad(state)).toBe(true);
        previous = state;
      }
    };
    const deliver = () => {
      expect(canDeliver(state.x, state.y, state.speed, delivered)).toBe(true);
      delivered += 1;
      checkpoints.push(`maison ${delivered}`);
    };

    // Restaurant → route principale → virage à gauche à l'intersection → Maison 1.
    advance({ forward: true }, (s) => s.x >= 780);
    advance({ forward: true, left: true }, (s) => s.heading <= -Math.PI / 2 + 0.05, 300);
    advance({ forward: true }, (s) => s.y <= 385, 300);
    advance({ brake: true }, (s) => s.speed === 0, 120);
    deliver();

    // Maison 1 → route principale : marche arrière, demi-tour en trois temps.
    advance({ brake: true }, (s) => s.y >= 580);
    advance({ brake: true, left: true }, (s) => s.heading >= -0.4, 600);
    advance({}, (s) => s.speed === 0, 200);
    advance({ forward: true, right: true }, (s) => s.heading >= -0.02, 300);
    expect(state.y).toBeGreaterThan(ROAD_Y);
    expect(isInCorrectLane(state)).toBe(true);

    // Route principale → Maison 2.
    advance({ forward: true }, (s) => s.x >= house2.stop.x - 85);
    advance({ brake: true }, (s) => s.speed === 0, 120);
    deliver();

    // Maison 2 → Maison 3, toujours à droite.
    advance({ forward: true }, (s) => s.x >= house3.stop.x - 85);
    advance({ brake: true }, (s) => s.speed === 0, 120);
    deliver();

    // Cette non-régression couvre les trois premières étapes historiques. Les
    // étapes suivantes prolongent maintenant le parcours jusqu'à plusieurs km.
    expect(delivered).toBe(3);
    expect(checkpoints).toEqual(["maison 1", "maison 2", "maison 3"]);
    expect(house1.stop.y).toBeLessThan(ROAD_Y);
  });
});
