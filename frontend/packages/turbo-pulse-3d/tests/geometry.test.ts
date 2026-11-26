import { describe, expect, it } from "vitest";

import { computeNormals, triangleCount } from "../src/ship/geometry";
import { ALL_PARTS, buildPart } from "../src/ship/shipParts";
import { DEFAULT_SHIP, ENGINE_VARIANTS, WING_VARIANTS } from "../src/ship/shipSpec";

describe("géométrie du vaisseau", () => {
  it("produit des maillages valides pour chaque partie et chaque variante", () => {
    for (const wings of WING_VARIANTS) {
      for (const engines of ENGINE_VARIANTS) {
        for (const part of ALL_PARTS) {
          for (const [role, data] of Object.entries(buildPart(part, { ...DEFAULT_SHIP, wings, engines }))) {
            expect(data.positions.length % 3, `${part}/${role}`).toBe(0);
            expect(data.indices.length % 3, `${part}/${role}`).toBe(0);
            const vertices = data.positions.length / 3;
            expect(data.indices.every((i) => i >= 0 && i < vertices)).toBe(true);
            expect(data.positions.every(Number.isFinite)).toBe(true);
            expect(computeNormals(data).every(Number.isFinite)).toBe(true);
          }
        }
      }
    }
  });

  it("reste léger : moins de 10 000 triangles pour le vaisseau complet", () => {
    let total = 0;
    for (const part of ALL_PARTS) for (const data of Object.values(buildPart(part, DEFAULT_SHIP))) total += triangleCount(data);
    expect(total).toBeLessThan(10_000);
  });
});
