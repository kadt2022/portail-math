import { describe, expect, it } from "vitest";

import { chooseBubblePlace, isCompactArea, overlapArea, type Box, type PlacementInput } from "./guide-placement";

const area = { width: 800, height: 400 };
const size = (width: number) => ({ width, height: 40 });
const target: Box = { left: 300, top: 180, width: 160, height: 40 };
const hand = (box: Box): Box => ({ left: box.left + box.width / 2 - 8, top: box.top + box.height / 2 - 8, width: 30, height: 30 });

const input = (overrides: Partial<PlacementInput> = {}): PlacementInput => ({ area, target, hand: hand(target), forbidden: [target], size, compact: false, ...overrides });

describe("placement de la bulle d'aide", () => {
  it("mesure le recouvrement de deux zones", () => {
    expect(overlapArea({ left: 0, top: 0, width: 10, height: 10 }, { left: 5, top: 5, width: 10, height: 10 })).toBe(25);
    expect(overlapArea({ left: 0, top: 0, width: 10, height: 10 }, { left: 10, top: 0, width: 10, height: 10 })).toBe(0);
  });

  it("choisit la droite quand elle est libre", () => {
    const place = chooseBubblePlace(input());
    expect(place).toMatchObject({ kind: "float", side: "right" });
    expect(place.left).toBeGreaterThanOrEqual(target.left + target.width);
  });

  it("passe à gauche quand la droite est occupée par une zone qu'on touche", () => {
    const busy: Box = { left: 470, top: 100, width: 300, height: 200 };
    const place = chooseBubblePlace(input({ forbidden: [target, busy] }));
    expect(place).toMatchObject({ kind: "float", side: "left" });
  });

  it("puis au-dessus, puis en dessous", () => {
    const right: Box = { left: 470, top: 100, width: 300, height: 200 };
    const left: Box = { left: 0, top: 100, width: 290, height: 200 };
    expect(chooseBubblePlace(input({ forbidden: [target, right, left] }))).toMatchObject({ kind: "float", side: "top" });
    const above: Box = { left: 0, top: 0, width: 800, height: 170 };
    expect(chooseBubblePlace(input({ forbidden: [target, right, left, above] }))).toMatchObject({ kind: "float", side: "bottom" });
  });

  it("ne recouvre jamais une zone interdite quand elle choisit une bulle flottante", () => {
    const zones: Box[] = [target, { left: 470, top: 150, width: 120, height: 120 }];
    const place = chooseBubblePlace(input({ forbidden: zones }));
    if (place.kind === "float") {
      const box = { left: place.left, top: place.top, width: place.width, height: 40 };
      for (const zone of zones) expect(overlapArea(box, zone)).toBe(0);
    }
  });

  it("devient un cartouche fixe quand aucune place n'est libre, au plus loin des zones touchées", () => {
    const wall: Box[] = [target, { left: 0, top: 60, width: 800, height: 280 }];
    const place = chooseBubblePlace(input({ forbidden: wall }));
    expect(place.kind).toBe("dock");
    if (place.kind === "dock") {
      expect(overlapArea({ left: place.left, top: place.top, width: place.width, height: 40 }, wall[1])).toBe(0);
      expect(place.width).toBeLessThanOrEqual(340);
    }
  });

  it("sur un petit écran, jamais de bulle flottante : cartouche seulement", () => {
    const small = { width: 360, height: 640 };
    expect(isCompactArea(small)).toBe(true);
    expect(isCompactArea({ width: 568, height: 272 })).toBe(true);
    expect(isCompactArea({ width: 932, height: 430 })).toBe(false);
    const place = chooseBubblePlace(input({ area: small, target: { left: 150, top: 300, width: 60, height: 40 }, compact: true, forbidden: [] }));
    expect(place.kind).toBe("dock");
  });

  it("le cartouche ne prend pas plus de place que son texte et se glisse dans un espace libre", () => {
    const busy: Box = { left: 200, top: 0, width: 200, height: 60 };
    const place = chooseBubblePlace(input({ area: { width: 568, height: 272 }, compact: true, forbidden: [busy], natural: () => 190 }));
    expect(place).toMatchObject({ kind: "dock", width: 190 });
    expect(overlapArea({ left: place.left, top: place.top, width: place.width, height: 40 }, busy)).toBe(0);
  });

  it("le cartouche reste dans le cadre", () => {
    const small = { width: 300, height: 500 };
    const place = chooseBubblePlace(input({ area: small, compact: true, forbidden: [{ left: 0, top: 0, width: 300, height: 500 }] }));
    expect(place.kind).toBe("dock");
    expect(place.left).toBeGreaterThanOrEqual(0);
    expect(place.left + place.width).toBeLessThanOrEqual(small.width);
  });
});
