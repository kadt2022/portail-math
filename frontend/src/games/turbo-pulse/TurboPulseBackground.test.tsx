import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameAudio } from "../audio/GameAudio";
import type { DownloadProgress } from "../loading/fetchWithProgress";
import { backgroundFor, backgroundSizeFor, LEVEL_BACKGROUNDS, nextBackgroundFor, SMALL_BACKGROUND_MAX_WIDTH } from "./turbo-pulse-backgrounds";
import { TurboPulsePlayer } from "./TurboPulsePlayer";

const { mountMock, downloads, loads } = vi.hoisted(() => ({
  mountMock: vi.fn(() => ({
    destroy: vi.fn(),
    restartRun: vi.fn(),
    retryLevel: vi.fn(),
    nextLevel: vi.fn(),
    toggleMuted: vi.fn(),
    togglePause: vi.fn(),
    refreshLayout: vi.fn(),
  })),
  // Téléchargements pilotés par le test : chacun attend que le test le fasse progresser, le résolve ou le rejette.
  downloads: [] as Array<{ url: string; progress: DownloadProgress; resolve: () => void; reject: (error: Error) => void }>,
  loads: [] as Array<{ url: string; priority: string }>,
}));

// Moteur Phaser remplacé : on ne teste ici que le chargement (décor, musique) et le démarrage de la partie.
vi.mock("./TurboPulseGame", () => ({ MIN_WORLD_WIDTH: 480, MIN_WORLD_HEIGHT: 270, mountTurboPulseGame: mountMock }));

vi.mock("./turbo-pulse-backgrounds", async (importOriginal) => {
  const original = await importOriginal<typeof import("./turbo-pulse-backgrounds")>();
  return {
    ...original,
    downloadImage: (url: string, progress: DownloadProgress) =>
      new Promise<void>((resolve, reject) => downloads.push({ url, progress, resolve, reject })),
    loadImage: (url: string, priority: string) => {
      loads.push({ url, priority });
      return Promise.resolve();
    },
  };
});

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await vi.dynamicImportSettled();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

// Lue directement : à 100 %, l'écran s'efface et se retire des lecteurs d'écran, mais sa valeur reste lisible.
const percent = () => Number(document.querySelector("[role=progressbar][aria-label=\"Chargement du jeu\"]")?.getAttribute("aria-valuenow"));

describe("décors de Turbo Pulse", () => {
  it("deux versions allégées de sept décors distincts ; la version suit la largeur réelle de la scène", () => {
    for (const size of ["small", "large"] as const) {
      expect(new Set(LEVEL_BACKGROUNDS[size]).size).toBe(7);
      expect(backgroundFor(12, size)).toBe(LEVEL_BACKGROUNDS[size][6]);
      expect(nextBackgroundFor(0, size)).toBe(LEVEL_BACKGROUNDS[size][1]);
      expect(nextBackgroundFor(6, size)).toBeNull();
    }
    expect(LEVEL_BACKGROUNDS.small[0]).not.toBe(LEVEL_BACKGROUNDS.large[0]);
    // Téléphone (390 px × densité 2 = 780) : version 960 ; ordinateur (1025 × 1,5) : version 1280.
    expect(backgroundSizeFor(780)).toBe("small");
    expect(backgroundSizeFor(SMALL_BACKGROUND_MAX_WIDTH)).toBe("small");
    expect(backgroundSizeFor(1025 * 1.5)).toBe("large");
  });
});

describe("chargement de Turbo Pulse", () => {
  let music: { progress?: DownloadProgress; resolve: () => void; reject: (error: Error) => void };

  beforeEach(() => {
    downloads.length = 0;
    loads.length = 0;
    mountMock.mockClear();
    vi.spyOn(GameAudio.prototype, "loadMusic").mockImplementation(
      (_url: string, progress?: DownloadProgress) =>
        new Promise<void>((resolve, reject) => {
          music = { progress, resolve, reject };
        }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("écran de chargement avec un vrai pourcentage ; la partie ne commence qu'avec le décor du niveau 1 et la musique", async () => {
    render(<TurboPulsePlayer />);
    await flush();
    expect(screen.getByText("Chargement des ressources")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Chargement du jeu" })).toBeInTheDocument();
    // Le moteur est arrivé (simulé) : il compte pour sa part, mais rien ne démarre sans le décor et la musique.
    expect(percent()).toBeGreaterThan(0);
    expect(percent()).toBeLessThan(100);
    expect(mountMock).not.toHaveBeenCalled();
    // Un seul décor téléchargé : celui du niveau 1 (jamais les sept).
    expect(downloads.map(({ url }) => url)).toEqual([LEVEL_BACKGROUNDS.small[0]]);

    const before = percent();
    act(() => downloads[0].progress(45_000, 90_000));
    expect(percent()).toBeGreaterThan(before);
    downloads[0].resolve();
    await flush();
    expect(mountMock).not.toHaveBeenCalled();
    expect(percent()).toBeLessThan(100);

    act(() => music.progress?.(308_000, 308_000));
    music.resolve();
    await flush();
    // Tout est prêt : la partie est montée, l'écran affiche 100 % et s'efface.
    expect(mountMock).toHaveBeenCalledOnce();
    expect(percent()).toBe(100);
    const decor = document.querySelector<HTMLElement>('[style*="--level-background"]');
    expect(decor?.style.getPropertyValue("--level-background")).toContain(LEVEL_BACKGROUNDS.small[0]);
    // Puis le décor du niveau suivant se prépare pendant la partie, en priorité basse.
    expect(loads).toContainEqual({ url: LEVEL_BACKGROUNDS.small[1], priority: "low" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(screen.queryByText("Chargement des ressources")).not.toBeInTheDocument();
  });

  it("réseau coupé pour le décor ou la musique : le chargement ne reste jamais bloqué, la partie démarre", async () => {
    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    render(<TurboPulsePlayer />);
    await flush();
    downloads[0].reject(new Error("réseau coupé"));
    music.reject(new Error("réseau coupé"));
    await flush();
    expect(mountMock).toHaveBeenCalledOnce();
    expect(percent()).toBe(100);
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(unhandled).not.toHaveBeenCalled();
    window.removeEventListener("unhandledrejection", unhandled);
  });
});
