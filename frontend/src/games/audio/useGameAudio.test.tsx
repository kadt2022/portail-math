import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGameAudio } from "./useGameAudio";

// Moteur audio remplacé par un espion : on vérifie ce que le crochet lui demande, au bon moment.
const { engines } = vi.hoisted(() => ({ engines: [] as Record<string, ReturnType<typeof vi.fn>>[] }));
vi.mock("./GameAudio", () => ({
  isMutedPreference: () => false,
  GameAudio: vi.fn(function GameAudio(this: Record<string, unknown>) {
    const engine = {
      loadMusic: vi.fn().mockResolvedValue(undefined),
      unlock: vi.fn(),
      playMusic: vi.fn(),
      pauseMusic: vi.fn(),
      play: vi.fn(),
      setMuted: vi.fn(),
      dispose: vi.fn(),
    };
    engines.push(engine);
    Object.assign(this, engine);
  }),
}));

afterEach(() => {
  engines.length = 0;
});

function setup(musicOn: boolean) {
  const root = document.createElement("div");
  // Référence stable, comme celle d'un vrai lecteur.
  const rootRef = { current: root };
  const loadMusic = vi.fn().mockResolvedValue({ default: "/ambiance.mp3" });
  const hook = renderHook((props: { musicOn: boolean }) => useGameAudio({ rootRef, loadMusic, musicOn: props.musicOn, musicVolume: 0.3 }), {
    initialProps: { musicOn },
  });
  return { ...hook, root, loadMusic, engine: () => engines.at(-1)! };
}

describe("son d'un jeu dans le lecteur", () => {
  it("télécharge la musique à l'ouverture, la joue pendant la partie et la coupe en fondu sinon", async () => {
    const { rerender, loadMusic, engine } = setup(true);
    await act(async () => {});
    expect(loadMusic).toHaveBeenCalledOnce();
    expect(engine().loadMusic).toHaveBeenCalledWith("/ambiance.mp3");
    expect(engine().playMusic).toHaveBeenCalled();
    rerender({ musicOn: false });
    expect(engine().pauseMusic).toHaveBeenCalled();
  });

  it("un toucher dans le lecteur réveille le son ; la fermeture rend le moteur audio", () => {
    const { root, unmount, engine } = setup(false);
    const current = engine();
    current.unlock.mockClear();
    root.dispatchEvent(new Event("pointerdown"));
    expect(current.unlock).toHaveBeenCalledOnce();
    unmount();
    expect(current.dispose).toHaveBeenCalled();
  });

  it("onglet caché : la musique se tait, puis reprend quand il revient", () => {
    const { engine } = setup(true);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(engine().pauseMusic).toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    engine().playMusic.mockClear();
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(engine().playMusic).toHaveBeenCalled();
    visibility.mockRestore();
  });

  it("effets et commande générale passent au moteur audio", () => {
    const { result, engine } = setup(true);
    const current = engine();
    result.current.play("hint");
    expect(current.play).toHaveBeenCalledWith("hint", undefined);
    act(() => result.current.toggleMuted());
    expect(current.setMuted).toHaveBeenCalledWith(true);
    // Le moteur n'est pas recréé par ce changement.
    expect(engine()).toBe(current);
    expect(result.current.muted).toBe(true);
  });
});
