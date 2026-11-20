import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GrilleMagiqueGame } from "./GrilleMagiqueGame";

// Le son des Tuiles magiques passe par le crochet commun du lecteur : on le remplace par un espion pour vérifier quel effet part
// à chaque geste de l'enfant, et quand la musique doit jouer.
const { sound, hookCalls } = vi.hoisted(() => ({
  sound: { play: vi.fn(), toggleMuted: vi.fn(), muted: false },
  hookCalls: [] as { musicOn: boolean; musicVolume?: number }[],
}));
vi.mock("../audio/useGameAudio", () => ({
  useGameAudio: (options: { musicOn: boolean; musicVolume?: number }) => {
    hookCalls.push({ musicOn: options.musicOn, musicVolume: options.musicVolume });
    return sound;
  },
}));

const TUTORIAL_KEY = "mbuyamba:tuiles-magiques:tutoriel";
const target = () => document.querySelector<HTMLElement>("[data-tutorial-target]");
const effects = () => sound.play.mock.calls.map(([effect]) => effect);

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  window.localStorage.removeItem(TUTORIAL_KEY);
  sound.play.mockClear();
  sound.toggleMuted.mockClear();
  hookCalls.length = 0;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Tuiles magiques : sons", () => {
  it("chaque geste a son effet : carte révélée, tuile qui glisse, indice, carte posée et grille réussie", async () => {
    const user = userEvent.setup();
    render(<GrilleMagiqueGame tutorial="auto" />);

    await user.click(target() as HTMLElement);
    expect(effects()).toEqual(["cardReveal"]);

    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    await user.click(screen.getByRole("button", { name: "J’ai compris" }));
    sound.play.mockClear();
    await user.click(screen.getByRole("button", { name: "Demander un indice" }));
    expect(effects()).toEqual(["hint"]);

    // Les tuiles désignées par la main glissent une à une jusqu'à libérer le centre.
    sound.play.mockClear();
    let moves = 0;
    for (let guard = 0; guard < 12; guard += 1) {
      const tile = target();
      if (!tile || !tile.hasAttribute("data-value")) break;
      await user.click(tile);
      moves += 1;
    }
    expect(moves).toBeGreaterThan(0);
    expect(effects()).toEqual(new Array(moves).fill("tileSlide"));

    // Carte posée au centre : la grille est juste, l'arpège de victoire part.
    sound.play.mockClear();
    await user.click(target() as HTMLElement);
    expect(effects()).toEqual(["gridWin"]);
  });

  it("carte touchée alors que le centre n'est pas libre : un coup feutré, rien ne bouge", async () => {
    const user = userEvent.setup();
    render(<GrilleMagiqueGame />);
    const card = screen.getByRole("button", { name: /Carte magique, valeur cachée/ });
    await user.click(card);
    sound.play.mockClear();
    await user.click(screen.getByRole("button", { name: /Carte magique révélée/ }));
    // Avec la grille fixée par le test, la case vide n'est pas au centre au départ.
    expect(effects()).toEqual(["tileBlocked"]);
  });

  it("la musique joue pendant la partie et se tait en pause ; volume d'ambiance discret", async () => {
    const user = userEvent.setup();
    render(<GrilleMagiqueGame />);
    expect(hookCalls.at(-1)).toEqual({ musicOn: true, musicVolume: 0.3 });
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(hookCalls.at(-1)?.musicOn).toBe(false);
    await user.click(screen.getByRole("button", { name: "Jouer" }));
    expect(hookCalls.at(-1)?.musicOn).toBe(true);
  });

  it("jeu masqué (fermé) : la musique se tait", () => {
    const { rerender } = render(<GrilleMagiqueGame />);
    rerender(<GrilleMagiqueGame active={false} />);
    expect(hookCalls.at(-1)?.musicOn).toBe(false);
  });

  it("le bouton Son de la barre est la commande générale", async () => {
    const user = userEvent.setup();
    render(<GrilleMagiqueGame />);
    const button = screen.getByRole("button", { name: "Son activé" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(button);
    expect(sound.toggleMuted).toHaveBeenCalledOnce();
  });
});
