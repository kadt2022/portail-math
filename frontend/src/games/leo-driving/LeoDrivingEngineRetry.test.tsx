import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";

const { engine } = vi.hoisted(() => ({
  engine: {
    /** Le premier import du moteur échoue (réseau coupé). */
    failNextImport: true,
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

/** Téléchargements des images pilotés par le test. */
let downloads: Array<{ url: string; resolve: () => void }> = [];

const settle = () =>
  act(async () => {
    for (let step = 0; step < 4; step += 1) {
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

// Fichier à part : le moteur simulé n'est importé qu'une fois par fichier, et ce premier import doit échouer.
describe("écran de chargement de Conduire avec Léo : moteur indisponible", () => {
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

  it("moteur impossible à télécharger : Réessayer le redemande, puis la partie se prépare normalement", async () => {
    render(<LeoDrivingPlayer />);
    for (const download of downloads) download.resolve();
    await settle();
    expect(engine.mount).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));
    await settle();
    for (const download of downloads) download.resolve();
    await settle();
    expect(engine.imports).toBe(2);
    expect(engine.mount).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
