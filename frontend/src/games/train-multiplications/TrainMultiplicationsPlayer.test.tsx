import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GameLoaderHost } from "../loading/GameLoaderHost";
import { startGameLoading } from "../loading/gameLoadingProfiles";
import { TrainMultiplicationsPlayer } from "./TrainMultiplicationsPlayer";

// Le jeu 3D est un module à part : on le remplace par un faux dont l'état de chargement est piloté par le test, pour vérifier
// ce que le lecteur du portail en fait : les étapes réelles du jeu arrivent au chargeur commun, et lui seul s'affiche.
const { game } = vi.hoisted(() => ({
  game: {
    current: null as unknown as {
      loading: { progress: number; engineLoaded: boolean; buildProgress: number; ready: boolean; failed: boolean; unsupported: boolean; retry: () => void };
      [key: string]: unknown;
    },
  },
}));

vi.mock("@mbuyamba/train-multiplications", () => ({
  toTrainLocale: () => "fr",
  useTrainMultiplications: () => game.current,
}));

const percent = () => Number(document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]')?.getAttribute("aria-valuenow"));
const loader = () => document.querySelector("[data-phase]");

function freshGame(retry: () => void) {
  game.current = {
    stage: <div data-testid="scene" />,
    player: {
      label: "Le Train des multiplications",
      title: "Le Train des multiplications",
      headerCenter: "Première ligne",
      stats: [{ label: "Vitesse", value: "0 km/h" }],
      paused: false,
      onPlay: vi.fn(),
      onPause: vi.fn(),
      ended: false,
      onRestart: vi.fn(),
      restartLabel: "Recommencer",
      howTo: [],
    },
    sound: { on: true, toggle: vi.fn(), label: "Couper le son" },
    loading: { progress: 0, engineLoaded: false, buildProgress: 0, ready: false, failed: false, unsupported: false, retry },
  };
}

function setLoading(change: Partial<(typeof game.current)["loading"]>) {
  game.current = { ...game.current, loading: { ...game.current.loading, ...change } };
}

function renderInHost() {
  const session = startGameLoading("train-des-multiplications");
  // Un nouvel élément à chaque rendu : React ne saute pas le rendu du lecteur quand le faux jeu change d'état.
  const tree = () => (
    <GameLoaderHost game="train-des-multiplications" session={session}>
      <TrainMultiplicationsPlayer />
    </GameLoaderHost>
  );
  const view = render(tree());
  return { session, update: () => view.rerender(tree()) };
}

describe("Le Train des multiplications dans le chargeur commun", () => {
  const retry = vi.fn();
  beforeEach(() => {
    retry.mockClear();
    freshGame(retry);
  });

  it("signale ses étapes réelles : lecteur monté, moteur téléchargé, construction du monde ; le chargeur disparaît quand le monde est prêt", () => {
    const { session, update } = renderInHost();
    // Lecteur monté : un jalon de l'initialisation (2 sur 10, donc 2 % de la progression globale).
    expect(loader()).toHaveAttribute("data-phase", "init");
    expect(percent()).toBe(2);
    // Code du lecteur reçu (jalon posé par l'hôte du catalogue ou de la page), puis moteur 3D téléchargé : fin de l'initialisation.
    act(() => session.milestone("player"));
    expect(percent()).toBe(5);
    setLoading({ progress: 0.5, engineLoaded: true });
    act(() => update());
    expect(loader()).toHaveAttribute("data-phase", "resources");
    expect(percent()).toBe(10);
    // Construction du monde : progression réelle de 10 à 100 % ; jamais 100 % avant « prêt ».
    setLoading({ progress: 0.75, buildProgress: 0.5 });
    act(() => update());
    expect(percent()).toBe(55);
    setLoading({ progress: 0.99, buildProgress: 0.98 });
    act(() => update());
    expect(percent()).toBeLessThan(100);
    expect(loader()).not.toBeNull();
    // Monde prêt : le chargeur disparaît aussitôt, la scène est là.
    setLoading({ progress: 1, buildProgress: 1, ready: true });
    act(() => update());
    expect(loader()).toBeNull();
    expect(screen.getByTestId("scene")).toBeInTheDocument();
  });

  it("n'affiche plus l'ancien écran de chargement du jeu : un seul chargeur, celui de l'hôte", () => {
    const { update } = renderInHost();
    setLoading({ progress: 0.6, engineLoaded: true, buildProgress: 0.2 });
    act(() => update());
    expect(document.querySelectorAll('[role=progressbar][aria-label="Chargement du jeu"]')).toHaveLength(1);
  });

  it("échec réel (moteur introuvable) : le chargeur propose Réessayer, qui relance le téléchargement du jeu", async () => {
    const { update } = renderInHost();
    setLoading({ failed: true });
    act(() => update());
    const screenLoader = loader() as HTMLElement;
    expect(within(screenLoader).getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    await userEvent.setup().click(within(screenLoader).getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(within(loader() as HTMLElement).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("appareil sans WebGL ni WebGPU : le chargeur s'efface pour laisser lire le message du jeu, sans bouton Réessayer", () => {
    const { update } = renderInHost();
    setLoading({ failed: true, unsupported: true });
    act(() => update());
    expect(loader()).toBeNull();
    expect(screen.queryByRole("button", { name: "Réessayer" })).not.toBeInTheDocument();
  });
});
