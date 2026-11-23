import { describe, expect, it } from "vitest";

import { stylizedTree, treeStats } from "../../src/engine/geometry/trees/stylizedTree";
import { createSeeded } from "../../src/engine/navigation/seeded";

describe("Arbre stylisé (prototype)", () => {
  it("reste sous son budget de géométrie et donne des nombres valides", () => {
    const tree = stylizedTree(createSeeded(7));
    const stats = treeStats(tree);
    expect(stats.triangles).toBeLessThan(8000);
    expect([...tree.positions, ...tree.normals, ...tree.colors].every(Number.isFinite)).toBe(true);
    expect(Math.max(...tree.indices)).toBeLessThan(stats.vertices);
  });

  it("allège la géométrie à chaque niveau de détail en gardant la même silhouette", () => {
    const [near, mid, far] = ([0, 1, 2] as const).map((level) => stylizedTree(createSeeded(7), level));
    expect(treeStats(mid).triangles).toBeLessThan(1600);
    expect(treeStats(far).triangles).toBeLessThan(600);
    const height = (mesh: { positions: number[] }) => Math.max(...mesh.positions.filter((_, i) => i % 3 === 1));
    expect(Math.abs(height(mid) - height(near))).toBeLessThan(1);
    expect(Math.abs(height(far) - height(near))).toBeLessThan(1.2);
  });

  it("est reproductible et tient dans une emprise d'arbre de berge", () => {
    expect(stylizedTree(createSeeded(3)).positions).toEqual(stylizedTree(createSeeded(3)).positions);
    const ys = stylizedTree(createSeeded(7)).positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeLessThan(8);
  });
});
