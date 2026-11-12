import type { LearningObjectInstance, MoveLearningObjectAction } from "./learning-world.types";

export const MANGO_SOURCE_ID = "stock" as const;
export const MANGO_BASKET_IDS = ["basket-1", "basket-2", "basket-3", "basket-4"] as const;
export type MangoZoneId = typeof MANGO_SOURCE_ID | (typeof MANGO_BASKET_IDS)[number];

export interface MangoBasketState {
  zones: Record<MangoZoneId, readonly LearningObjectInstance[]>;
}

export type BasketFruit = "mango" | "orange";

export function createFruitBasketState(total = 24, fruit: BasketFruit = "mango"): MangoBasketState {
  const fruits = Array.from({ length: total }, (_, index): LearningObjectInstance => ({
    instanceId: `${fruit}-${index + 1}`,
    objectId: `fruit.${fruit}`,
  }));
  return {
    zones: {
      stock: fruits,
      "basket-1": [],
      "basket-2": [],
      "basket-3": [],
      "basket-4": [],
    },
  };
}

export function createMangoBasketState(total = 24): MangoBasketState {
  return createFruitBasketState(total, "mango");
}

export function applyMangoBasketAction(
  state: MangoBasketState,
  action: MoveLearningObjectAction,
): MangoBasketState {
  if (action.type !== "move-object") return state;
  const fromZoneId = action.fromZoneId as MangoZoneId;
  const toZoneId = action.toZoneId as MangoZoneId;
  if (!(fromZoneId in state.zones) || !(toZoneId in state.zones) || fromZoneId === toZoneId) return state;

  const from = state.zones[fromZoneId];
  const object = from.find((candidate) => candidate.instanceId === action.objectInstanceId);
  if (!object) return state;

  return {
    zones: {
      ...state.zones,
      [fromZoneId]: from.filter((candidate) => candidate.instanceId !== object.instanceId),
      [toZoneId]: [...state.zones[toZoneId], object],
    },
  };
}

export function countMangoes(state: MangoBasketState) {
  return Object.values(state.zones).reduce((total, objects) => total + objects.length, 0);
}
