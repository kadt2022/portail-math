import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameAudio } from "../audio/GameAudio";
import type { TurboPulseSnapshot } from "./TurboPulseGame";
import { TurboPulsePage } from "./TurboPulsePage";
import { TurboPulsePlayer } from "./TurboPulsePlayer";
import { TURBO_RANKS } from "./turbo-pulse-ranks";

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

// Décors : chargés aussitôt (aucune image réelle dans jsdom) ; le moteur démarre donc dès le premier décor.
vi.mock("./turbo-pulse-backgrounds", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./turbo-pulse-backgrounds")>()),
  loadImage: () => Promise.resolve(),
  downloadImage: () => Promise.resolve(),
}));

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

/** Le moteur Phaser arrive par un import dynamique (voir TurboPulsePlayer) : on attend son montage. */
const engineMounted = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await vi.dynamicImportSettled();
});

describe("page Turbo Pulse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameMock.listener = null;
    // Musique : chargée aussitôt (aucun fichier réel dans jsdom) ; le chargement se termine donc avec le moteur.
    vi.spyOn(GameAudio.prototype, "loadMusic").mockResolvedValue(undefined);
  });

  it("monte une seule scène, affiche le calcul sans réponse et détruit Phaser à la sortie", async () => {
    const view = render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("2 + 3 = ?")).toBeInTheDocument();
    expect(screen.queryByText("2 + 3 = 5")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ })).toBeInTheDocument();
    view.unmount();
    expect(gameMock.destroy).toHaveBeenCalledOnce();
  });

  it("cadre plus petit que la scène minimale : la scène garde sa taille et elle est réduite pour tenir entière (canon visible)", async () => {
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(360);
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(216);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    const host = screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ });
    // 360 / 480 = 0,75 et 216 / 270 = 0,8 : la plus forte réduction l'emporte, la scène fait 480 × 288 avant réduction.
    expect(host.style.getPropertyValue("--scene-scale")).toBe("0.75");
    expect(host.style.width).toBe("480px");
    expect(host.style.height).toBe("288px");
    expect(gameMock.refreshLayout).toHaveBeenCalled();
    width.mockRestore();
    height.mockRestore();
  });

  it("retour de veille : la scène est remesurée et Phaser recalcule sa taille, sans recréer le jeu", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    gameMock.refreshLayout.mockClear();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    // Deux images d'animation : la nouvelle disposition est appliquée avant la remesure.
    frames.splice(0).forEach((callback) => callback(0));
    expect(gameMock.refreshLayout).not.toHaveBeenCalled();
    frames.splice(0).forEach((callback) => callback(0));
    expect(gameMock.refreshLayout).toHaveBeenCalled();
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("retour de veille : un défilement resté dans le cadre du jeu est annulé, la scène n'est jamais décalée", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    const frame = screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ }).parentElement as HTMLElement;
    // Défilement laissé par le navigateur pendant la veille (bouton « Reprendre » montré alors que la scène débordait).
    let scrollTop = 3.2;
    Object.defineProperty(frame, "scrollTop", { configurable: true, get: () => scrollTop, set: (value: number) => { scrollTop = value; } });
    window.dispatchEvent(new Event("pageshow"));
    frames.splice(0).forEach((callback) => callback(0));
    frames.splice(0).forEach((callback) => callback(0));
    expect(frame.scrollTop).toBe(0);
    vi.unstubAllGlobals();
  });

  it("cadre assez grand : aucune réduction", async () => {
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(960);
    const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(540);
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    const host = screen.getByRole("img", { name: /Scène interactive Turbo Pulse/ });
    expect(host.style.getPropertyValue("--scene-scale")).toBe("");
    expect(host.style.width).toBe("");
    width.mockRestore();
    height.mockRestore();
  });

  it("relie les commandes tactiles de 48 px au contrôleur du jeu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    await user.click(screen.getByRole("button", { name: "Son activé" }));
    await user.click(screen.getByRole("button", { name: "Recommencer la partie" }));
    expect(gameMock.toggleMuted).toHaveBeenCalledOnce();
    expect(gameMock.restartRun).toHaveBeenCalledOnce();
  });

  it("offre la barre de commandes standard : Pause/Jouer, Recommencer, Son, Plein écran et Fermer (pas de Portrait sur ordinateur)", async () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    const bar = screen.getByRole("toolbar", { name: "Commandes du jeu" });
    for (const name of ["Pause", "Recommencer la partie", "Son activé", "Passer en plein écran", "Fermer le jeu et retrouver les autres jeux"]) {
      expect(within(bar).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("échec : une petite carte, le résultat, les tentatives restantes si elles comptent, et une action", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
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

  it("échec sur un niveau ordinaire : seulement le résultat et « Réessayer », sans compteur de tentatives", async () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 0, intrusions: 5, status: "failed", expertAttemptUsed: null, failureAction: "retry" }));
    const panel = screen.getByRole("dialog", { name: "Oups ! Réessaie" });
    expect(within(panel).queryByText(/tentative/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Score/)).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("échec après la dernière tentative experte : le bouton annonce le retour au niveau 1 (mécanisme du moteur conservé)", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, levelName: "Ultra High", intrusions: 1, intrusionLimit: 1, status: "failed", expertAttemptUsed: 3, failureAction: "restart-run" }));
    const panel = screen.getByRole("dialog", { name: "Oups ! Réessaie" });
    expect(within(panel).getByText("Plus de tentative : retour au niveau 1")).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Recommencer au niveau 1" }));
    expect(gameMock.retryLevel).toHaveBeenCalledOnce();
  });

  it("met le jeu en pause sans perte d’état puis reprend exactement où il en était", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();

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

  it("désactive le bouton de lecture pendant un panneau d’échec ou de réussite", async () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.({ ...snapshot, status: "failed", intrusions: 1 }));
    // Panneau de fin : la partie ne tourne plus, le bouton de lecture (« Jouer ») est désactivé.
    expect(screen.getByRole("button", { name: "Jouer" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("victoire : une petite fenêtre « Niveau 1 réussi ! », le score et « Continuer »", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.({ ...snapshot, score: 120, levelIndex: 0, status: "level-complete" }));
    const panel = screen.getByRole("dialog", { name: "Niveau 1 réussi !" });
    expect(within(panel).getByText("Score : 120")).toBeInTheDocument();
    expect(within(panel).getAllByRole("button")).toHaveLength(1);
    await user.click(within(panel).getByRole("button", { name: "Continuer" }));
    expect(gameMock.nextLevel).toHaveBeenCalledOnce();
  });

  it("le numéro et le trophée suivent le niveau terminé : Acier au niveau 1, jamais un trophée doré", async () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    // Niveaux 1 à 6 : réussites intermédiaires, chacune avec son numéro et le rang défini par le jeu.
    for (const levelIndex of [0, 1, 2, 3, 4, 5]) {
      act(() => gameMock.listener?.({ ...snapshot, levelIndex, status: "level-complete" }));
      const rank = TURBO_RANKS[levelIndex];
      const panel = screen.getByRole("dialog", { name: `Niveau ${levelIndex + 1} réussi !` });
      expect(panel).toHaveAttribute("data-rank", rank.id);
      const stops = [...panel.querySelectorAll("stop")].map((stop) => stop.getAttribute("stop-color"));
      expect(stops).toEqual([rank.lightCss, rank.accentCss, rank.darkCss]);
    }
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 0, status: "level-complete" }));
    const steel = screen.getByRole("dialog", { name: "Niveau 1 réussi !" });
    const gold = TURBO_RANKS[6];
    const colors = [...steel.querySelectorAll("stop")].map((stop) => stop.getAttribute("stop-color"));
    expect(colors).not.toContain(gold.accentCss);
    expect(colors).not.toContain(gold.lightCss);
  });

  it("victoire finale au niveau 7 : « Turbo Pulse Or ! », plus marquante, sans « Chevalier d'or »", async () => {
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.({ ...snapshot, levelIndex: 6, status: "mastered", totalSolved: 84 }));

    const panel = screen.getByRole("dialog", { name: "Turbo Pulse Or !" });
    expect(panel).toHaveAttribute("data-rank", "gold");
    expect(panel.className).toMatch(/endMastered/);
    expect(within(panel).getByText("Niveau 7 — Or royal")).toBeInTheDocument();
    expect(screen.queryByText(/chevalier/i)).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Rejouer depuis le niveau 1" })).toBeInTheDocument();
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
    await engineMounted();

    await user.click(screen.getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));

    expect(await screen.findByText("Retour au catalogue")).toBeInTheDocument();
  });

  it("bascule entre plein écran et affichage normal sans recréer Phaser ni dupliquer le canvas", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = requestFullscreen;
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<MemoryRouter><TurboPulsePage /></MemoryRouter>);
    await engineMounted();
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
    await engineMounted();
    await user.click(screen.getByRole("button", { name: "Passer en portrait" }));
    expect(screen.getByRole("region", { name: "Turbo Pulse" })).toHaveAttribute("data-orientation", "portrait");
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("met la partie en pause quand le lecteur n'est plus visible", async () => {
    const view = render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    await engineMounted();
    act(() => gameMock.listener?.(snapshot));
    view.rerender(<MemoryRouter><TurboPulsePlayer active={false} /></MemoryRouter>);
    await engineMounted();
    expect(gameMock.togglePause).toHaveBeenCalledOnce();
  });

  it("lecteur masqué pendant le téléchargement du moteur : la partie démarre en pause", async () => {
    const view = render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    view.rerender(<MemoryRouter><TurboPulsePlayer active={false} /></MemoryRouter>);
    expect(mountTurboPulseGameMock).not.toHaveBeenCalled();
    await engineMounted();
    expect(mountTurboPulseGameMock).toHaveBeenCalledOnce();
    expect(gameMock.togglePause).toHaveBeenCalledOnce();
  });

  it("mise en veille pendant le téléchargement du moteur : la partie démarre en pause, sans repartir seule", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    await engineMounted();
    expect(gameMock.togglePause).toHaveBeenCalledOnce();
    visibility.mockRestore();
  });

  it("Pause pendant le téléchargement du moteur : la demande est affichée puis appliquée à son arrivée", async () => {
    render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    // Moteur pas encore arrivé : le bouton Pause répond quand même (même chemin que la pause de veille du lecteur).
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mountTurboPulseGameMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Jouer" })).toBeInTheDocument();
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    await engineMounted();
    expect(gameMock.togglePause).toHaveBeenCalledOnce();
  });

  it("Pause puis reprise avant l'arrivée du moteur : la partie démarre normalement, sans pause", async () => {
    render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    await engineMounted();
    expect(gameMock.togglePause).not.toHaveBeenCalled();
  });

  it("lecteur visible à l'arrivée du moteur : la partie démarre normalement, sans pause", async () => {
    render(<MemoryRouter><TurboPulsePlayer active /></MemoryRouter>);
    await engineMounted();
    expect(gameMock.togglePause).not.toHaveBeenCalled();
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "requestFullscreen");
    Reflect.deleteProperty(document, "exitFullscreen");
    Reflect.deleteProperty(document, "fullscreenEnabled");
    Reflect.deleteProperty(document, "fullscreenElement");
  });
});
