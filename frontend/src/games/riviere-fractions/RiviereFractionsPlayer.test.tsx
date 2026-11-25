import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GameLoaderHost } from "../loading/GameLoaderHost";
import { startGameLoading } from "../loading/gameLoadingProfiles";

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

type FakeLoading = { progress: number; engineLoaded: boolean; buildProgress: number; ready: boolean; failed: boolean; unsupported: boolean; retry: () => void };

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
    // La progression estimée (0,4) n'est jamais affichée : le chargeur commun ne montre que les étapes réelles.
    loading: { progress: 0.4, engineLoaded: false, buildProgress: 0, ready: overrides.ready ?? false, failed: overrides.failed ?? false, unsupported: false, retry: vi.fn() } satisfies FakeLoading,
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

  describe("chargeur commun", () => {
    const percent = () => Number(document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]')?.getAttribute("aria-valuenow"));
    const loader = () => document.querySelector("[data-phase]");
    const setLoading = (change: Partial<FakeLoading>) => {
      const current = binding.current as { game: { loading: FakeLoading } };
      current.game = { ...current.game, loading: { ...current.game.loading, ...change } };
    };
    // Un nouvel élément à chaque rendu : React ne saute pas le rendu du lecteur quand le faux jeu change d'état.
    const renderInHost = () => {
      const session = startGameLoading("riviere-des-fractions");
      const tree = () => (
        <GameLoaderHost game="riviere-des-fractions" session={session}>
          <RiviereFractionsPlayer />
        </GameLoaderHost>
      );
      const view = render(tree());
      return { session, update: () => view.rerender(tree()) };
    };

    it("signale ses étapes réelles : lecteur monté, moteur téléchargé, construction ; il disparaît quand la rivière est prête", () => {
      const { session, update } = renderInHost();
      // Lecteur monté : un jalon (2 sur 10, donc 2 %) ; l'estimation de 40 % du jeu n'est pas montrée.
      expect(loader()).toHaveAttribute("data-phase", "init");
      expect(percent()).toBe(2);
      act(() => session.milestone("player"));
      expect(percent()).toBe(5);
      setLoading({ progress: 0.55, engineLoaded: true });
      act(() => update());
      expect(loader()).toHaveAttribute("data-phase", "resources");
      expect(percent()).toBe(10);
      setLoading({ progress: 0.8, buildProgress: 0.5 });
      act(() => update());
      expect(percent()).toBe(55);
      expect(document.querySelectorAll('[role=progressbar][aria-label="Chargement du jeu"]')).toHaveLength(1);
      setLoading({ progress: 1, buildProgress: 1, ready: true });
      act(() => update());
      expect(loader()).toBeNull();
      expect(screen.getByTestId("scene")).toBeInTheDocument();
    });

    it("échec réel : le chargeur propose Réessayer, qui relance le téléchargement du jeu", async () => {
      const { update } = renderInHost();
      setLoading({ failed: true });
      act(() => update());
      const shown = loader() as HTMLElement;
      expect(within(shown).getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
      await userEvent.setup().click(within(shown).getByRole("button", { name: "Réessayer" }));
      expect((binding.current as { game: { loading: FakeLoading } }).game.loading.retry).toHaveBeenCalledOnce();
    });

    it("appareil sans WebGL : le chargeur s'efface pour laisser lire le message du jeu, sans bouton Réessayer", () => {
      const { update } = renderInHost();
      setLoading({ failed: true, unsupported: true });
      act(() => update());
      expect(loader()).toBeNull();
      expect(screen.queryByRole("button", { name: "Réessayer" })).not.toBeInTheDocument();
    });
  });

  it("passe la langue du portail et la visibilité au jeu", () => {
    render(<RiviereFractionsPlayer active={false} />);
    expect((binding.current as { settings: { locale: string; active: boolean } }).settings).toMatchObject({ active: false });
    expect(["fr", "en"]).toContain((binding.current as { settings: { locale: string } }).settings.locale);
  });
});
