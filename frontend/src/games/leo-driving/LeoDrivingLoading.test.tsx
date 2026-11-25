import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";
import { STARTUP_TEXTURE_URLS } from "../../prototypes/leo-livreur/leoTextureUrls";
import { ALL_TEXTURE_KEYS } from "../../prototypes/leo-livreur/leoZoneAssets";
import { DOWNLOAD_CONCURRENCY } from "../loading/fetchWithProgress";
import { GameLoaderHost } from "../loading/GameLoaderHost";
import { startGameLoading } from "../loading/gameLoadingProfiles";

const { engine } = vi.hoisted(() => ({
  engine: {
    imports: 0,
    listener: null as ((snapshot: LeoLivreurSnapshot) => void) | null,
    images: null as ReadonlyMap<string, string> | null,
    mount: vi.fn(),
    retryAssets: vi.fn(),
  },
}));

vi.mock("../../prototypes/leo-livreur/LeoLivreurGame", () => {
  engine.imports += 1;
  return {
    mountLeoLivreurGame: (_host: HTMLElement, listener: (snapshot: LeoLivreurSnapshot) => void, options?: { downloadedImages?: ReadonlyMap<string, string> }) => {
      engine.mount();
      engine.listener = listener;
      engine.images = options?.downloadedImages ?? null;
      return {
        destroy: vi.fn(), refreshLayout: vi.fn(), startMission: vi.fn(), setDestination: vi.fn(), lockDriving: vi.fn(),
        resumeDriving: vi.fn(), handOver: vi.fn(async () => undefined), returnToRestaurant: vi.fn(), cue: vi.fn(), reset: vi.fn(),
        setControl: vi.fn(), turn: vi.fn(), setPaused: vi.fn(), retryAssets: engine.retryAssets, setSound: vi.fn(() => true), horn: vi.fn(),
      };
    },
  };
});

import { LeoDrivingPlayer } from "./LeoDrivingPlayer";

const SNAPSHOT: LeoLivreurSnapshot = {
  phase: "INTRO", speedKmh: 0, heading: 0, steering: 0, remainingMeters: 800, destinationStatus: "ahead",
  targetLabel: "98, avenue des Manguiers", signalState: null, signalMessage: null, signalDistance: null, signalPrepare: false,
  travelledMeters: 0, assets: "loading", assetsLoaded: 0, assetsTotal: 19,
};

/** Téléchargements des images pilotés par le test. */
let downloads: Array<{ url: string; resolve: () => void; done: boolean }> = [];

const settle = () =>
  act(async () => {
    for (let step = 0; step < 4; step += 1) {
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
/** Laisse arriver toutes les images, par vagues (les téléchargements sont limités à DOWNLOAD_CONCURRENCY à la fois). */
async function finishDownloads() {
  for (let wave = 0; wave < 40; wave += 1) {
    const pending = downloads.filter((download) => !download.done);
    if (pending.length === 0 && downloads.length >= STARTUP_TEXTURE_URLS.length) return;
    for (const download of pending) {
      download.done = true;
      download.resolve();
    }
    await settle();
  }
}
const percent = () => Number(document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]')?.getAttribute("aria-valuenow"));
const loader = () => document.querySelector("[data-phase]");

function renderInHost() {
  const session = startGameLoading("conduire-avec-leo");
  render(
    <GameLoaderHost game="conduire-avec-leo" session={session}>
      <LeoDrivingPlayer />
    </GameLoaderHost>,
  );
  // Le code du lecteur est là (rendu direct, sans attente) : jalon que poserait l'hôte du catalogue.
  act(() => session.milestone("player"));
  return session;
}

describe("Conduire avec Léo dans le chargeur commun", () => {
  beforeEach(() => {
    downloads = [];
    engine.imports = 0;
    engine.listener = null;
    engine.images = null;
    engine.mount.mockClear();
    engine.retryAssets.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string) =>
          new Promise<Response>((resolve) => {
            downloads.push({ url, done: false, resolve: () => resolve(new Response(new Uint8Array(100), { headers: { "content-length": "100" } })) });
          }),
      ),
    );
    let counter = 0;
    URL.createObjectURL = vi.fn(() => `blob:image-${(counter += 1)}`);
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("moteur puis ressources : 0 → 10 % par jalons, 10 → 100 % par les images, jeu affiché directement quand il est prêt", async () => {
    renderInHost();
    // Code du lecteur reçu et lecteur monté ; moteur pas encore arrivé : initialisation.
    expect(loader()).toHaveAttribute("data-phase", "init");
    expect(percent()).toBe(5);
    await settle();
    // Moteur arrivé : fin de l'initialisation, exactement 10 % (aucune image encore reçue).
    expect(loader()).toHaveAttribute("data-phase", "resources");
    expect(percent()).toBe(10);
    // Images de tout le parcours, en priorité haute, au plus DOWNLOAD_CONCURRENCY à la fois, sans attendre le moteur.
    expect(STARTUP_TEXTURE_URLS).toHaveLength(ALL_TEXTURE_KEYS.length);
    expect(downloads).toHaveLength(DOWNLOAD_CONCURRENCY);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(STARTUP_TEXTURE_URLS[0], expect.objectContaining({ priority: "high", signal: expect.any(AbortSignal) }));
    expect(engine.mount).not.toHaveBeenCalled();
    await finishDownloads();
    expect(downloads.map(({ url }) => url)).toEqual([...STARTUP_TEXTURE_URLS]);
    // Images confiées à la scène en mémoire (un seul téléchargement), une adresse locale par image.
    expect(engine.mount).toHaveBeenCalledOnce();
    expect(engine.images?.size).toBe(STARTUP_TEXTURE_URLS.length);
    expect([...(engine.images?.keys() ?? [])]).toEqual([...STARTUP_TEXTURE_URLS]);
    // Scène en préparation : jamais 100 % avant que la partie puisse commencer.
    expect(percent()).toBeGreaterThan(10);
    expect(percent()).toBeLessThan(100);
    act(() => engine.listener?.(SNAPSHOT));
    expect(loader()).not.toBeNull();
    act(() => engine.listener?.({ ...SNAPSHOT, assets: "ready", assetsLoaded: null, assetsTotal: null }));
    // Prêt : le chargeur disparaît aussitôt, sans fondu, et l'accueil habituel du jeu est là.
    expect(loader()).toBeNull();
    expect(screen.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
    // Une attente ultérieure (reprise exceptionnelle) ne ramène pas le chargeur.
    act(() => engine.listener?.({ ...SNAPSHOT, phase: "DRIVING", assets: "loading", assetsLoaded: null, assetsTotal: null }));
    expect(loader()).toBeNull();
  });

  it("images introuvables après les reprises : le chargeur propose Réessayer, qui relance leur téléchargement", async () => {
    renderInHost();
    await settle();
    await finishDownloads();
    act(() => engine.listener?.({ ...SNAPSHOT, assets: "error" }));
    expect(within(loader() as HTMLElement).getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    await userEvent.setup().click(within(loader() as HTMLElement).getByRole("button", { name: "Réessayer" }));
    expect(engine.retryAssets).toHaveBeenCalledOnce();
    expect(within(loader() as HTMLElement).queryByRole("alert")).not.toBeInTheDocument();
  });
});
