import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { GamePlayer, type GamePlayerProps } from "./GamePlayer";

// Jeu factice : le lecteur standard ne connaît ni plateau ni règles, il entoure ce que le jeu lui donne.
function FakeGame(props: Partial<GamePlayerProps> & { onRestartSpy?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const { onRestartSpy, ...rest } = props;
  return (
    <GamePlayer
      rootRef={rootRef}
      label="Jeu de test"
      title="Mon jeu"
      stats={[
        { label: "Temps", value: "00:00" },
        { label: "Score", value: 12 },
      ]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      onRestart={onRestartSpy ?? (() => undefined)}
      {...rest}
    >
      <button type="button">Plateau du jeu</button>
    </GamePlayer>
  );
}

// Jeu factice qui tient lui-même son plein écran (comme la page Jeux) et une partie à faire avancer : on vérifie que les
// changements de présentation ne la réinitialisent jamais.
function ModesGame({ onClose = () => undefined }: { onClose?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [moves, setMoves] = useState(0);
  return (
    <GamePlayer
      rootRef={rootRef}
      label="Jeu de test"
      stats={[{ label: "Déplacements", value: moves }]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      onRestart={() => setMoves(0)}
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
      onClose={onClose}
    >
      <button type="button" onClick={() => setMoves((value) => value + 1)}>
        Jouer un coup
      </button>
    </GamePlayer>
  );
}

// Téléphone (ou tablette tactile) : la requête d'appareil du lecteur répond oui.
function stubPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: !query.includes("orientation"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
}

const region = () => screen.getByRole("region", { name: "Jeu de test" });
const movesShown = () => screen.getByText("Déplacements").nextElementSibling?.textContent;

const toolbarNames = () =>
  within(screen.getByRole("toolbar", { name: "Commandes du jeu" }))
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? button.textContent);

describe("Lecteur standard des jeux", () => {
  it("la barre standard : un bouton Pause/Jouer, Recommencer, puis les outils (indice, boutons du jeu, plein écran, fermer)", () => {
    render(
      <FakeGame
        onHint={() => undefined}
        extraControls={<button type="button">Son activé</button>}
        onFullscreenChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(toolbarNames()).toEqual([
      "Pause",
      "Recommencer la partie",
      "Demander un indice",
      "Son activé",
      "Passer en plein écran",
      "Fermer le jeu et retrouver les autres jeux",
    ]);
  });

  it("sans aide, sans plein écran ni fermeture, la barre ne montre que la lecture", () => {
    render(<FakeGame />);
    expect(toolbarNames()).toEqual(["Pause", "Recommencer la partie"]);
    expect(screen.queryByRole("button", { name: "Comment jouer" })).not.toBeInTheDocument();
  });

  it("affiche le titre, les compteurs et le nom accessible de la région", () => {
    render(<FakeGame />);
    expect(screen.getByRole("region", { name: "Jeu de test" })).toBeInTheDocument();
    expect(screen.getByText("Mon jeu")).toBeInTheDocument();
    expect(screen.getByText("Temps").nextElementSibling).toHaveTextContent("00:00");
    expect(screen.getByText("Score").nextElementSibling).toHaveTextContent("12");
  });

  it("pause : la scène devient inerte, le bouton de lecture change selon l'état et le voile propose de reprendre", async () => {
    const user = userEvent.setup();
    render(<FakeGame />);
    const stage = screen.getByRole("button", { name: "Plateau du jeu" }).parentElement as HTMLElement;
    expect(stage).not.toHaveAttribute("inert");
    // Un seul bouton de lecture : « Pause » pendant la partie, « Jouer » en pause.
    expect(screen.queryByRole("button", { name: "Jouer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(stage).toHaveAttribute("inert");
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jouer" }));
    expect(stage).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    // Le voile propose aussi de reprendre.
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
  });

  it("partie terminée : le bouton de lecture (Jouer) et l'indice sont désactivés, sans voile", () => {
    render(<FakeGame ended onHint={() => undefined} />);
    expect(screen.getByRole("button", { name: "Jouer" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander un indice" })).toBeDisabled();
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
  });

  it("recommencer, indice, plein écran et fermer appellent le jeu", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const onHint = vi.fn();
    const onFullscreenChange = vi.fn();
    const onClose = vi.fn();
    render(<FakeGame onRestartSpy={onRestart} onHint={onHint} onFullscreenChange={onFullscreenChange} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Recommencer la partie" }));
    await user.click(screen.getByRole("button", { name: "Demander un indice" }));
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    await user.click(screen.getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onHint).toHaveBeenCalledTimes(1);
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("plein écran : la barre disparaît, seul « ✕ Quitter » reste, et il ramène à l'affichage normal sans fermer le jeu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModesGame onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Jouer un coup" }));
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    // Une seule commande du lecteur : le reste des boutons appartient au jeu.
    const playerButtons = within(region()).getAllByRole("button").filter((button) => button.textContent !== "Jouer un coup");
    expect(playerButtons).toHaveLength(1);
    expect(playerButtons[0]).toHaveAccessibleName("Quitter le plein écran");
    expect(playerButtons[0]).toHaveTextContent("Quitter");
    // Le jeu reste jouable en plein écran.
    await user.click(screen.getByRole("button", { name: "Jouer un coup" }));
    await user.click(playerButtons[0]);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    expect(movesShown()).toBe("2");
  });

  it("ordinateur : pas de bouton Portrait/Paysage, le lecteur reste en paysage", async () => {
    const user = userEvent.setup();
    render(<ModesGame />);
    expect(screen.queryByRole("button", { name: /Passer en (portrait|paysage)/ })).not.toBeInTheDocument();
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region()).toHaveAttribute("data-orientation", "landscape");
  });

  // Téléphone tenu droit (ou couché) : la requête d'orientation suit `held.portrait`, et `rotate` simule une rotation.
  function stubHeldPhone(portrait: boolean) {
    const held = { portrait };
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query.includes("orientation") ? held.portrait : true;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }));
    return {
      rotate: (next: boolean) =>
        act(() => {
          held.portrait = next;
          listeners.forEach((listener) => listener());
        }),
    };
  }

  it("sans option, un téléphone tenu droit ouvre toujours le jeu en paysage (aucun changement pour les autres jeux)", () => {
    stubHeldPhone(true);
    render(<FakeGame />);
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    vi.unstubAllGlobals();
  });

  it("orientation « device » : suit l'appareil à l'ouverture et à chaque rotation, jusqu'au choix du joueur", async () => {
    const phone = stubHeldPhone(true);
    const user = userEvent.setup();
    render(<FakeGame initialOrientation="device" />);
    // Tenu droit : scène portrait dès l'ouverture.
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    // L'enfant couche le téléphone : la scène passe en paysage.
    await phone.rotate(false);
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    await phone.rotate(true);
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    // Choix explicite (bouton Paysage) : il est gardé, même si l'appareil tourne encore.
    await user.click(screen.getByRole("button", { name: "Passer en paysage" }));
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    await phone.rotate(false);
    await phone.rotate(true);
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    vi.unstubAllGlobals();
  });

  it("téléphone : orientation et plein écran sont indépendants, les quatre présentations, sans perte de partie", async () => {
    stubPhone();
    const user = userEvent.setup();
    render(<ModesGame />);
    await user.click(screen.getByRole("button", { name: "Jouer un coup" }));
    // 1. Paysage, affichage normal (par défaut).
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    expect(region().className).not.toMatch(/fullscreen/);
    // 2. Paysage, plein écran.
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region().className).toMatch(/fullscreen/);
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    // 3. Portrait, affichage normal : changer d'orientation ne touche pas au plein écran.
    await user.click(screen.getByRole("button", { name: "Passer en portrait" }));
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    expect(region().className).not.toMatch(/fullscreen/);
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    // 4. Portrait, plein écran : l'orientation choisie est conservée.
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    expect(region().className).toMatch(/fullscreen/);
    // Portrait plein écran → Quitter → portrait normal, barre complète revenue.
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    expect(toolbarNames()).toEqual(["Pause", "Recommencer la partie", "Passer en plein écran", "Passer en paysage", "Fermer le jeu et retrouver les autres jeux"]);
    // Retour au paysage normal.
    await user.click(screen.getByRole("button", { name: "Passer en paysage" }));
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    expect(movesShown()).toBe("1");
    vi.unstubAllGlobals();
  });

  it("téléphone, lecteur sur tout l'écran (cover) : barre visible ; Plein écran masque seulement la barre ; Quitter la rend", async () => {
    stubPhone();
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = requestFullscreen;
    const user = userEvent.setup();
    function CoverGame() {
      const rootRef = useRef<HTMLDivElement>(null);
      const [fullscreen, setFullscreen] = useState(false);
      return (
        <GamePlayer rootRef={rootRef} label="Jeu de test" stats={[]} paused={false} onPlay={() => undefined} onPause={() => undefined} onRestart={() => undefined} cover fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={() => undefined}>
          <span>Plateau</span>
        </GamePlayer>
      );
    }
    render(<CoverGame />);
    // Mode 1 : paysage, lecteur sur tout l'écran, barre complète.
    expect(region().className).toMatch(/screen/);
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    expect(toolbarNames()).toEqual(["Pause", "Recommencer la partie", "Passer en plein écran", "Passer en portrait", "Fermer le jeu et retrouver les autres jeux"]);
    // Mode 2 : la barre disparaît, seul Quitter ; le lecteur lui-même n'est jamais mis en plein écran natif : seul le document
    // l'est (ici redemandé au toucher, puisque le test n'est pas en plein écran natif, comme après une mise en veille).
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(requestFullscreen.mock.contexts.every((target) => target === document.documentElement)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    // Mode 3 puis 4 : portrait avec barre, puis portrait sans barre.
    await user.click(screen.getByRole("button", { name: "Passer en portrait" }));
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region()).toHaveAttribute("data-orientation", "portrait");
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("plein écran sans API native : la présentation de remplacement s'affiche, et Échap ramène à l'affichage normal", async () => {
    const user = userEvent.setup();
    render(<ModesGame />);
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region().className).toMatch(/fullscreen/);
    await user.keyboard("{Escape}");
    expect(region().className).not.toMatch(/fullscreen/);
    expect(screen.getByRole("toolbar", { name: "Commandes du jeu" })).toBeInTheDocument();
  });

  it("sortie du plein écran natif par le système (Échap, geste retour) : affichage normal, partie conservée", async () => {
    HTMLElement.prototype.requestFullscreen = vi.fn(function (this: HTMLElement) {
      Object.defineProperty(document, "fullscreenElement", { value: this, configurable: true });
      return Promise.resolve();
    });
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModesGame onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Jouer un coup" }));
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    await act(async () => {});
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(region().className).not.toMatch(/fullscreen/);
    expect(onClose).not.toHaveBeenCalled();
    expect(movesShown()).toBe("1");
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("téléphone, plein écran natif : l'orientation choisie est verrouillée quand le navigateur le permet, sinon rien ne casse", async () => {
    stubPhone();
    HTMLElement.prototype.requestFullscreen = vi.fn(function (this: HTMLElement) {
      Object.defineProperty(document, "fullscreenElement", { value: this, configurable: true });
      return Promise.resolve();
    });
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", { orientation: { lock, unlock: vi.fn() } });
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ModesGame />);
    await user.click(screen.getByRole("button", { name: "Passer en portrait" }));
    // Affichage normal : pas de verrouillage possible, la scène change seulement de forme.
    expect(lock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    await act(async () => {});
    expect(lock).toHaveBeenLastCalledWith("portrait");
    // Verrouillage refusé (iOS, ordinateur) : la partie continue dans la forme choisie.
    lock.mockRejectedValue(new Error("non pris en charge"));
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    await user.click(screen.getByRole("button", { name: "Passer en paysage" }));
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    await act(async () => {});
    expect(lock).toHaveBeenLastCalledWith("landscape");
    expect(region()).toHaveAttribute("data-orientation", "landscape");
    vi.unstubAllGlobals();
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("plein écran natif : une seconde demande refusée (geste déjà consommé) n'empêche pas d'en sortir", async () => {
    let calls = 0;
    HTMLElement.prototype.requestFullscreen = vi.fn(function (this: HTMLElement) {
      calls += 1;
      if (calls === 1) {
        Object.defineProperty(document, "fullscreenElement", { value: this, configurable: true });
        return Promise.resolve();
      }
      return Promise.reject(new Error("geste déjà consommé"));
    });
    const exit = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exit;
    // Mode strict de React : l'effet est joué deux fois, donc deux demandes, la seconde refusée.
    const { rerender } = render(
      <StrictMode>
        <FakeGame fullscreen onFullscreenChange={() => undefined} />
      </StrictMode>,
    );
    await act(async () => {});
    expect(calls).toBe(2);
    rerender(
      <StrictMode>
        <FakeGame fullscreen={false} onFullscreenChange={() => undefined} />
      </StrictMode>,
    );
    await act(async () => {});
    expect(exit).toHaveBeenCalled();
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("mise en veille : la partie affichée se met en pause ; au réveil, rien ne repart tout seul", async () => {
    // jsdom ne calcule pas la mise en page : le lecteur est déclaré affiché.
    const rects = vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    render(<ModesGame />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Jouer un coup" }));
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Toujours en pause : l'enfant reprend d'un toucher, la partie n'a pas bougé.
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    expect(movesShown()).toBe("1");
    await userEvent.setup().click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
    rects.mockRestore();
  });

  it("mise en veille : une partie déjà en pause, terminée ou non affichée n'est pas touchée", () => {
    const onPause = vi.fn();
    const rects = vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const { rerender } = render(<FakeGame paused onPause={onPause} />);
    window.dispatchEvent(new Event("pagehide"));
    rerender(<FakeGame ended onPause={onPause} />);
    window.dispatchEvent(new Event("pagehide"));
    rects.mockReturnValue([] as unknown as DOMRectList);
    rerender(<FakeGame onPause={onPause} />);
    window.dispatchEvent(new Event("pagehide"));
    expect(onPause).not.toHaveBeenCalled();
    rects.mockRestore();
  });

  it("téléphone, après la veille : le premier toucher dans le lecteur rétablit le plein écran natif et l'orientation choisie", async () => {
    stubPhone();
    const requestFullscreen = vi.fn(function (this: HTMLElement) {
      Object.defineProperty(document, "fullscreenElement", { value: this, configurable: true });
      return Promise.resolve();
    });
    HTMLElement.prototype.requestFullscreen = requestFullscreen;
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", { orientation: { lock, unlock: vi.fn() } });
    render(<FakeGame cover onFullscreenChange={() => undefined} />);
    // Le navigateur a quitté le plein écran pendant la veille.
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    await userEvent.setup().click(screen.getByRole("button", { name: "Plateau du jeu" }));
    expect(requestFullscreen.mock.contexts).toContain(document.documentElement);
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(lock).toHaveBeenCalledWith("landscape");
    vi.unstubAllGlobals();
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("le bouton de lecture garde son nom même quand l'écran étroit n'affiche que son icône", async () => {
    const user = userEvent.setup();
    render(<FakeGame />);
    const bar = within(screen.getByRole("toolbar", { name: "Commandes du jeu" }));
    expect(bar.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-label", "Pause");
    await user.click(bar.getByRole("button", { name: "Pause" }));
    expect(bar.getByRole("button", { name: "Jouer" })).toHaveAttribute("aria-label", "Jouer");
  });

  it("instructions : le bouton « ? » ouvre les étapes données par le jeu, et les ferme", async () => {
    const user = userEvent.setup();
    render(<FakeGame howTo={[{ title: "Première étape", text: "Fais ceci." }, { title: "Seconde étape", text: "Puis cela." }]} />);
    await user.click(screen.getByRole("button", { name: "Comment jouer" }));
    const panel = within(screen.getByRole("region", { name: "Comment jouer" }));
    expect(panel.getByText("Première étape")).toBeInTheDocument();
    expect(panel.getByText("Puis cela.")).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "Fermer les instructions" }));
    expect(screen.queryByRole("region", { name: "Comment jouer" })).not.toBeInTheDocument();
  });

  it("les commandes restent toujours visibles, posées sur le bas de l'image, même après un long moment de jeu", () => {
    vi.useFakeTimers();
    render(<FakeGame onFullscreenChange={() => undefined} onClose={() => undefined} />);
    const bar = screen.getByRole("toolbar", { name: "Commandes du jeu" });
    act(() => vi.advanceTimersByTime(60_000));
    expect(bar).not.toHaveAttribute("data-visible");
    expect(within(bar).getByRole("button", { name: "Pause" })).toBeVisible();
    vi.useRealTimers();
  });
});
