import { describe, expect, it } from "vitest";

import { FINISH, HULL, OUTBOARD, motorBoat } from "../../src/engine/geometry/boat";
import { WHEEL, halfBeam, section, sheer, tAt, wheelPoint } from "../../src/engine/geometry/boat/dimensions";
import { SIGN_HEIGHT, GATE_HEIGHT } from "../../src/engine/geometry/landscape";
import { DEFAULT_TUNING } from "../../src/engine/navigation/boat";

const model = motorBoat();
const meshes = { body: model.body, outboard: model.outboard, propeller: model.propeller };
const vertices = (mesh: { positions: number[] }) => mesh.positions.length / 3;
const triangles = (mesh: { indices: number[] }) => mesh.indices.length / 3;

function bounds(positions: number[], offset: [number, number, number] = [0, 0, 0]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], positions[i + k] + offset[k]);
      max[k] = Math.max(max[k], positions[i + k] + offset[k]);
    }
  }
  return { min, max };
}

describe("Bateau à moteur du joueur — géométrie", () => {
  it("reste dans un budget de géométrie léger pour un téléphone", () => {
    const total = Object.values(meshes).reduce((sum, mesh) => sum + triangles(mesh), 0);
    expect(total).toBeLessThan(12_000);
    expect(Object.values(meshes).reduce((sum, mesh) => sum + vertices(mesh), 0)).toBeLessThan(9_000);
    // Trois maillages seulement (coque et tout ce qui est fixé dessus, moteur, hélice) : peu d'appels de dessin.
    expect(Object.keys(meshes)).toHaveLength(3);
  });

  it("donne à chaque sommet une finition, des coordonnées de peinture et des nombres valides", () => {
    const finishes = new Set<number>(Object.values(FINISH));
    for (const mesh of Object.values(meshes)) {
      const count = vertices(mesh);
      expect(mesh.normals).toHaveLength(count * 3);
      expect(mesh.colors).toHaveLength(count * 4);
      expect(mesh.paint).toHaveLength(count * 4);
      expect([...mesh.positions, ...mesh.normals, ...mesh.colors, ...mesh.paint].every(Number.isFinite)).toBe(true);
      for (let i = 0; i < count; i += 1) expect(finishes.has(mesh.colors[i * 4 + 3])).toBe(true);
      expect(Math.max(...mesh.indices)).toBeLessThan(count);
    }
  });

  it("peint la décoration seulement sur les flancs de la coque", () => {
    const painted: number[] = [];
    for (let i = 0; i < vertices(model.body); i += 1) if (model.body.paint[i * 4] >= 0) painted.push(i);
    expect(painted.length).toBeGreaterThan(100);
    for (const i of painted) {
      const [along, drop, rise, height] = model.body.paint.slice(i * 4, i * 4 + 4);
      expect(along).toBeGreaterThanOrEqual(-1e-6);
      expect(along).toBeLessThanOrEqual(HULL.bow - HULL.stern + 1e-6);
      expect(drop).toBeGreaterThanOrEqual(-1e-6);
      expect(rise).toBeGreaterThanOrEqual(-1e-6);
      expect(rise).toBeLessThanOrEqual(height + 1e-6);
    }
    expect([model.outboard, model.propeller].every((mesh) => mesh.paint.every((value, k) => k % 4 !== 0 || value < 0))).toBe(true);
  });

  it("garde la taille d'un bateau de promenade qui tient dans les voies et passe sous les panneaux", () => {
    const body = bounds(model.body.positions);
    const motor = bounds(model.outboard.positions, model.outboardPivot);
    expect(body.max[2] - Math.min(body.min[2], motor.min[2])).toBeGreaterThan(5.2);
    expect(body.max[2] - Math.min(body.min[2], motor.min[2])).toBeLessThan(6);
    expect(model.length).toBeCloseTo(body.max[2] - motor.min[2], 0);
    // Moitié de la largeur, liston chromé compris, bien en dessous de la marge de navigation aux berges.
    expect(Math.max(body.max[0], -body.min[0])).toBeLessThan(1.1);
    expect(Math.max(body.max[0], -body.min[0])).toBeLessThan(DEFAULT_TUNING.clearance - 0.8);
    // Toit, projecteurs et antenne passent sous le bas des panneaux de réponse, avec de la marge pour le tangage.
    const signBottom = GATE_HEIGHT - 2.05 - SIGN_HEIGHT / 2;
    expect(body.max[1]).toBeLessThan(signBottom - 0.2);
  });

  it("dessine une coque fermée : poupe large, proue fine, plat-bord qui remonte vers l'avant", () => {
    expect(halfBeam(0)).toBeGreaterThan(0.95);
    expect(halfBeam(0.35)).toBeCloseTo(HULL.beam / 2, 2);
    expect(halfBeam(1)).toBe(0);
    expect(sheer(1)).toBeGreaterThan(sheer(0) + 0.2);
    for (const t of [0, 0.25, 0.5, 0.75, 0.95]) {
      const { bottom, side } = section(t);
      expect(bottom.at(-1)).toEqual(side[0]);
      // Le flanc monte toujours, du bouchain au plat-bord.
      side.forEach((point, i) => i > 0 && expect(point[1]).toBeGreaterThan(side[i - 1][1]));
      expect(side.at(-1)![1]).toBeCloseTo(sheer(t), 6);
    }
    expect(tAt(HULL.stern)).toBe(0);
    expect(tAt(HULL.bow)).toBe(1);
  });

  it("centre l'hélice sur son moyeu, sous la plaque du moteur, près de la surface", () => {
    let radius = 0;
    for (let i = 0; i < model.propeller.positions.length; i += 3) radius = Math.max(radius, Math.hypot(model.propeller.positions[i], model.propeller.positions[i + 1]));
    expect(radius).toBeLessThan(OUTBOARD.bladeRadius + 0.005);
    const hubY = model.outboardPivot[1] + model.propellerHub[1];
    expect(hubY).toBeLessThan(0);
    expect(hubY + OUTBOARD.bladeRadius).toBeGreaterThan(0);
  });

  it("met les mains du pilote sur la jante du volant", () => {
    for (const angle of [Math.PI / 6, (5 * Math.PI) / 6, -Math.PI / 2]) {
      const [x, y, z] = wheelPoint(angle);
      expect(Math.hypot(x - WHEEL.x, y - WHEEL.y, z - WHEEL.z)).toBeCloseTo(WHEEL.radius, 6);
    }
  });
});
