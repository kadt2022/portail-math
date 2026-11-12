import { describe, expect, it } from "vitest";

import {
  applyMangoBasketAction,
  countMangoes,
  createMangoBasketState,
} from "./mango-basket-engine";

describe("moteur de démonstration des mangues", () => {
  it("crée 24 mangues individualisées dans le panier de départ", () => {
    const state = createMangoBasketState();
    expect(state.zones.stock).toHaveLength(24);
    expect(new Set(state.zones.stock.map((mango) => mango.instanceId))).toHaveLength(24);
    expect(countMangoes(state)).toBe(24);
  });

  it("déplace une mangue sans changer le total", () => {
    const initial = createMangoBasketState();
    const next = applyMangoBasketAction(initial, {
      type: "move-object",
      objectInstanceId: "mango-1",
      fromZoneId: "stock",
      toZoneId: "basket-1",
    });

    expect(next.zones.stock).toHaveLength(23);
    expect(next.zones["basket-1"].map((mango) => mango.instanceId)).toEqual(["mango-1"]);
    expect(countMangoes(next)).toBe(24);
    expect(initial.zones.stock).toHaveLength(24);
  });

  it("ignore une action invalide sans modifier l'état", () => {
    const initial = createMangoBasketState();
    const next = applyMangoBasketAction(initial, {
      type: "move-object",
      objectInstanceId: "mango-99",
      fromZoneId: "stock",
      toZoneId: "basket-1",
    });
    expect(next).toBe(initial);
  });
});
