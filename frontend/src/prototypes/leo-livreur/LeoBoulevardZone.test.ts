import { describe, expect, it } from "vitest";

import { bridgeLayout } from "./leoBridgeLayout";
import {
  BOULEVARD_FADE,
  BOULEVARD_OVERLAP,
  BOULEVARD_REF,
  BOULEVARD_ZONE_ID,
  boulevardLayout,
  boulevardSignals,
} from "./leoBoulevardLayout";
import { cityLayout } from "./leoCityLayout";
import { ROAD_HALF_WIDTH, ROAD_Y, WORLD_HEIGHT } from "./leoGeometry";
import { bundleSpan, BUNDLE_TEXTURES } from "./leoZoneAssets";
import { WORLD_ZONE_WIDTH, zoneForWorldX } from "./leoWorldZones";

describe("Zone 4 : boulevard vivant", () => {
  const boulevard = boulevardLayout();
  const city = cityLayout();

  it("succède à l'entrée de ville avec un vrai chevauchement, puis rend la suite au résidentiel", () => {
    expect(zoneForWorldX(BOULEVARD_ZONE_ID * WORLD_ZONE_WIDTH).kind).toBe("boulevard");
    expect(boulevard.panelX).toBe(city.panelEnd - BOULEVARD_OVERLAP);
    expect(boulevard.panelX).toBeLessThan(city.panelEnd);
    expect(city.panelEnd - boulevard.panelX).toBe(BOULEVARD_OVERLAP);
    expect(boulevard.panelEnd).toBeLessThan((BOULEVARD_ZONE_ID + 1) * WORLD_ZONE_WIDTH);
    expect(boulevard.panelEnd + BOULEVARD_FADE).toBeGreaterThan(BOULEVARD_ZONE_ID * WORLD_ZONE_WIDTH);
    expect(zoneForWorldX((BOULEVARD_ZONE_ID + 1) * WORLD_ZONE_WIDTH).kind).toBe("residential");
  });

  it("conserve l'échelle de l'image et ne réaffiche jamais sa chaussée peinte", () => {
    expect(boulevard.panelWidth).toBeCloseTo(WORLD_ZONE_WIDTH, 6);
    expect(boulevard.scale).toBeCloseTo(WORLD_ZONE_WIDTH / BOULEVARD_REF.width, 9);
    expect(BOULEVARD_REF.topRows).toBeLessThan(BOULEVARD_REF.bottomStartRow);
    expect(BOULEVARD_REF.bottomStartRow - BOULEVARD_REF.topRows).toBeGreaterThan(150);
  });

  it("raccorde les deux calques à la même chaussée physique que la zone 3", () => {
    const bridge = bridgeLayout();
    expect(boulevard.topBottom).toBe(city.topBottom);
    expect(boulevard.bottomTop).toBe(city.bottomTop);
    expect(boulevard.topBottom).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH);
    expect(boulevard.bottomTop).toBeGreaterThan(ROAD_Y + ROAD_HALF_WIDTH);
    expect(boulevard.topY).toBeGreaterThanOrEqual(0);
    expect(boulevard.bottomEnd).toBeLessThan(WORLD_HEIGHT);
    expect(bridge.deckScale).toBeGreaterThan(0);
  });

  it("charge l'illustration avec le lot ville et prolonge la durée de vie du lot jusqu'à sa sortie", () => {
    expect(BUNDLE_TEXTURES.city).toContain("leo-world-boulevard-zone4");
    const span = bundleSpan("city");
    expect(span.minX).toBeLessThan(city.panelX);
    expect(span.maxX).toBe(boulevard.panelEnd + BOULEVARD_FADE);
  });

  it("place trois feux actifs et leurs lignes d'arrêt dans la chaussée de la zone 4", () => {
    const signals = boulevardSignals();
    expect(signals).toHaveLength(3);
    for (const signal of signals) {
      expect(signal.x).toBeGreaterThan(boulevard.panelX);
      expect(signal.x).toBeLessThan(boulevard.panelEnd);
      expect(signal.stopLineEast).toBeLessThan(signal.x);
      expect(signal.stopLineWest).toBeGreaterThan(signal.x);
      expect(signal.y).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH);
    }
  });

  it("enchaîne ensuite les quartiers dans l'ordre adapté", () => {
    const kinds = [7, 8, 9, 10].map((id) => zoneForWorldX(id * WORLD_ZONE_WIDTH).kind);
    expect(kinds).toEqual(["residential", "market", "school", "city-entry"]);
  });
});
