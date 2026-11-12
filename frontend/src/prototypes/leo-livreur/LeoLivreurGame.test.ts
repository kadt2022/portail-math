import { describe, expect, it } from "vitest";

import {
  isLeoRoadPoint,
  MAX_STEERING_ANGLE,
  CAR_SPRITE_HEADING_OFFSET,
  CAR_WHEEL_HUBS,
  BRANCH_LANE_X,
  MAIN_LANE_Y,
  ROAD_Y,
  updateLeoMotion,
  type LeoMotionState,
} from "./LeoLivreurGame";

const stopped: LeoMotionState = {
  x: 300,
  y: MAIN_LANE_Y,
  speed: 0,
  heading: 0,
  steeringAngle: 0,
};

describe("conduite de Léo", () => {
  it("ne fait pas tourner une voiture immobile sur elle-même", () => {
    const next = updateLeoMotion(stopped, { left: true, right: false, forward: false, brake: false }, 1 / 60);
    expect(next.x).toBe(stopped.x);
    expect(next.y).toBe(stopped.y);
    expect(next.heading).toBe(stopped.heading);
    expect(next.steeringAngle).toBeLessThan(0);
  });

  it("accélère progressivement puis freine réellement", () => {
    const rolling = updateLeoMotion(stopped, { left: false, right: false, forward: true, brake: false }, 1 / 60);
    const faster = updateLeoMotion(rolling, { left: false, right: false, forward: true, brake: false }, 1 / 60);
    const braking = updateLeoMotion(faster, { left: false, right: false, forward: false, brake: true }, 1 / 60);
    expect(rolling.speed).toBeGreaterThan(0);
    expect(faster.speed).toBeGreaterThan(rolling.speed);
    expect(braking.speed).toBeLessThan(faster.speed);
  });

  it("limite le braquage à trente degrés et revient vers le centre", () => {
    const turning = updateLeoMotion(stopped, { left: true, right: false, forward: true, brake: false }, 1 / 60);
    expect(Math.abs(turning.steeringAngle)).toBeLessThanOrEqual(MAX_STEERING_ANGLE);
    const centered = updateLeoMotion(turning, { left: false, right: false, forward: true, brake: false }, 1 / 60);
    expect(Math.abs(centered.steeringAngle)).toBeLessThan(Math.abs(turning.steeringAngle));
  });

  it("braque progressivement à gauche et modifie la trajectoire en roulant", () => {
    let state = { ...stopped };
    for (let frame = 0; frame < 30; frame += 1) {
      state = updateLeoMotion(state, { left: true, right: false, forward: true, brake: false }, 1 / 60);
    }
    expect(state.steeringAngle).toBeLessThan(0);
    expect(state.heading).toBeLessThan(0);
    expect(state.y).toBeLessThan(stopped.y);
  });

  it("braque progressivement à droite sans rotation sur place", () => {
    const moving = { ...stopped, speed: 120 };
    const state = updateLeoMotion(moving, { left: false, right: true, forward: true, brake: false }, 1 / 60);
    expect(state.steeringAngle).toBeGreaterThan(0);
    expect(state.heading).toBeGreaterThan(0);
    expect(state.y).toBeGreaterThan(moving.y);
    const stationary = updateLeoMotion(stopped, { left: false, right: true, forward: false, brake: false }, 1 / 60);
    expect(stationary.heading).toBe(0);
  });

  it("garde exactement deux moyeux animés sur la voiture", async () => {
    expect(CAR_WHEEL_HUBS).toHaveLength(2);
    expect(CAR_WHEEL_HUBS[0][0]).toBeLessThan(CAR_WHEEL_HUBS[1][0]);
  });

  it("conserve un offset visuel fixe pour aligner le sprite avec la route", () => {
    expect(CAR_SPRITE_HEADING_OFFSET).toBeLessThan(0);
    expect(CAR_SPRITE_HEADING_OFFSET).toBeGreaterThan(-30);
  });

  it("permet de quitter la route principale et de rejoindre la branche", () => {
    let state = { ...stopped };
    for (let frame = 0; frame < 145; frame += 1) {
      state = updateLeoMotion(state, { left: false, right: false, forward: true, brake: false }, 1 / 60);
    }
    expect(state.x).toBeGreaterThan(800);
    for (let frame = 0; frame < 90; frame += 1) {
      state = updateLeoMotion(state, { left: true, right: false, forward: true, brake: false }, 1 / 60);
    }
    expect(state.speed).toBeGreaterThan(0);
    expect(isLeoRoadPoint(state.x, state.y)).toBe(true);
    expect(state.y).toBeLessThan(stopped.y - 40);
  });

  it("définit la route et refuse les champs", () => {
    expect(isLeoRoadPoint(300, 600)).toBe(true);
    expect(isLeoRoadPoint(930, 340)).toBe(true);
    expect(isLeoRoadPoint(300, 420)).toBe(false);
    expect(isLeoRoadPoint(600, 280)).toBe(false);
  });

  it("définit les voies de circulation à droite", () => {
    expect(MAIN_LANE_Y).toBeGreaterThan(ROAD_Y);
    expect(BRANCH_LANE_X).toBeGreaterThan(930);
    expect(isLeoRoadPoint(300, MAIN_LANE_Y)).toBe(true);
    expect(isLeoRoadPoint(BRANCH_LANE_X, 340)).toBe(true);
  });

  it("bloque le déplacement lorsqu'une manœuvre quitte la chaussée", () => {
    const nearEdge: LeoMotionState = { x: 300, y: 530, speed: 240, heading: -Math.PI / 2, steeringAngle: 0 };
    const next = updateLeoMotion(nearEdge, { left: false, right: false, forward: true, brake: false }, 1 / 60);
    expect(next.x).toBe(nearEdge.x);
    expect(next.y).toBe(nearEdge.y);
    expect(next.speed).toBe(0);
  });
});
