import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameAudio } from "../audio/GameAudio";
import { backgroundFor, LEVEL_BACKGROUNDS, nextBackgroundFor } from "./turbo-pulse-backgrounds";
import { TurboPulsePlayer } from "./TurboPulsePlayer";

// Moteur Phaser remplacé : on ne teste ici que le chargement du décor du niveau et de la musique.
vi.mock("./TurboPulseGame", () => ({
  MIN_WORLD_WIDTH: 480,
  MIN_WORLD_HEIGHT: 270,
  mountTurboPulseGame: () => ({
    destroy: vi.fn(),
    restartRun: vi.fn(),
    retryLevel: vi.fn(),
    nextLevel: vi.fn(),
    toggleMuted: vi.fn(),
    togglePause: vi.fn(),
    refreshLayout: vi.fn(),
  }),
}));

// Téléchargement des images piloté par le test : chaque appel attend que le test le résolve ou le rejette.
const { loads } = vi.hoisted(() => ({
  loads: [] as Array<{ url: string; priority: string; resolve: () => void; reject: (error: Error) => void }>,
}));
vi.mock("./turbo-pulse-backgrounds", async (importOriginal) => {
  const original = await importOriginal<typeof import("./turbo-pulse-backgrounds")>();
  return {
    ...original,
    loadImage: (url: string, priority: string) =>
      new Promise<void>((resolve, reject) => loads.push({ url, priority, resolve, reject })),
  };
});

// Promesses, puis import dynamique du moteur (simulé) : tout ce qui suit le décor a le temps d'arriver.
const flush = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await vi.dynamicImportSettled();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

describe("décors de Turbo Pulse", () => {
  let loadMusic: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loads.length = 0;
    loadMusic = vi.spyOn(GameAudio.prototype, "loadMusic").mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("sept décors distincts, un par niveau, le dernier servant au-delà ; jamais de « suivant » après le dernier", () => {
    expect(new Set(LEVEL_BACKGROUNDS).size).toBe(7);
    expect(backgroundFor(0)).toBe(LEVEL_BACKGROUNDS[0]);
    expect(backgroundFor(12)).toBe(LEVEL_BACKGROUNDS[6]);
    expect(nextBackgroundFor(0)).toBe(LEVEL_BACKGROUNDS[1]);
    expect(nextBackgroundFor(6)).toBeNull();
  });

  it("décor en cours en priorité haute, puis seulement le suivant en priorité basse ; la musique attend le décor", async () => {
    render(<TurboPulsePlayer />);
    await flush();
    // À l'ouverture : moteur, puis un seul décor, celui du niveau 1, en priorité haute. Pas de musique encore.
    expect(loads.map(({ url, priority }) => [url, priority])).toEqual([[LEVEL_BACKGROUNDS[0], "high"]]);
    expect(loadMusic).not.toHaveBeenCalled();
    loads[0].resolve();
    await flush();
    // Décor affiché (après le moteur, simulé ici) ; ensuite seulement le décor du niveau suivant (priorité basse) et la musique.
    const background = document.querySelector<HTMLElement>('[style*="--level-background"]');
    expect(background?.style.getPropertyValue("--level-background")).toContain(LEVEL_BACKGROUNDS[0]);
    expect(loads.map(({ url, priority }) => [url, priority])).toEqual([
      [LEVEL_BACKGROUNDS[0], "high"],
      [LEVEL_BACKGROUNDS[1], "low"],
    ]);
    expect(loadMusic).toHaveBeenCalledOnce();
    // Jamais les sept décors d'un coup.
    expect(loads.length).toBeLessThan(LEVEL_BACKGROUNDS.length);
  });

  it("si le décor du niveau ne se charge pas, la partie s'affiche quand même, sans erreur non traitée, et la musique arrive", async () => {
    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    render(<TurboPulsePlayer />);
    await flush();
    loads[0].reject(new Error("réseau coupé"));
    await flush();
    expect(screen.getByRole("region", { name: "Turbo Pulse" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(document.querySelector('[style*="--level-background"]')).toBeNull();
    expect(loadMusic).toHaveBeenCalledOnce();
    expect(unhandled).not.toHaveBeenCalled();
    window.removeEventListener("unhandledrejection", unhandled);
  });
});
