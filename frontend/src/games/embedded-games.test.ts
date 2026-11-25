import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { imported } = vi.hoisted(() => ({ imported: [] as string[] }));

// Modules des jeux remplacés : on ne vérifie ici que ce que le survol précharge.
vi.mock("./leo-driving/LeoDrivingPlayer", () => {
  imported.push("lecteur de Léo");
  return { LeoDrivingPlayer: () => null };
});
vi.mock("../prototypes/leo-livreur/LeoLivreurGame", () => {
  imported.push("moteur de Léo");
  return { mountLeoLivreurGame: vi.fn() };
});

vi.mock("./riviere-fractions/RiviereFractionsPlayer", () => {
  imported.push("lecteur de la Rivière");
  return { RiviereFractionsPlayer: () => null };
});
vi.mock("@mbuyamba/riviere-fractions", () => ({
  preloadRiverFractionsEngine: () => {
    imported.push("moteur de la Rivière");
    return Promise.resolve();
  },
}));

vi.mock("./train-multiplications/TrainMultiplicationsPlayer", () => {
  imported.push("lecteur du Train");
  return { TrainMultiplicationsPlayer: () => null };
});
vi.mock("@mbuyamba/train-multiplications", () => ({
  preloadTrainMultiplicationsEngine: () => {
    imported.push("moteur du Train");
    return Promise.resolve();
  },
}));

import { onGameIntent } from "./embedded-games";

describe("préchargement du catalogue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("survol stable de Léo : le lecteur et son moteur (désormais à part) sont préchargés ensemble, jamais avant 250 ms", async () => {
    onGameIntent("conduire-avec-leo");
    await vi.advanceTimersByTimeAsync(249);
    expect(imported).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await vi.dynamicImportSettled();
    expect(imported.sort()).toEqual(["lecteur de Léo", "moteur de Léo"]);
  });

  it("survol stable de la Rivière : son lecteur et son moteur 3D sont préchargés ensemble, jamais avant 250 ms", async () => {
    onGameIntent("riviere-des-fractions");
    await vi.advanceTimersByTimeAsync(249);
    expect(imported.filter((name) => name.includes("Rivière"))).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await vi.dynamicImportSettled();
    expect(imported.filter((name) => name.includes("Rivière")).sort()).toEqual(["lecteur de la Rivière", "moteur de la Rivière"]);
  });

  it("survol stable du Train : son lecteur et son moteur 3D sont préchargés ensemble, jamais avant 250 ms", async () => {
    onGameIntent("train-des-multiplications");
    await vi.advanceTimersByTimeAsync(249);
    expect(imported.filter((name) => name.includes("Train"))).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await vi.dynamicImportSettled();
    expect(imported.filter((name) => name.includes("Train")).sort()).toEqual(["lecteur du Train", "moteur du Train"]);
  });
});
