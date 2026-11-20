import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TurboPulsePlayer } from "./TurboPulsePlayer";

// Moteur Phaser remplacé : on ne teste ici que le chargement du décor du niveau.
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

// Décor du premier niveau introuvable (réseau coupé) : son téléchargement échoue.
vi.mock("../../assets/turbo-pulse/niv001.webp", () => {
  throw new Error("réseau coupé");
});

describe("décor de Turbo Pulse", () => {
  it("si le décor du niveau ne se charge pas, la partie s'affiche quand même, sans erreur non traitée", async () => {
    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    render(<TurboPulsePlayer />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("region", { name: "Turbo Pulse" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(unhandled).not.toHaveBeenCalled();
    window.removeEventListener("unhandledrejection", unhandled);
  });
});
