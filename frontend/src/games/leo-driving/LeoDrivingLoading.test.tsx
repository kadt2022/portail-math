import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";
import { STARTUP_TEXTURE_URLS } from "../../prototypes/leo-livreur/leoTextureUrls";
import { ALL_TEXTURE_KEYS } from "../../prototypes/leo-livreur/leoZoneAssets";

const { engine } = vi.hoisted(() => ({
  engine: {
    /** Le premier import du moteur échoue (réseau coupé) quand ce drapeau est levé. */
    failNextImport: false,
    imports: 0,
    listener: null as ((snapshot: LeoLivreurSnapshot) => void) | null,
    mount: vi.fn(),
    retryAssets: vi.fn(),
  },
}));

vi.mock("../../prototypes/leo-livreur/LeoLivreurGame", () => {
  engine.imports += 1;
  if (engine.failNextImport) {
    engine.failNextImport = false;
    throw new Error("réseau coupé");
  }
  return {
    mountLeoLivreurGame: (_host: HTMLElement, listener: (snapshot: LeoLivreurSnapshot) => void) => {
      engine.mount();
      engine.listener = listener;
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
let downloads: Array<{ url: string; resolve: () => void }> = [];

const settle = () =>
  act(async () => {
    for (let step = 0; step < 4; step += 1) {
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
const loadingScreen = () => screen.queryByText("Chargement des ressources")?.closest("[aria-hidden]") ?? null;
const percent = () => Number(document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]')?.getAttribute("aria-valuenow"));

describe("écran de chargement de Conduire avec Léo", () => {
  beforeEach(() => {
    downloads = [];
    engine.imports = 0;
    engine.listener = null;
    engine.mount.mockClear();
    engine.retryAssets.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string) =>
          new Promise<Response>((resolve) => {
            downloads.push({ url, resolve: () => resolve(new Response(new Uint8Array(100), { headers: { "content-length": "100" } })) });
          }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("moteur et images de tout le parcours en même temps ; jouable seulement quand tout est prêt, puis l'écran s'efface", async () => {
    render(<LeoDrivingPlayer />);
    await settle();
    expect(screen.getByText("Chargement des ressources")).toBeInTheDocument();
    // L'écran ne répète pas le nom du jeu (déjà dans l'en-tête du lecteur).
    expect(within(loadingScreen() as HTMLElement).queryByText(/Léo|Conduire/)).not.toBeInTheDocument();
    // Les images de tout le parcours (commun, pont, ville) partent tout de suite, en priorité haute, sans attendre le
    // moteur ; rien d'autre.
    expect(downloads.map(({ url }) => url)).toEqual([...STARTUP_TEXTURE_URLS]);
    expect(STARTUP_TEXTURE_URLS).toHaveLength(ALL_TEXTURE_KEYS.length);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(STARTUP_TEXTURE_URLS[0], expect.objectContaining({ priority: "high", signal: expect.any(AbortSignal) }));
    // Moteur arrivé, images encore en route : la scène n'est pas montée.
    expect(engine.mount).not.toHaveBeenCalled();
    const before = percent();
    for (const download of downloads) download.resolve();
    await settle();
    expect(percent()).toBeGreaterThan(before);
    expect(engine.mount).toHaveBeenCalledOnce();
    // Moteur et images reçus, scène en préparation : jamais 100 % avant que tout soit prêt.
    expect(percent()).toBeLessThan(100);
    // Scène montée, images en cours de lecture par la scène : pas encore jouable.
    act(() => engine.listener?.(SNAPSHOT));
    expect(percent()).toBeLessThan(100);
    expect(loadingScreen()).toHaveAttribute("aria-hidden", "false");
    expect(screen.queryByRole("button", { name: "Commencer" })).not.toBeInTheDocument();
    act(() => engine.listener?.({ ...SNAPSHOT, assets: "ready", assetsLoaded: null, assetsTotal: null }));
    expect(percent()).toBe(100);
    expect(loadingScreen()).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(screen.queryByText("Chargement des ressources")).not.toBeInTheDocument();
    // Plus tard, une attente de zone (pont, ville) ne ramène pas l'écran de chargement.
    act(() => engine.listener?.({ ...SNAPSHOT, phase: "DRIVING", assets: "loading", assetsLoaded: null, assetsTotal: null }));
    expect(screen.queryByText("Chargement des ressources")).not.toBeInTheDocument();
  });

  it("chargement de plus de 20 secondes : un message invite à patienter, le téléchargement continue", () => {
    vi.useFakeTimers();
    try {
      render(<LeoDrivingPlayer />);
      act(() => vi.advanceTimersByTime(20_000));
      expect(screen.getByText(/^Le chargement prend un peu plus de temps. Merci de patienter./)).toHaveAttribute("role", "status");
      // Aucun téléchargement interrompu ni relancé : les mêmes images restent en cours.
      expect(downloads.map(({ url }) => url)).toEqual([...STARTUP_TEXTURE_URLS]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("images du démarrage introuvables après les reprises : Réessayer relance leur téléchargement", async () => {
    render(<LeoDrivingPlayer />);
    await settle();
    for (const download of downloads) download.resolve();
    await settle();
    act(() => engine.listener?.({ ...SNAPSHOT, assets: "error" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    const retries = screen.getAllByRole("button", { name: "Réessayer" });
    await userEvent.setup().click(retries[0]);
    expect(engine.retryAssets).toHaveBeenCalledOnce();
  });

});
