import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TurboPulseSnapshot } from "./TurboPulseGame";
import { TurboPulsePage } from "./TurboPulsePage";
import { TurboPulsePlayer } from "./TurboPulsePlayer";

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
  MIN_WORLD_WIDTH: 480,
  MIN_WORLD_HEIGHT: 270,
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

  it("cadre plus petit que la scène minimale : la scène garde sa taille et elle est réduite pour tenir entière (canon visible)", () => {
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(360);
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(216);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    const host = screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ });
    // 360 / 480 = 0,75 et 216 / 270 = 0,8 : la plus forte réduction l'emporte, la scène fait 480 × 288 avant réduction.
    expect(host.style.getPropertyValue("--scene-scale")).toBe("0.75");
    expect(host.style.width).toBe("480px");
    expect(host.style.height).toBe("288px");
    expect(gameMock.refreshLayout).toHaveBeenCalled();
    width.mockRestore();
    height.mockRestore();
  });

  it("cadre assez grand : aucune réduction", () => {
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(960);
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(540);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    const host = screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ });
    expect(host.style.getPropertyValue("--scene-scale")).toBe("");
    expect(host.style.width).toBe("");
    width.mockRestore();
    height.mockRestore();
  });

  it("relie les commandes tactiles de 48 px au contrôleur du jeu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Son activé" }));
    await user.click(screen.getByRole("button", { name: "Recommencer la partie" }));
    expect(gameMock.toggleMuted).toHaveBeenCalledOnce();
    expect(gameMock.restartRun).toHaveBeenCalledOnce();
  });

  it("offre la barre de commandes standard : Pause/Jouer, Recommencer, Son, Plein écran et Fermer (pas de Portrait sur ordinateur)", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    const bar = screen.getByRole("toolbar", { name: "Commandes du jeu" });
    for (const name of ["Pause", "Recommencer la partie", "Son activé", "Passer en plein écran", "Fermer le jeu et retrouver les autres jeux"]) {
      expect(within(bar).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("échec : une petite carte, le résultat, les tentatives restantes si elles comptent, et une action", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, score: 42, levelIndex: 5, levelName: "X High", intrusions: 1, intrusionLimit: 2, status: "failed", expertAttemptUsed: 1, failureAction: "retry" }));
    const panel = screen.getByRole("dialog", { name: "Oups ! Réessaie" });
    // Échec : pas de score ; sur un niveau expert, les tentatives restantes (et rien d'autre).
    expect(within(panel).getByText("Encore 2 tentatives")).toBeInTheDocument();
    // Aucun long paragraphe : juste le titre, le score et un seul bouton.
    expect(within(panel).getAllByRole("button")).toHaveLength(1);
    expect(within(panel).queryByText(/franchi entièrement/)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Tentative/)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Réessayer" }));
    expect(gameMock.retryLevel).toHaveBeenCalledOnce();
  });

  it("échec sur un niveau ordinaire : seulement le résultat et « Réessayer », sans compteur de tentatives", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 0, intrusions: 5, status: "failed", expertAttemptUsed: null, failureAction: "retry" }));
    const panel = screen.getByRole("dialog", { name: "Oups ! Réessaie" });
    expect(within(panel).queryByText(/tentative/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Score/)).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("échec après la dernière tentative experte : le bouton annonce le retour au niveau 1 (mécanisme du moteur conservé)", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, levelName: "Ultra High", intrusions: 1, intrusionLimit: 1, status: "failed", expertAttemptUsed: 3, failureAction: "restart-run" }));
    const panel = screen.getByRole("dialog", { name: "Oups ! Réessaie" });
    expect(within(panel).getByText("Plus de tentative : retour au niveau 1")).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Recommencer au niveau 1" }));
    expect(gameMock.retryLevel).toHaveBeenCalledOnce();
  });

  it("met le jeu en pause sans perte d’état puis reprend exactement où il en était", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(gameMock.togglePause).toHaveBeenCalledOnce();

    act(() => gameMock.listener?.({ ...snapshot, score: 7, paused: true }));
    // Voile de pause standard du lecteur : le même pour tous les jeux.
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(gameMock.togglePause).toHaveBeenCalledTimes(2);

    act(() => gameMock.listener?.({ ...snapshot, score: 7, paused: false }));
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
    expect(screen.getByText("🏆 7")).toBeInTheDocument();
  });

  it("désactive le bouton de lecture pendant un panneau d’échec ou de réussite", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, status: "failed", intrusions: 1 }));
    // Panneau de fin : la partie ne tourne plus, le bouton de lecture (« Jouer ») est désactivé.
    expect(screen.getByRole("button", { name: "Jouer" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("victoire : une petite fenêtre « Niveau réussi ! », le score et « Continuer »", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, score: 120, levelIndex: 0, status: "level-complete" }));
    const panel = screen.getByRole("dialog", { name: "Niveau réussi !" });
    expect(within(panel).getByText("Score : 120")).toBeInTheDocument();
    expect(within(panel).getAllByRole("button")).toHaveLength(1);
    await user.click(within(panel).getByRole("button", { name: "Continuer" }));
    expect(gameMock.nextLevel).toHaveBeenCalledOnce();
  });

  it("célèbre la maîtrise complète dans la même petite fenêtre", () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, status: "mastered", totalSolved: 84 }));

    expect(screen.getByRole("heading", { name: "Chevalier d'Or" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));

    expect(await screen.findByText("Retour au catalogue")).toBeInTheDocument();
  });

  it("bascule entre plein écran et affichage normal sans recréer Phaser ni dupliquer le canvas", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFullscreen;
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();

    // La page autonome s'ouvre en affichage normal ; en plein écran, la barre disparaît et seul « Quitter » reste.
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.getByLabelText("État de la partie")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));

    // Le moteur n'est ni recréé ni dupliqué ; le panneau des scores et la barre complète sont revenus.
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    expect(gameMock.destroy).not.toHaveBeenCalled();
    expect(gameMock.refreshLayout).toHaveBeenCalled();
    expect(screen.getByLabelText("État de la partie")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recommencer la partie" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Passer en portrait" })).not.toBeInTheDocument();
  });

  it("téléphone : le portrait garde la même partie, sans recréer Phaser", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: !query.includes("orientation"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Passer en portrait" }));
    expect(screen.getByRole("region", { name: "Turbo Pulse" })).toHaveAttribute("data-orientation", "portrait");
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("met la partie en pause quand le lecteur n'est plus visible", () => {
    const view = render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    act(() => gameMock.listener?.(snapshot));
    view.rerender(<MemoryRouter><TurboPulsePlayer active={false} /></MemoryRouter>);
    expect(gameMock.togglePause).toHaveBeenCalledOnce();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    Reflect.deleteProperty(document, "fullscreenEnabled");
    Reflect.deleteProperty(document, "fullscreenElement");
  });
});
