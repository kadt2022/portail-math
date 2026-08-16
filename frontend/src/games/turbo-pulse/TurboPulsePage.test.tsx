import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TurboPulseSnapshot } from "./TurboPulseGame";
import { TurboPulsePage } from "./TurboPulsePage";

const { gameMock, mountTurboPulseGameMock } = vi.hoisted(() => {
  const gameMock = {
    destroy: vi.fn(),
    restartRun: vi.fn(),
    retryLevel: vi.fn(),
    nextLevel: vi.fn(),
    toggleMuted: vi.fn(),
    togglePause: vi.fn(),
    refreshLayout: vi.fn(),
    listener: null as null | ((snapshot: TurboPulseSnapshot) => void),
  };
  const mountTurboPulseGameMock = vi.fn((_parent: HTMLElement, listener: (snapshot: TurboPulseSnapshot) => void) => {
    gameMock.listener = listener;
    return gameMock;
  });
  return { gameMock, mountTurboPulseGameMock };
});

vi.mock("./TurboPulseGame", () => ({
  mountTurboPulseGame: mountTurboPulseGameMock,
}));

const snapshot: TurboPulseSnapshot = {
  levelIndex: 0,
  levelName: "Découverte",
  solved: 0,
  score: 0,
  streak: 0,
  intrusions: 0,
  intrusionLimit: 5,
  operation: "2 + 3 = ?",
  status: "playing",
  feedback: "",
  totalSolved: 0,
  remainingFruits: 3,
  failureAction: "retry",
  expertAttemptUsed: null,
  muted: false,
  paused: false,
};

describe("page Turbo Pulse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameMock.listener = null;
  });

  it("monte une seule scène, affiche le calcul sans réponse et détruit Phaser à la sortie", () => {
    const view = render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("2 + 3 = ?")).toBeInTheDocument();
    expect(screen.queryByText("2 + 3 = 5")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ })).toBeInTheDocument();
    view.unmount();
    expect(gameMock.destroy).toHaveBeenCalledOnce();
  });

  it("relie les commandes tactiles de 48 px au contrôleur du jeu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Son activé" }));
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(gameMock.toggleMuted).toHaveBeenCalledOnce();
    expect(gameMock.restartRun).toHaveBeenCalledOnce();
  });

  it("explique exactement l’échec Ultra High et les trois tentatives", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, levelName: "Ultra High", intrusions: 1, intrusionLimit: 1, status: "failed", expertAttemptUsed: 3, failureAction: "restart-run" }));
    expect(screen.getByRole("heading", { name: "Niveau 7 — Ultra High échoué" })).toBeInTheDocument();
    expect(screen.getByText("À Ultra High, aucune intrusion n’est autorisée.")).toBeInTheDocument();
    expect(screen.getByText("3 tentatives terminées. Le parcours reprend au niveau 1.")).toBeInTheDocument();
  });

  it("met le jeu en pause sans perte d’état puis reprend exactement où il en était", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(gameMock.togglePause).toHaveBeenCalledOnce();

    act(() => gameMock.listener?.({ ...snapshot, score: 7, paused: true }));
    const pausePanel = screen.getByRole("dialog", { name: "Jeu en pause" });

    await user.click(within(pausePanel).getByRole("button", { name: "Continuer" }));
    expect(gameMock.togglePause).toHaveBeenCalledTimes(2);

    act(() => gameMock.listener?.({ ...snapshot, score: 7, paused: false }));
    expect(screen.queryByRole("heading", { name: "Jeu en pause" })).not.toBeInTheDocument();
    expect(screen.getByText("🏆 7")).toBeInTheDocument();
  });

  it("ne propose pas de mettre en pause pendant un panneau d’échec ou de réussite", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, status: "failed", intrusions: 1 }));
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("signale une seule intrusion et une tentative encore disponible sur un échec expert non épuisé", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 5, levelName: "X High", intrusions: 1, intrusionLimit: 2, status: "failed", expertAttemptUsed: 1, failureAction: "retry" }));

    expect(screen.getByText("1 fruit a franchi entièrement la ligne de défense.")).toBeInTheDocument();
    expect(screen.getByText("Tentative 1 sur 3 terminée. La prochaine sera la tentative 2 sur 3.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recommencer le niveau 6" })).toBeInTheDocument();
  });

  it("propose de jouer le niveau suivant avec son aperçu une fois un niveau non final terminé", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 0, status: "level-complete" }));

    expect(screen.getByRole("heading", { name: "Niveau 1 terminé !" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "▶ Jouer le niveau 2" })).toBeInTheDocument();
    expect(screen.getByText("Niveau 2 — Low")).toBeInTheDocument();
  });

  it("célèbre la maîtrise complète sans aperçu de niveau suivant", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, status: "mastered", totalSolved: 84 }));

    expect(screen.getByRole("heading", { name: "Turbo Pulse maîtrisé !" })).toBeInTheDocument();
    expect(screen.getByText("Tu as traversé les 7 niveaux et résolu 84 calculs.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejouer depuis le niveau 1" })).toBeInTheDocument();
  });

  it("quitte le plein écran puis retourne au catalogue de jeux au clic sur Quitter", async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exitFullscreen;
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/jeux/turbo-pulse"]}>
        <Routes>
          <Route path="/jeux/turbo-pulse" element={<TurboPulsePage />} />
          <Route path="/jeux" element={<p>Retour au catalogue</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Quitter" }));

    expect(await screen.findByText("Retour au catalogue")).toBeInTheDocument();
  });

  it("passe en plein écran sans recréer Phaser ni dupliquer le canvas, puis revient à l’état précédent", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFullscreen;
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exitFullscreen;

    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Plein écran" }));
    expect(requestFullscreen).toHaveBeenCalledOnce();

    const pageElement = document.querySelector("main");
    Object.defineProperty(document, "fullscreenElement", { value: pageElement, configurable: true });
    act(() => document.dispatchEvent(new Event("fullscreenchange")));

    // Le moteur n'est ni recréé ni dupliqué : un seul montage depuis le début,
    // et le viewport Phaser est simplement réappliqué.
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    expect(gameMock.destroy).not.toHaveBeenCalled();
    expect(gameMock.refreshLayout).toHaveBeenCalled();

    // En plein écran, le header et la statusBar restent visibles pour la jouabilité.
    expect(screen.getByLabelText("État de la partie")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitter le plein écran" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    expect(exitFullscreen).toHaveBeenCalledOnce();

    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    act(() => document.dispatchEvent(new Event("fullscreenchange")));

    expect(screen.getByLabelText("État de la partie")).toBeInTheDocument();
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    expect(gameMock.destroy).not.toHaveBeenCalled();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    Reflect.deleteProperty(document, "fullscreenEnabled");
    Reflect.deleteProperty(document, "fullscreenElement");
  });
});
