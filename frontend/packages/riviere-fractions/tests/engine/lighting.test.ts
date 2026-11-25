import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { LIGHTING, SHADOW_SETTINGS, createLighting } from "../../src/engine/scene/lighting";

let engine: NullEngine | null = null;
afterEach(() => {
  engine?.dispose();
  engine = null;
});

function scene() {
  engine = new NullEngine();
  return new Scene(engine);
}

describe("Éclairage de la rivière", () => {
  it("installe un soleil, un ciel, une brume légère et un paysage sans reflet plastique", () => {
    const s = scene();
    const lighting = createLighting(s);
    expect(s.lights.map((light) => light.name).sort()).toEqual(["sky", "sun"]);
    expect(s.fogDensity).toBe(LIGHTING.fogDensity);
    expect(LIGHTING.fogDensity).toBeLessThan(0.003);
    expect(lighting.landscape.specularColor.asArray()).toEqual([0, 0, 0]);
    expect(lighting.landscape.twoSidedLighting).toBe(true);
    expect(lighting.shadows).not.toBeNull();
  });

  it("ne redessine la carte d'ombre que lorsqu'on change de région, avec les seuls objets choisis", () => {
    const s = scene();
    const lighting = createLighting(s);
    const tree = new Mesh("tree", s);
    lighting.setShadowRegion(new Vector3(10, 0, 50), [tree]);
    const map = lighting.shadows!.getShadowMap()!;
    expect(map.renderList).toHaveLength(1);
    expect(map.renderList![0]).toBe(tree);
    expect(map.refreshRate).toBe(0);
    // Le soleil est placé en amont du point visé, à mi-profondeur de la carte, calé sur la grille des texels.
    const sun = s.getLightByName("sun")!;
    const light = sun as unknown as { position: Vector3 };
    const back = light.position.subtract(LIGHTING.sunDirection.scale(SHADOW_SETTINGS.depth / 2));
    expect(Vector3.Distance(back, new Vector3(10, 0, 50))).toBeLessThan(SHADOW_SETTINGS.frustum / SHADOW_SETTINGS.mapSize * 2);
  });

  it("peut se passer d'ombres et d'étalonnage (appareils modestes, tests)", () => {
    const s = scene();
    const lighting = createLighting(s, { shadows: false, grading: false });
    expect(lighting.shadows).toBeNull();
    expect(lighting.grading.asArray()).toEqual([1, 0, 1]);
    lighting.setShadowRegion(new Vector3(), []);
    expect(lighting.shadowStats()).toEqual({ triangles: 0, renders: 0 });
  });
});
