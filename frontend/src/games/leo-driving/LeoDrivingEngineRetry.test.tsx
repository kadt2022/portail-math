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

import { GameLoaderHost } from "../loading/GameLoaderHost";
import { startGameLoading } from "../loading/gameLoadingProfiles";
import { LeoDrivingPlayer } from "./LeoDrivingPlayer";

const settle = () =>
  act(async () => {
    for (let step = 0; step < 8; step += 1) {
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });

// Fichier à part : le moteur simulé n'est importé qu'une fois par fichier, et ce premier import doit échouer.
describe("Conduire avec Léo dans le chargeur commun : moteur indisponible", () => {
  beforeEach(() => {
    engine.imports = 0;
    engine.listener = null;
    engine.mount.mockClear();
    engine.retryAssets.mockClear();
    // Images reçues aussitôt : seul le moteur manque.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(100), { headers: { "content-length": "100" } })));
    URL.createObjectURL = vi.fn(() => "blob:image");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("moteur impossible à télécharger : le chargeur propose Réessayer, qui le redemande, puis la partie se prépare", async () => {
    const session = startGameLoading("conduire-avec-leo");
    render(
      <GameLoaderHost game="conduire-avec-leo" session={session}>
        <LeoDrivingPlayer />
      </GameLoaderHost>,
    );
    await settle();
    expect(engine.mount).not.toHaveBeenCalled();
    // Le moteur manque : on reste dans l'initialisation, avec le message d'erreur et Réessayer.
    expect(document.querySelector("[data-phase]")).toHaveAttribute("data-phase", "init");
    expect(screen.getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));
    await settle();
    expect(engine.imports).toBe(2);
    expect(engine.mount).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
