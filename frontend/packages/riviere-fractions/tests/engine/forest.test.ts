import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { buildLandscape } from "../../src/engine/geometry/landscape";
import { createLevelOneLayout } from "../../src/engine/geometry/layout";
import { FOREST_PALETTES, plantMatrix, type Forest, type ForestTree } from "../../src/engine/geometry/trees/forest";
import { stylizedTree, treeStats, TREE_PALETTE } from "../../src/engine/geometry/trees/stylizedTree";
import { fern, grassTuft, shrub } from "../../src/engine/geometry/trees/undergrowth";
import { createSeeded } from "../../src/engine/navigation/seeded";
import { createForest, TREE_RANGES } from "../../src/engine/scene/forest";

// La forêt d'essai : le même arbre en huit teintes et son sous-bois, sur un seul tronçon, dessinés en instances.

const layout = createLevelOneLayout();
const zone = { from: 410, to: 590 };
const plain = buildLandscape(layout);
const planted = buildLandscape(layout, undefined, { forest: zone });

describe("modèles de la forêt", () => {
  it("garde les trois niveaux validés et ajoute un niveau très lointain léger", () => {
    const [l0, l1, l2, l3] = ([0, 1, 2, 3] as const).map((level) => treeStats(stylizedTree(createSeeded(7), level)).triangles);
    expect(l0).toBe(7100);
    expect(l1).toBe(1460);
    expect(l2).toBe(502);
    expect(l3).toBeLessThan(260);
  });

  it("garde la même forme d'une teinte à l'autre", () => {
    const shapes = FOREST_PALETTES.map((entry) => stylizedTree(createSeeded(7), 1, entry.palette));
    for (const shape of shapes) expect(shape.positions).toEqual(shapes[0].positions);
    expect(new Set(shapes.map((shape) => shape.colors.join(","))).size).toBe(FOREST_PALETTES.length);
  });

  it("fait un sous-bois léger", () => {
    expect(treeStats(shrub(createSeeded(11), TREE_PALETTE)).triangles).toBeLessThan(500);
    expect(treeStats(shrub(createSeeded(11), TREE_PALETTE, true)).triangles).toBeLessThan(40);
    expect(treeStats(fern(createSeeded(13), TREE_PALETTE)).triangles).toBeLessThan(160);
    expect(treeStats(grassTuft(createSeeded(17), TREE_PALETTE)).triangles).toBeLessThan(24);
  });
});

describe("forêt d'essai", () => {
  const forest: Forest = planted.forest;

  it("plante une forêt dense, en plusieurs étages et teintes mêlées, jusque dans l'intérieur des terres", () => {
    expect(forest.trees.length).toBeGreaterThan(450);
    expect(forest.undergrowth.length).toBeGreaterThan(600);
    expect(plain.forest.trees).toEqual([]);
    const counts = FOREST_PALETTES.map((_, p) => forest.trees.filter((tree) => tree.palette === p).length);
    expect(counts.every((count) => count > 0)).toBe(true);
    // Pas de teinte écrasante, et les touches dorées et cuivrées restent rares.
    expect(Math.max(...counts) / forest.trees.length).toBeLessThan(0.32);
    expect((counts[6] + counts[7]) / forest.trees.length).toBeLessThan(0.1);
    expect(new Set(forest.trees.map((tree) => tree.layer)).size).toBe(3);
    expect(Math.max(...forest.trees.map((tree) => tree.inland))).toBeGreaterThan(40);
    for (const tree of forest.trees) {
      expect(tree.scale).toBeGreaterThan(0.3);
      expect(tree.scale).toBeLessThan(1.45);
      expect(Math.hypot(tree.leanX, tree.leanZ)).toBeLessThan(0.17);
      expect(tree.y).toBeGreaterThan(-0.6);
    }
  });

  it("mêle les teintes : un arbre et son plus proche voisin n'ont pas toujours la même", () => {
    let same = 0;
    for (const tree of forest.trees) {
      let best: ForestTree | null = null;
      let bestDistance = Infinity;
      for (const other of forest.trees) {
        const distance = Math.hypot(other.x - tree.x, other.z - tree.z);
        if (other !== tree && distance < bestDistance) {
          best = other;
          bestDistance = distance;
        }
      }
      if (best?.palette === tree.palette) same += 1;
    }
    expect(same / forest.trees.length).toBeLessThan(0.4);
  });

  it("ne laisse aucun ancien arbre en boules dans le tronçon, et ne change rien ailleurs", () => {
    planted.chunks.forEach((chunk, i) => {
      if (chunk.s1 <= zone.from || chunk.s0 >= zone.to) expect(chunk.props.lit.positions).toEqual(plain.chunks[i].props.lit.positions);
    });
    // Signature des anciens feuillus, cerisiers, bambous et buissons : des sommets de feuillage (vert franc ou rose)
    // au-dessus du sol. Roseaux (vert jaune) et lotus (sur l'eau, rose plus soutenu) ne la portent pas ; les nouveaux arbres ne sont pas
    // dans les décors des morceaux (ils sont dessinés en instances).
    const oldFoliage = (chunks: typeof plain.chunks, log = false) => {
      const path: { s: number; x: number; z: number }[] = [];
      for (let s = zone.from - 30; s <= zone.to + 30; s += 0.5) path.push({ s, ...layout.toWorld(s, 0) });
      let found = 0;
      for (const chunk of chunks) {
        if (chunk.s1 <= zone.from || chunk.s0 >= zone.to) continue;
        const { positions, colors } = chunk.props.lit;
        for (let v = 0; v < positions.length / 3; v += 1) {
          const [r, g, b] = [colors[v * 4], colors[v * 4 + 1], colors[v * 4 + 2]];
          const green = g > 0.2 && r < g * 0.66 && b < g * 0.7;
          const pink = r > 0.8 && b > g && g > 0.5 && colors[v * 4 + 1] > 0.6;
          if (!green && !pink) continue;
          const x = positions[v * 3];
          const y = positions[v * 3 + 1];
          const z = positions[v * 3 + 2];
          let near = path[0];
          let best = Infinity;
          for (const p of path) {
            const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
            if (d2 < best) {
              best = d2;
              near = p;
            }
          }
          // Marge de 4 m aux bornes : une couronne plantée juste avant le tronçon peut déborder d'un mètre.
          if (near.s < zone.from + 4 || near.s >= zone.to - 4) continue;
          if (y > 0.4) {
            found += 1;
            if (log && process.env.DEBUG_FOREST) console.log(near.s, y.toFixed(2), r.toFixed(2), g.toFixed(2), b.toFixed(2));
          }
        }
      }
      return found;
    };
    expect(oldFoliage(plain.chunks)).toBeGreaterThan(2000);
    expect(oldFoliage(planted.chunks, true)).toBe(0);
  });

  it("ne masque jamais les panneaux depuis l'approche du portique", () => {
    const fork = layout.forks.find((f) => f.gate > zone.from && f.gate < zone.to);
    expect(fork).toBeDefined();
    for (const tree of forest.trees) {
      const crownY = tree.y + 5.6 * tree.scale;
      const r = 2.2 * tree.scale * 0.9;
      for (const sign of planted.signs[layout.forks.indexOf(fork!)]) {
        for (let s = fork!.gate - 100; s < fork!.gate - 12; s += 8) {
          const eye = layout.toWorld(s - 8.2, 0);
          const ux = sign.x - eye.x;
          const uy = sign.y - 3.7;
          const uz = sign.z - eye.z;
          const t = Math.max(0, Math.min(1, ((tree.x - eye.x) * ux + (crownY - 3.7) * uy + (tree.z - eye.z) * uz) / (ux * ux + uy * uy + uz * uz)));
          const d = Math.hypot(eye.x + ux * t - tree.x, 3.7 + uy * t - crownY, eye.z + uz * t - tree.z);
          expect(d).toBeGreaterThan(r);
        }
      }
    }
  });

  it("incline le houppier dans la direction voulue et élargit sans grandir", () => {
    const m = plantMatrix({ x: 3, y: 1, z: -2, yaw: 1.2, leanX: 0.1, leanZ: 0, scale: 2, width: 1.5 });
    // Image du haut (0, 1, 0) : deuxième ligne de la matrice.
    expect(m[4]).toBeCloseTo(Math.sin(0.1) * 2, 5);
    expect(m[5]).toBeCloseTo(Math.cos(0.1) * 2, 5);
    expect(m[6]).toBeCloseTo(0, 5);
    expect(Math.hypot(m[0], m[1], m[2])).toBeCloseTo(3, 5);
    expect([m[12], m[13], m[14]]).toEqual([3, 1, -2]);
  });
});

let engine: NullEngine | null = null;
afterEach(() => {
  engine?.dispose();
  engine = null;
});

describe("forêt dans la scène", () => {
  it("range chaque arbre par distance et ne dessine pas ce qui est derrière la caméra", () => {
    engine = new NullEngine();
    const scene = new Scene(engine);
    const tree = (z: number, palette: number): ForestTree => ({ x: 0, y: 0, z, yaw: 0, leanX: 0, leanZ: 0, scale: 1, width: 1, palette, tint: [1, 1, 1], layer: "middle", inland: 5 });
    const forest = createForest(scene, new StandardMaterial("m", scene), { trees: [10, 25, 50, 200, 600, -80].map((z, i) => tree(z, i % 2)), undergrowth: [] });
    forest?.update(new Vector3(0, 3, 0), new Vector3(0, 0, 1));
    const stats = forest!.stats();
    // 10 m, 25 m, 50 m, 200 m : un arbre à chaque niveau ; 600 m et derrière la caméra : pas dessinés.
    expect(stats.treesPerLevel).toEqual([1, 1, 1, 1]);
    expect(stats.drawCalls).toBe(4);
    expect(TREE_RANGES[0]).toBeLessThan(TREE_RANGES[1]);
  });
});
