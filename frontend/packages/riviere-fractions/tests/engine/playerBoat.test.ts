import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { createPlayerBoat, type PlayerBoatFrame } from "../../src/engine/scene/playerBoat";

// Le bateau du joueur dans une scène Babylon sans rendu : maillages, matériau partagé, pose sur l'eau et animation.

const LIGHT = {
  sunDirection: new Vector3(0.4, 0.8, -0.4).normalize(),
  sunColor: new Vector3(1, 1, 1),
  skyLight: new Vector3(0.5, 0.6, 0.7),
  groundLight: new Vector3(0.3, 0.3, 0.25),
  skyZenith: new Vector3(0.2, 0.5, 0.9),
  skyHorizon: new Vector3(0.8, 0.9, 1),
  fogColor: new Vector3(0.8, 0.9, 0.95),
  fogDensity: 0.002,
};

let engine: NullEngine | null = null;
afterEach(() => {
  engine?.dispose();
  engine = null;
});

function setup() {
  engine = new NullEngine();
  const scene = new Scene(engine);
  const shadow = new ShaderMaterial("shadow", scene, { vertexSource: "void main(){}", fragmentSource: "void main(){}" }, { attributes: ["position"], uniforms: [] });
  return { scene, boat: createPlayerBoat(scene, LIGHT, shadow) };
}

function sail(boat: ReturnType<typeof createPlayerBoat>, seconds: number, frame: Partial<PlayerBoatFrame>, start = 0) {
  let time = start;
  for (let i = 0; i < seconds * 60; i += 1) {
    time += 1 / 60;
    boat.update({ x: 10, z: 20, heading: 0.3, speed: 0, lateral: 0, steer: 0, moored: true, waterAt: () => 0.05, ...frame, dt: 1 / 60, time });
  }
  return time;
}

describe("Bateau du joueur dans la scène", () => {
  it("se compose de trois maillages qui partagent un seul matériau", () => {
    const { scene, boat } = setup();
    const names = ["player-body", "player-outboard-body", "player-propeller"];
    const meshes = names.map((name) => scene.getMeshByName(name));
    expect(meshes.every(Boolean)).toBe(true);
    expect(new Set(meshes.map((mesh) => mesh!.material))).toEqual(new Set([boat.material]));
    expect(meshes[0]!.getVerticesData("uv2")).not.toBeNull();
    expect(scene.getMeshByName("player-shadow")).not.toBeNull();
  });

  it("se pose sur l'eau et anime l'hélice, le moteur et la gîte quand il navigue", () => {
    const { scene, boat } = setup();
    let time = sail(boat, 1, {});
    const propeller = scene.getMeshByName("player-propeller")!;
    const outboard = scene.getTransformNodeByName("player-outboard")!;
    expect(propeller.rotation.z).toBe(0);
    expect(outboard.rotation.y).toBe(0);
    expect(boat.root.position.x).toBe(10);
    expect(boat.root.position.z).toBe(20);
    expect(Math.abs(boat.root.position.y - 0.03)).toBeLessThan(0.05);
    expect(boat.root.rotation.y).toBeCloseTo(0.3, 6);

    time = sail(boat, 2, { moored: false, speed: 6, lateral: 3, steer: 1 }, time);
    expect(propeller.rotation.z).not.toBe(0);
    expect(boat.getMotion().propellerSpeed).toBeGreaterThan(15);
    expect(outboard.rotation.y).toBeLessThan(-0.3);
    expect(boat.root.rotation.z).toBeLessThan(-0.03);

    boat.reset();
    expect(boat.getMotion().propellerSpeed).toBe(0);
    sail(boat, 0.1, {}, time);
    expect(Math.abs(outboard.rotation.y)).toBeLessThan(0.01);
  });
});
