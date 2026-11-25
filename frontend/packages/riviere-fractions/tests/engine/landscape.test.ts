import { describe, expect, it } from "vitest";

import { vertexCount } from "../../src/engine/geometry/kit";
import { buildLandscape } from "../../src/engine/geometry/landscape";
import { createLevelOneLayout, terrainHeight } from "../../src/engine/geometry/layout";

const layout = createLevelOneLayout();
const landscape = buildLandscape(layout);

describe("Paysage du niveau 1", () => {
  it("couvre tout le tracé, sans trou entre les morceaux", () => {
    expect(landscape.from).toBeLessThan(0);
    expect(landscape.to).toBeGreaterThan(layout.length);
    landscape.chunks.forEach((chunk, index) => {
      if (index > 0) expect(chunk.s0).toBe(landscape.chunks[index - 1].s1);
    });
  });

  it("reste dans un budget de géométrie raisonnable pour un téléphone", () => {
    const terrain = landscape.chunks.reduce((sum, chunk) => sum + vertexCount(chunk.terrain), 0);
    const water = landscape.chunks.reduce((sum, chunk) => sum + chunk.water.positions.length / 3, 0);
    const props = landscape.chunks.reduce((sum, chunk) => sum + vertexCount(chunk.props.lit) + vertexCount(chunk.props.glow), 0);
    const mountains = landscape.mountains.reduce((sum, group) => sum + vertexCount(group.lit), 0);
    const total = terrain + water + props + mountains + vertexCount(landscape.plain);
    expect(total).toBeLessThan(400_000);
    // Chaque morceau de 100 m reste léger : seuls quelques-uns sont dessinés à la fois.
    for (const chunk of landscape.chunks) expect(vertexCount(chunk.terrain) + vertexCount(chunk.props.lit)).toBeLessThan(60_000);
  });

  it("plante un panneau et un barrage pour chaque voie des sept embranchements", () => {
    expect(landscape.signs).toHaveLength(7);
    expect(landscape.barriers).toHaveLength(7);
    for (const fork of landscape.signs) expect(fork).toHaveLength(3);
  });

  it("garde l'eau sous les berges et la terre au-dessus des îlots", () => {
    for (const fork of layout.forks) {
      const middle = (fork.tip + fork.islandEnd) / 2;
      expect(terrainHeight(layout, middle, 7)).toBeGreaterThan(0.3);
      expect(terrainHeight(layout, middle, -7)).toBeGreaterThan(0.3);
      expect(terrainHeight(layout, middle, 0)).toBeLessThan(-0.5);
      expect(terrainHeight(layout, middle, 14)).toBeLessThan(-0.5);
      expect(terrainHeight(layout, middle, -14)).toBeLessThan(-0.5);
    }
    expect(terrainHeight(layout, 100, 30)).toBeGreaterThan(0.5);
  });
});
