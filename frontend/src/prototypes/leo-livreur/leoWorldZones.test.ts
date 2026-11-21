import { describe, expect, it } from "vitest";

import { visibleZoneIds, WORLD_ZONE_WIDTH, zoneForWorldX } from "./leoWorldZones";

describe("monde continu en zones", () => {
  it("enchaîne le premier village, le pont, la ville et ses quartiers", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => zoneForWorldX(id * WORLD_ZONE_WIDTH).kind)).toEqual([
      "village", "village", "village", "bridge", "bridge", "city-entry", "boulevard", "residential", "market", "school",
    ]);
    expect(zoneForWorldX(4 * WORLD_ZONE_WIDTH).kind).toBe("bridge");
    expect(zoneForWorldX(5 * WORLD_ZONE_WIDTH).kind).toBe("city-entry");
  });

  it("fait revenir les familles de quartiers avec des identifiants et variantes stables", () => {
    expect(zoneForWorldX(10 * WORLD_ZONE_WIDTH).kind).toBe("city-entry");
    expect(zoneForWorldX(10 * WORLD_ZONE_WIDTH).seed).toBe(zoneForWorldX(10 * WORLD_ZONE_WIDTH).seed);
    expect(zoneForWorldX(10 * WORLD_ZONE_WIDTH).id).not.toBe(zoneForWorldX(5 * WORLD_ZONE_WIDTH).id);
  });

  it("garde une fenêtre de trois zones autour de Léo et peut la déplacer en arrière", () => {
    expect(visibleZoneIds(0)).toEqual([0, 1, 2]);
    expect(visibleZoneIds(10 * WORLD_ZONE_WIDTH)).toEqual([9, 10, 11]);
    expect(visibleZoneIds(9 * WORLD_ZONE_WIDTH)).toEqual([8, 9, 10]);
  });
});
