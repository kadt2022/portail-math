import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GrilleMagiqueGame, type GrilleMagiqueGameProps } from "./GrilleMagiqueGame";

// Math.random figé : la grille est déterministe, les tuiles se ciblent par leur libellé accessible.
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
});

const stat = (name: string) => {
  const term = screen.getAllByRole("term").find((item) => item.textContent === name);
  return term?.nextElementSibling?.textContent;
};

function renderGame(props: GrilleMagiqueGameProps = {}) {
  return render(<GrilleMagiqueGame {...props} />);
}

describe("Tuiles magiques : interface jouable", () => {
  it("affiche le véritable puzzle 3 × 3 avec ses opérations, résultats de lignes et de colonnes, case vide et carte", () => {
    renderGame();
    // Huit tuiles, une case vide, six résultats (3 lignes + 3 colonnes), une carte magique.
    expect(screen.getAllByRole("button", { name: /Ligne \d, colonne \d, valeur \d/ })).toHaveLength(8);
    expect(screen.getByLabelText(/Case vide/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Carte magique, valeur cachée/ })).toBeInTheDocument();
    expect(screen.getAllByText("=").length).toBeGreaterThanOrEqual(6);
  });

  it("garde les commandes essentielles : difficulté, temps, déplacements, score, niveau, indice et recommencer", () => {
    renderGame();
    expect(screen.getByRole("group", { name: "Difficulté" })).toBeInTheDocument();
    for (const label of ["Temps", "Déplacements", "Score", "Niveau"]) {
      expect(stat(label)).toBeDefined();
    }
    expect(screen.getByRole("button", { name: "Demander un indice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recommencer avec une nouvelle grille" })).toBeInTheDocument();
  });

  it("l'indice désigne une tuile et sa destination, sans changer les coups ni le score", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Demander un indice" }));
    expect(screen.getByText(/^Indice : le \d va en ligne \d, colonne \d\.$/)).toBeInTheDocument();
    expect(stat("Déplacements")).toBe("0");
    expect(stat("Score")).toBe("0");
  });

  it("l'indice s'efface après quelques secondes", () => {
    vi.useFakeTimers();
    renderGame();
    act(() => screen.getByRole("button", { name: "Demander un indice" }).click());
    expect(screen.getByText(/^Indice :/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText(/^Indice :/)).not.toBeInTheDocument();
  });

  it("recommencer relance une nouvelle grille : coups et chronomètre repartent de zéro", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }));
    expect(stat("Déplacements")).toBe("1");
    await user.click(screen.getByRole("button", { name: "Recommencer avec une nouvelle grille" }));
    expect(stat("Déplacements")).toBe("0");
    expect(stat("Temps")).toBe("00:00");
  });

  it("changer de difficulté lance une nouvelle grille, la même difficulté ne fait rien", async () => {
    // Hasard varié (graine fixe) : le niveau Moyen a besoin de plusieurs tirages différents pour trouver une grille valide.
    let seed = 7;
    vi.spyOn(Math, "random").mockImplementation(() => (seed = (seed * 16807) % 2147483647) / 2147483647);
    const user = userEvent.setup();
    renderGame();
    const firstMovable = screen.getAllByRole("button", { name: /déplaçable vers la case vide/ })[0];
    await user.click(firstMovable);
    await user.click(screen.getByRole("button", { name: "Facile" }));
    expect(stat("Déplacements")).toBe("1");
    await user.click(screen.getByRole("button", { name: "Moyen" }));
    expect(stat("Déplacements")).toBe("0");
  });

  it("le chronomètre s'arrête quand le jeu n'est pas visible (partie conservée, temps figé)", () => {
    vi.useFakeTimers();
    const { rerender } = renderGame({ active: true });
    act(() => vi.advanceTimersByTime(3000));
    expect(stat("Temps")).toBe("00:03");
    rerender(<GrilleMagiqueGame active={false} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(stat("Temps")).toBe("00:03");
    rerender(<GrilleMagiqueGame active />);
    act(() => vi.advanceTimersByTime(2000));
    expect(stat("Temps")).toBe("00:05");
  });

  it("passer en plein écran ne perd pas la partie : même état avant, pendant et après", async () => {
    const user = userEvent.setup();
    const { rerender } = renderGame({ onFullscreenChange: vi.fn() });
    await user.click(screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }));
    expect(stat("Déplacements")).toBe("1");
    rerender(<GrilleMagiqueGame fullscreen onFullscreenChange={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Jeu Les Tuiles magiques" }).className).toMatch(/fullscreen/);
    expect(stat("Déplacements")).toBe("1");
    rerender(<GrilleMagiqueGame onFullscreenChange={vi.fn()} />);
    expect(stat("Déplacements")).toBe("1");
  });

  it("propose le plein écran et la sortie du plein écran à l'ordinateur, et ferme le jeu", async () => {
    const user = userEvent.setup();
    const onFullscreenChange = vi.fn();
    const onClose = vi.fn();
    const { rerender } = renderGame({ onFullscreenChange, onClose });
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    expect(onClose).toHaveBeenCalled();
    rerender(<GrilleMagiqueGame fullscreen onFullscreenChange={onFullscreenChange} />);
    expect(screen.queryByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
  });

  it("plein écran : plus de barre, seul « Quitter » ; la partie et le tutoriel restent jouables", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onFullscreenChange = vi.fn();
    renderGame({ fullscreen: true, onClose, onFullscreenChange });
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comment jouer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }));
    expect(stat("Déplacements")).toBe("1");
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    expect(onFullscreenChange).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("demande le plein écran natif et l'orientation choisie (paysage par défaut), puis en sort quand l'affichage normal revient", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = request;
    const lock = vi.fn().mockResolvedValue(undefined);
    const unlock = vi.fn();
    vi.stubGlobal("screen", { orientation: { lock, unlock } });
    const exit = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exit;

    const { rerender } = renderGame({ fullscreen: true, onFullscreenChange: vi.fn() });
    await act(async () => {});
    expect(request).toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith("landscape");

    Object.defineProperty(document, "fullscreenElement", { value: document.body, configurable: true });
    rerender(<GrilleMagiqueGame fullscreen={false} onFullscreenChange={vi.fn()} />);
    await act(async () => {});
    expect(exit).toHaveBeenCalled();
    expect(unlock).toHaveBeenCalled();
    vi.unstubAllGlobals();
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("une sortie du plein écran par le système (retour, Échap) ramène à l'affichage normal, sans fermer le jeu", async () => {
    HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", { orientation: { lock: vi.fn().mockResolvedValue(undefined), unlock: vi.fn() } });
    const onClose = vi.fn();
    const onFullscreenChange = vi.fn();
    renderGame({ fullscreen: true, onClose, onFullscreenChange });
    await act(async () => {});
    act(() => {
      document.dispatchEvent(new Event("webkitfullscreenchange"));
    });
    expect(onFullscreenChange).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("sans plein écran natif, la présentation immersive de remplacement fonctionne et rien n'est réinitialisé", async () => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { value: undefined, configurable: true });
    const user = userEvent.setup();
    const { rerender } = renderGame({ fullscreen: true, onFullscreenChange: vi.fn() });
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }));
    rerender(<GrilleMagiqueGame fullscreen={false} onFullscreenChange={vi.fn()} />);
    expect(stat("Déplacements")).toBe("1");
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
  });

  it("lecteur : une barre unique avec un bouton Pause/Jouer, Recommencer, Indice, Plein écran et Fermer, sans boutons de vidéo", () => {
    renderGame({ onFullscreenChange: () => undefined, onClose: () => undefined });
    const bar = screen.getByRole("toolbar", { name: "Commandes du jeu" });
    const names = within(bar)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(names).toEqual([
      "Pause",
      "Recommencer avec une nouvelle grille",
      "Demander un indice",
      "Son activé",
      "Passer en plein écran",
      "Fermer le jeu et retrouver les autres jeux",
    ]);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /précédent|suivant/i })).not.toBeInTheDocument();
  });

  it("un seul bouton de lecture, qui reflète l'état réel : « Pause » pendant la partie, « Jouer » en pause", async () => {
    const user = userEvent.setup();
    renderGame();
    expect(screen.queryByRole("button", { name: "Jouer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jouer" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
  });

  it("pause : le chronomètre s'arrête vraiment et reprend à la même seconde", () => {
    vi.useFakeTimers();
    renderGame();
    act(() => vi.advanceTimersByTime(3000));
    expect(stat("Temps")).toBe("00:03");
    act(() => screen.getByRole("button", { name: "Pause" }).click());
    act(() => vi.advanceTimersByTime(10000));
    expect(stat("Temps")).toBe("00:03");
    act(() => screen.getByRole("button", { name: "Jouer" }).click());
    act(() => vi.advanceTimersByTime(2000));
    expect(stat("Temps")).toBe("00:05");
  });

  it("pause : les tuiles, la carte et l'indice sont bloqués ; Reprendre rend le plateau", async () => {
    const user = userEvent.setup();
    renderGame();
    const board = within(screen.getByRole("region", { name: "Jeu Les Tuiles magiques" }));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(board.getAllByRole("button", { name: /Ligne \d, colonne \d, valeur \d, non déplaçable\./ })).toHaveLength(8);
    expect(screen.getByRole("button", { name: /Carte magique, valeur cachée/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Demander un indice" })).toBeDisabled();
    expect(stat("Déplacements")).toBe("0");
    await user.click(screen.getByRole("button", { name: "Reprendre" }));
    const movable = board.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." });
    await user.click(movable);
    expect(stat("Déplacements")).toBe("1");
  });

  it("recommencer pendant la pause relance une nouvelle partie en cours", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Recommencer avec une nouvelle grille" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByText("Jeu en pause")).not.toBeInTheDocument();
    expect(stat("Temps")).toBe("00:00");
  });

  it("instructions : quatre étapes dans un panneau compact, ouvert et fermé depuis le lecteur", async () => {
    const user = userEvent.setup();
    renderGame();
    expect(screen.queryByRole("region", { name: "Comment jouer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Comment jouer" }));
    const panel = within(screen.getByRole("region", { name: "Comment jouer" }));
    for (const title of ["Observe les sommes", "Déplace les tuiles", "Place la carte magique", "Valide et gagne"]) {
      expect(panel.getByText(title)).toBeInTheDocument();
    }
    expect(panel.getByText("Chaque ligne et chaque colonne doit donner le résultat indiqué.")).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "Fermer les instructions" }));
    expect(screen.queryByRole("region", { name: "Comment jouer" })).not.toBeInTheDocument();
  });

  it("neuf cases, tactile compris : toucher une tuile voisine de la case vide la déplace, une autre est ignorée", async () => {
    const user = userEvent.setup();
    renderGame();
    const within9 = within(screen.getByRole("region", { name: "Jeu Les Tuiles magiques" }));
    const blocked = within9.getByRole("button", { name: "Ligne 2, colonne 2, valeur 3, non déplaçable." });
    expect(blocked).toBeDisabled();
    // Évènements tactiles : un toucher produit pointerdown puis click.
    const movable = within9.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." });
    await user.pointer([{ keys: "[TouchA>]", target: movable }, { keys: "[/TouchA]" }]);
    expect(stat("Déplacements")).toBe("1");
  });

  it("révèle la carte, la pose quand la case vide est au centre, annonce la victoire et propose le niveau suivant", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }));
    await user.click(screen.getByRole("button", { name: "Ligne 2, colonne 2, valeur 3, déplaçable vers la case vide." }));
    await user.click(screen.getByRole("button", { name: /Carte magique, valeur cachée/ }));
    await user.click(screen.getByRole("button", { name: /Carte magique révélée/ }));
    expect(screen.getByText("Bravo ! Toutes les égalités sont vérifiées.")).toBeInTheDocument();
    expect(stat("Score")).not.toBe("0");
    await user.click(screen.getByRole("button", { name: "Demander un indice" }));
    expect(screen.getByText("Bravo ! Toutes les égalités sont vérifiées.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Niveau suivant" }));
    expect(stat("Niveau")).toBe("2");
    expect(stat("Déplacements")).toBe("0");
  });
});

// --- Tutoriel de la première partie : la main montre, l'enfant joue (TM-02) ---

const TUTORIAL_KEY = "mbuyamba:tuiles-magiques:tutoriel";

function seededRandom(seed = 21) {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

const target = () => document.querySelector<HTMLElement>("[data-tutorial-target]");
const hand = () => screen.queryByTestId("tutorial-hand");
// La main s’efface en douceur : elle reste dans la page mais n’est plus affichée (classe handShown retirée).
const handVisible = () => /handShown/.test(hand()?.className ?? "");

describe("Tuiles magiques : tutoriel de la première partie", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(Math, "random").mockImplementation(seededRandom());
  });

  it("n'apparaît pas par défaut, ni quand l'enfant l'a déjà terminé ou passé", () => {
    renderGame();
    expect(hand()).not.toBeInTheDocument();
    expect(screen.queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    window.localStorage.setItem(TUTORIAL_KEY, "fait");
    renderGame({ tutorial: "auto" });
    expect(screen.queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    // Le tutoriel reste disponible à la demande.
    expect(screen.getByRole("button", { name: "Revoir le tutoriel" })).toBeInTheDocument();
  });

  it("commence par la carte magique : la main la désigne, elle est cachée, et l'enfant doit la toucher", () => {
    renderGame({ tutorial: "auto" });
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Touche la carte magique pour la révéler.");
    expect(hand()).toBeInTheDocument();
    expect(hand()).toHaveAttribute("aria-hidden", "true");
    expect(target()).toBe(screen.getByRole("button", { name: /Carte magique, valeur cachée/ }));
    // La main ne fait rien à la place de l'enfant : la carte est toujours cachée.
    expect(screen.getByRole("button", { name: /Carte magique, valeur cachée/ })).toBeInTheDocument();
  });

  it("explique une ligne puis une colonne, avec le bouton « J’ai compris », avant le premier déplacement", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "on" });
    await user.click(screen.getByRole("button", { name: /Carte magique, valeur cachée/ }));
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Chaque ligne doit donner le résultat indiqué à droite.");
    // La main pointe le bouton « J’ai compris » (la vraie action) ; la ligne est entourée d'un cadre, et aucun résultat n'est désigné comme cliquable.
    expect(target()).toHaveTextContent("J’ai compris");
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Chaque colonne doit donner le résultat indiqué en bas.");
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Touche cette tuile pour la glisser vers la case vide.");
    expect(target()).toHaveAttribute("data-value");
  });

  it("résolution complète du premier niveau, du premier clic jusqu'à la victoire, en suivant la main", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "auto" });

    // 1. Révéler la carte magique.
    await user.click(target() as HTMLElement);
    expect(screen.getByRole("button", { name: /Carte magique révélée/ })).toBeInTheDocument();
    // 2. Comprendre le plateau : une ligne, une colonne.
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));

    // 3. et 4. Chaque tuile désignée peut réellement bouger : l'enfant la touche, le moteur compte le coup.
    let moves = 0;
    for (let guard = 0; guard < 12; guard++) {
      const tile = target();
      if (!tile || !tile.hasAttribute("data-value")) break;
      expect(tile).toBeEnabled();
      expect(tile).toHaveAccessibleName(/déplaçable vers la case vide/);
      await user.click(tile);
      moves += 1;
      expect(stat("Déplacements")).toBe(String(moves));
    }
    expect(moves).toBeGreaterThanOrEqual(1);
    expect(moves).toBeLessThanOrEqual(6);

    // 5. La case vide est au centre : la main montre la carte, l'enfant la pose.
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("La case vide est au centre : touche la carte magique pour la poser.");
    expect(target()).toBe(screen.getByRole("button", { name: /Carte magique révélée/ }));
    await user.click(target() as HTMLElement);

    // 6. Victoire déclarée par le vrai moteur : message de fête, score, niveau suivant.
    expect(screen.getAllByText("Bravo ! Tu as résolu ta première partie !").length).toBeGreaterThan(0);
    expect(Number(stat("Score"))).toBeGreaterThan(0);
    expect(handVisible()).toBe(false);
    expect(window.localStorage.getItem(TUTORIAL_KEY)).toBe("fait");
    await user.click(screen.getByRole("button", { name: "Niveau suivant" }));
    expect(stat("Niveau")).toBe("2");
    // Le niveau suivant est une vraie grille, jouée librement.
    expect(screen.queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    expect(handVisible()).toBe(false);
  });

  it("réévalue la situation quand l'enfant fait autre chose : nouvelle indication, toujours un coup légal", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "on" });
    await user.click(target() as HTMLElement);
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));

    const expected = target() as HTMLElement;
    const other = screen
      .getAllByRole("button", { name: /déplaçable vers la case vide/ })
      .find((tile) => tile !== expected && !tile.hasAttribute("disabled")) as HTMLElement;
    await user.click(other);
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("On s’adapte ! Voici la prochaine tuile à toucher.");
    const next = target() as HTMLElement;
    expect(next).toHaveAttribute("data-value");
    expect(next).toBeEnabled();
  });

  it("« Passer le tutoriel » rend la main libre et ne le relance plus ; « Revoir le tutoriel » recommence la démonstration", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "auto" });
    await user.click(screen.getByRole("button", { name: "Passer le tutoriel" }));
    expect(screen.queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    expect(handVisible()).toBe(false);
    expect(window.localStorage.getItem(TUTORIAL_KEY)).toBe("fait");
    // L'enfant joue librement.
    await user.click(screen.getAllByRole("button", { name: /déplaçable vers la case vide/ })[0]);
    expect(stat("Déplacements")).toBe("1");

    await user.click(screen.getByRole("button", { name: "Revoir le tutoriel" }));
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Touche la carte magique pour la révéler.");
    expect(hand()).toBeInTheDocument();
    expect(stat("Déplacements")).toBe("0");
    expect(stat("Niveau")).toBe("1");
  });

  it("recommencer pendant le tutoriel donne une nouvelle grille pédagogique ; changer de difficulté, c'est jouer librement", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "on" });
    await user.click(target() as HTMLElement);
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    await user.click(screen.getByRole("button", { name: "Recommencer avec une nouvelle grille" }));
    expect(screen.getByTestId("tutorial-panel")).toHaveTextContent("Touche la carte magique pour la révéler.");
    await user.click(screen.getByRole("button", { name: "Moyen" }));
    expect(screen.queryByTestId("tutorial-panel")).not.toBeInTheDocument();
    expect(handVisible()).toBe(false);
  });

  it("la tuile qui bouge glisse avec un éclat, et la victoire illumine toutes les tuiles", async () => {
    const user = userEvent.setup();
    renderGame({ tutorial: "on" });
    await user.click(target() as HTMLElement);
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    const first = target() as HTMLElement;
    const value = first.getAttribute("data-value");
    await user.click(first);
    const moved = document.querySelector(`[data-value="${value}"]`) as HTMLElement;
    expect(moved.className).toMatch(/glide/);
    for (let guard = 0; guard < 12; guard++) {
      const tile = target();
      if (!tile || !tile.hasAttribute("data-value")) break;
      await user.click(tile);
    }
    await user.click(target() as HTMLElement);
    const tiles = document.querySelectorAll("[data-value]");
    expect(tiles.length).toBe(9);
    tiles.forEach((tile) => expect((tile as HTMLElement).className).toMatch(/tileWon/));
  });

  it("la main apparaît doucement près de sa cible, calculée d'après l'élément réel (aucune coordonnée écrite en dur)", () => {
    vi.useFakeTimers();
    renderGame({ tutorial: "on" });
    const card = target() as HTMLElement;
    card.getBoundingClientRect = () => ({ left: 200, top: 100, width: 100, height: 100, right: 300, bottom: 200, x: 200, y: 100, toJSON: () => ({}) });
    // Une nouvelle indication replace la main : elle suit la cible mesurée dans la page.
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(hand()?.style.transform).toMatch(/translate3d\(\d+(\.\d+)?px, \d+(\.\d+)?px, 0\)/);
    expect(handVisible()).toBe(false);
    act(() => vi.advanceTimersByTime(260));
    expect(handVisible()).toBe(true);
  });

  it("la main s'efface quand le jeu est fermé (chronomètre et indications en pause)", async () => {
    const { rerender } = renderGame({ tutorial: "on", active: true });
    expect(hand()).toBeInTheDocument();
    rerender(<GrilleMagiqueGame tutorial="on" active={false} />);
    await act(async () => {});
    expect(hand()?.className ?? "").not.toMatch(/handShown/);
  });
});
