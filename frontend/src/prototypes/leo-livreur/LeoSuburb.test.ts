import { describe, expect, it } from "vitest";

import { boulevardLayout, BOULEVARD_FADE } from "./leoBoulevardLayout";
import {
  DESTINATIONS,
  destinationForDelivery,
  HOUSE_ROW_NORTH_Y,
  HOUSE_ROW_Y,
  SUBURB_FIRST_HOUSE_X,
  SUBURB_START_X,
  suburbHouse,
  suburbHousesBetween,
  ZONE1_HOUSE_SPACING,
} from "./leoGeometry";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

describe("quartier après la ville : les maisons de la Zone 1, numérotées à la suite", () => {
  it("commence exactement à la fin de l'illustration du boulevard, et ses maisons après son fondu", () => {
    const boulevard = boulevardLayout();
    expect(SUBURB_START_X).toBe(boulevard.panelEnd);
    expect(SUBURB_FIRST_HOUSE_X).toBeGreaterThan(boulevard.panelEnd);
    // Aucune maison sous l'illustration du boulevard (sa demi-largeur, environ 105, comprise).
    expect(suburbHousesBetween(0, boulevard.panelEnd + 105)).toEqual([]);
    expect(boulevard.panelEnd - BOULEVARD_FADE).toBeLessThan(SUBURB_FIRST_HOUSE_X);
  });

  it("numérote ses maisons à la suite de la Zone 1 : 33, 34, 35…", () => {
    expect(DESTINATIONS.at(-1)?.label).toBe("Maison 32");
    expect(suburbHouse(0)).toMatchObject({ id: "house-33", label: "Maison 33" });
    expect(suburbHouse(67)).toMatchObject({ id: "house-100", label: "Maison 100" });
  });

  it("alterne les deux côtés de la route comme la Zone 1 : impair en face, pair du côté de Léo", () => {
    expect(DESTINATIONS[0].house.y).toBe(HOUSE_ROW_NORTH_Y);
    expect(suburbHouse(0).house.y).toBe(HOUSE_ROW_NORTH_Y);
    expect(suburbHouse(1).house.y).toBe(HOUSE_ROW_Y);
    expect(suburbHouse(2).house.y).toBe(HOUSE_ROW_NORTH_Y);
  });

  it("garde le pas de la Zone 1, sans maison coupée par une frontière de zone", () => {
    const houses = Array.from({ length: 200 }, (_, rank) => suburbHouse(rank).house.x);
    for (const [rank, x] of houses.entries()) {
      const base = SUBURB_FIRST_HOUSE_X + rank * ZONE1_HOUSE_SPACING;
      expect(Math.abs(x - base)).toBeLessThanOrEqual(150);
      const boundary = Math.round(x / WORLD_ZONE_WIDTH) * WORLD_ZONE_WIDTH;
      expect(Math.abs(x - boundary)).toBeGreaterThanOrEqual(130);
      // Toujours dans l'ordre du parcours.
      if (rank > 0) expect(x).toBeGreaterThan(houses[rank - 1]);
    }
  });

  it("trouve chaque maison dans la zone où elle est dessinée, une seule fois", () => {
    const seen: string[] = [];
    for (let start = 14_400; start < 14_400 + 10 * WORLD_ZONE_WIDTH; start += WORLD_ZONE_WIDTH) {
      for (const house of suburbHousesBetween(start, start + WORLD_ZONE_WIDTH)) {
        expect(house.house.x).toBeGreaterThanOrEqual(start);
        expect(house.house.x).toBeLessThan(start + WORLD_ZONE_WIDTH);
        seen.push(house.label);
      }
    }
    expect(seen.slice(0, 3)).toEqual(["Maison 33", "Maison 34", "Maison 35"]);
    expect(new Set(seen).size).toBe(seen.length);
    // Aucun trou dans la numérotation.
    expect(seen.map((label) => Number(label.replace("Maison ", "")))).toEqual(
      Array.from({ length: seen.length }, (_, index) => 33 + index),
    );
  });

  it("après les 32 livraisons de la Zone 1, Léo livre les maisons du quartier, dans l'ordre", () => {
    expect(destinationForDelivery(31).label).toBe("Maison 32");
    expect(destinationForDelivery(32)).toEqual(suburbHouse(0));
    expect(destinationForDelivery(40)).toEqual(suburbHouse(8));
    expect(destinationForDelivery(32).stop.x).toBe(suburbHouse(0).house.x);
  });
});
