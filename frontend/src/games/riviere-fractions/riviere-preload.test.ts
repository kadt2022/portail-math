import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { imported } = vi.hoisted(() => ({ imported: [] as string[] }));

// Le module du jeu et son lecteur sont remplacés : on ne vérifie ici que ce que le catalogue télécharge, et quand.
vi.mock("./RiviereFractionsPlayer", () => {
  imported.push("lecteur de la Rivière");
  return { RiviereFractionsPlayer: () => null };
});
vi.mock("@mbuyamba/riviere-fractions", () => ({
  preloadRiverFractionsEngine: () => {
    imported.push("moteur Babylon.js de la Rivière");
    return Promise.resolve();
  },
}));

import { onGameIntent, onGameIntentEnd } from "../embedded-games";

describe("préchargement de La Rivière des Fractions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("n'est jamais téléchargée à l'ouverture du catalogue", async () => {
    await vi.dynamicImportSettled();
    expect(imported).toEqual([]);
  });

  it("un survol trop court ne précharge rien", async () => {
    onGameIntent("riviere-des-fractions");
    await vi.advanceTimersByTimeAsync(120);
    onGameIntentEnd("riviere-des-fractions");
    await vi.advanceTimersByTimeAsync(500);
    await vi.dynamicImportSettled();
    expect(imported).toEqual([]);
  });

  it("un survol stable précharge le lecteur et le moteur 3D ensemble", async () => {
    onGameIntent("riviere-des-fractions");
    await vi.advanceTimersByTimeAsync(250);
    await vi.dynamicImportSettled();
    expect(imported.sort()).toEqual(["lecteur de la Rivière", "moteur Babylon.js de la Rivière"]);
  });
});
