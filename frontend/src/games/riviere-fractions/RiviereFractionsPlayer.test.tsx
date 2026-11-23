import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { binding } = vi.hoisted(() => ({
  binding: {
    current: null as unknown,
  },
}));

// Le module du jeu est remplacé par un faux : on vérifie ici le branchement au lecteur standard du portail.
vi.mock("@mbuyamba/riviere-fractions", () => ({
  toRiverLocale: (language: string) => (language.startsWith("en") ? "en" : "fr"),
  useRiverFractions: (settings: unknown) => {
    (binding.current as { settings: unknown }).settings = settings;
    return (binding.current as { game: unknown }).game;
  },
}));

import { RiviereFractionsPlayer } from "./RiviereFractionsPlayer";

function fakeGame(overrides: { ready?: boolean; failed?: boolean } = {}) {
  return {
    stage: <div data-testid="scene">rivière</div>,
    player: {
      label: "Jeu La Rivière des Fractions",
      title: "La Rivière des Fractions",
      headerCenter: "Niveau 1 — Première traversée",
      stats: [
        { label: "Défi", value: "3/7" },
        { label: "Essai", value: "2" },
      ],
      paused: false,
      onPlay: vi.fn(),
      onPause: vi.fn(),
      ended: false,
      onRestart: vi.fn(),
      restartLabel: "Recommencer la traversée depuis le premier défi",
      onHint: vi.fn(),
      hintDisabled: false,
      howTo: [{ title: "Lis la question", text: "Elle s'affiche en haut." }],
    },
    loading: { progress: 0.4, ready: overrides.ready ?? false, failed: overrides.failed ?? false, unsupported: false, retry: vi.fn() },
    sound: { on: true, toggle: vi.fn(), label: "Son activé" },
  };
}

describe("La Rivière des Fractions dans le lecteur standard", () => {
  beforeEach(() => {
    binding.current = { game: fakeGame(), settings: null };
  });

  it("donne au lecteur le titre, le niveau, les compteurs et la scène du jeu", () => {
    render(<RiviereFractionsPlayer pageHeading />);
    expect(screen.getByRole("heading", { level: 1, name: "La Rivière des Fractions" })).toBeInTheDocument();
    expect(screen.getByText("Niveau 1 — Première traversée")).toBeInTheDocument();
    expect(screen.getByText("3/7")).toBeInTheDocument();
    expect(screen.getByTestId("scene")).toBeInTheDocument();
  });

  it("branche les commandes du lecteur sur le jeu, sans en créer d'autres", () => {
    render(<RiviereFractionsPlayer />);
    const game = (binding.current as { game: ReturnType<typeof fakeGame> }).game;
    fireEvent.click(screen.getByRole("button", { name: game.player.restartLabel }));
    expect(game.player.onRestart).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Son activé" }));
    expect(game.sound.toggle).toHaveBeenCalled();
  });

  it("montre l'écran de chargement commun tant que la rivière n'est pas prête", () => {
    render(<RiviereFractionsPlayer />);
    expect(screen.getByText("40 %")).toBeInTheDocument();
  });

  it("passe la langue du portail et la visibilité au jeu", () => {
    render(<RiviereFractionsPlayer active={false} />);
    expect((binding.current as { settings: { locale: string; active: boolean } }).settings).toMatchObject({ active: false });
    expect(["fr", "en"]).toContain((binding.current as { settings: { locale: string } }).settings.locale);
  });
});
