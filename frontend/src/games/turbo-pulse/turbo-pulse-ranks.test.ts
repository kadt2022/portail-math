import { describe, expect, it } from "vitest";
import { TURBO_LEVELS } from "./turbo-pulse-engine";
import { rankForLevel, tintCssColor, TURBO_RANKS } from "./turbo-pulse-ranks";

describe("rangs de Turbo Pulse", () => {
  it("associe un rang distinct à chaque niveau, de l'Acier à l'Or royal", () => {
    expect(TURBO_RANKS).toHaveLength(TURBO_LEVELS.length);
    expect(TURBO_RANKS.map((rank) => rank.id)).toEqual(["steel", "bronze", "silver", "emerald", "sapphire", "ruby", "gold"]);
    TURBO_LEVELS.forEach((_, index) => expect(rankForLevel(index)).toBe(TURBO_RANKS[index]));
  });

  it("borne l'indice de niveau aux rangs existants", () => {
    expect(rankForLevel(-2)).toBe(TURBO_RANKS[0]);
    expect(rankForLevel(42)).toBe(TURBO_RANKS[6]);
  });

  it("garde six couleurs de boules distinctes dans chaque rang", () => {
    TURBO_RANKS.forEach((rank) => expect(new Set(Object.values(rank.palette)).size).toBe(6));
  });

  it("recolore une couleur dorée vers le rang, et laisse l'Or royal intact", () => {
    const gold = TURBO_RANKS[6];
    expect(tintCssColor("#ffc83d", gold)).toBe("#ffc83d");
    const ruby = TURBO_RANKS[5];
    expect(tintCssColor("#ffc83d", ruby)).not.toBe("#ffc83d");
    expect(tintCssColor("rgba(255, 200, 70, 0.55)", ruby)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.55\)$/);
  });
});
