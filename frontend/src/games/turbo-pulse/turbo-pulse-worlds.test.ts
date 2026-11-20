import { describe, expect, it } from "vitest";
import { TURBO_LEVELS } from "./turbo-pulse-engine";
import { TURBO_WORLDS, worldForLevel } from "./turbo-pulse-worlds";

describe("mondes de Turbo Pulse", () => {
  it("associe un monde distinct à chacun des niveaux", () => {
    expect(TURBO_WORLDS).toHaveLength(TURBO_LEVELS.length);
    expect(new Set(TURBO_WORLDS.map((world) => world.id)).size).toBe(TURBO_LEVELS.length);
    TURBO_LEVELS.forEach((_, index) => expect(worldForLevel(index)).toBe(TURBO_WORLDS[index]));
  });

  it("borne l'indice de niveau aux mondes existants", () => {
    expect(worldForLevel(-3)).toBe(TURBO_WORLDS[0]);
    expect(worldForLevel(99)).toBe(TURBO_WORLDS[TURBO_WORLDS.length - 1]);
  });

  it("fournit une couleur CSS pour chaque monde", () => {
    TURBO_WORLDS.forEach((world) => expect(world.accentCss).toMatch(/^#[0-9a-f]{6}$/i));
  });
});
