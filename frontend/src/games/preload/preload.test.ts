import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PointerEvent } from "react";

import { intentHandlers } from "./cardIntent";
import { createIntentPreloader } from "./intentPreloader";

/** Chargements pilotés par le test : chacun attend qu'on le termine. */
function controlledLoader() {
  const calls: Array<{ id: string; finish: () => void }> = [];
  const load = vi.fn(
    (id: string) =>
      new Promise<void>((resolve) => {
        calls.push({ id, finish: resolve });
      }),
  );
  return { load, calls };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

describe("préchargement sur survol stable", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("simple passage de la souris (moins de 250 ms) : rien n'est téléchargé", async () => {
    const { load } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    preloader.intent("turbo-pulse");
    await vi.advanceTimersByTimeAsync(200);
    preloader.end("turbo-pulse");
    await vi.advanceTimersByTimeAsync(500);
    expect(load).not.toHaveBeenCalled();
  });

  it("survol stable de 250 ms : un seul préchargement, jamais répété pour le même jeu", async () => {
    const { load, calls } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    preloader.intent("turbo-pulse");
    await vi.advanceTimersByTimeAsync(249);
    expect(load).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledWith("turbo-pulse");
    calls[0].finish();
    await settle();
    preloader.intent("turbo-pulse");
    await vi.advanceTimersByTimeAsync(500);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("souris qui traverse vite le catalogue : seule la carte où elle s'arrête est préchargée", async () => {
    const { load } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    for (const id of ["a", "b", "c", "d", "e"]) {
      preloader.intent(id);
      await vi.advanceTimersByTimeAsync(60);
      preloader.end(id);
    }
    preloader.intent("f");
    await vi.advanceTimersByTimeAsync(300);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["f"]);
  });

  it("une seule intention en attente : la nouvelle carte remplace la précédente", async () => {
    const { load } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    preloader.intent("a");
    await vi.advanceTimersByTimeAsync(150);
    preloader.intent("b");
    await vi.advanceTimersByTimeAsync(150);
    expect(load).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["b"]);
  });

  it("un seul préchargement à la fois ; celui qui attend dans la file est retiré si le pointeur quitte la carte", async () => {
    const { load, calls } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    for (const id of ["a", "b", "c"]) {
      preloader.intent(id);
      await vi.advanceTimersByTimeAsync(250);
    }
    expect(load).toHaveBeenCalledTimes(1);
    preloader.end("b");
    calls[0].finish();
    await settle();
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a", "c"]);
  });

  it("jeu choisi : l'intention et la file en attente sont abandonnées, le jeu ouvert garde le débit", async () => {
    const { load, calls } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    preloader.intent("a");
    await vi.advanceTimersByTimeAsync(250);
    preloader.intent("b");
    await vi.advanceTimersByTimeAsync(250);
    preloader.intent("c");
    preloader.cancelAll();
    calls[0].finish();
    await vi.advanceTimersByTimeAsync(500);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a"]);
  });

  it("un préchargement en échec ne bloque pas la file", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("réseau coupé")).mockResolvedValue(undefined);
    const preloader = createIntentPreloader({ load });
    preloader.intent("a");
    await vi.advanceTimersByTimeAsync(250);
    preloader.intent("b");
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a", "b"]);
  });
});

describe("défilement pendant le survol", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("la carte a quitté le pointeur pendant un défilement, sans signaler sa sortie : elle n'est pas préchargée", async () => {
    const { load } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    let stillHovered = true;
    preloader.intent("turbo-pulse", () => stillHovered);
    await vi.advanceTimersByTimeAsync(100);
    // La page défile : la carte glisse hors du pointeur, et aucun événement de sortie n'arrive.
    stillHovered = false;
    await vi.advanceTimersByTimeAsync(300);
    expect(load).not.toHaveBeenCalled();
    // Le pointeur revient plus tard sur la carte et s'y arrête : préchargement normal.
    stillHovered = true;
    preloader.intent("turbo-pulse", () => stillHovered);
    await vi.advanceTimersByTimeAsync(250);
    expect(load).toHaveBeenCalledWith("turbo-pulse");
  });

  it("carte en attente dans la file, puis emportée par un défilement : revérifiée au départ, elle n'est pas téléchargée", async () => {
    const { load, calls } = controlledLoader();
    const preloader = createIntentPreloader({ load });
    preloader.intent("a");
    await vi.advanceTimersByTimeAsync(250);
    // « b » passe ses 250 ms pendant que « a » se télécharge : il attend dans la file.
    let bHovered = true;
    preloader.intent("b", () => bHovered);
    await vi.advanceTimersByTimeAsync(250);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a"]);
    // La page défile : la carte « b » quitte le pointeur sans événement de sortie.
    bHovered = false;
    calls[0].finish();
    await settle();
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a"]);
    // Plus tard, la souris revient et s'arrête sur « b » : il est alors préchargé normalement.
    bHovered = true;
    preloader.intent("b", () => bHovered);
    await vi.advanceTimersByTimeAsync(250);
    expect(load.mock.calls.map(([id]) => id)).toEqual(["a", "b"]);
  });
});

describe("carte toujours sous le pointeur", () => {
  afterEach(() => vi.restoreAllMocks());

  it("vrai si l'élément sous la dernière position du pointeur est dans la carte, faux s'il est ailleurs", () => {
    const card = document.createElement("a");
    const title = document.createElement("span");
    card.appendChild(title);
    const elsewhere = document.createElement("div");
    document.body.append(card, elsewhere);
    const onIntent = vi.fn();
    const handlers = intentHandlers("turbo-pulse", onIntent);
    handlers.onPointerEnter?.({ pointerType: "mouse", clientX: 40, clientY: 60, currentTarget: card } as unknown as PointerEvent<Element>);
    const stillHovered = onIntent.mock.calls[0][1] as () => boolean;
    const underPointer = vi.fn((x: number, y: number) => (x === 40 && y === 60 ? title : null));
    Object.defineProperty(document, "elementFromPoint", { value: underPointer, configurable: true });
    expect(stillHovered()).toBe(true);
    // La page a défilé : à la même position de l'écran, il y a maintenant autre chose que la carte.
    underPointer.mockReturnValue(elsewhere);
    expect(stillHovered()).toBe(false);
    card.remove();
    elsewhere.remove();
  });

  it("un doigt sur un écran tactile n'est pas un survol : aucune intention", () => {
    const onIntent = vi.fn();
    const handlers = intentHandlers("turbo-pulse", onIntent);
    handlers.onPointerEnter?.({ pointerType: "touch", clientX: 0, clientY: 0, currentTarget: document.body } as unknown as PointerEvent<Element>);
    expect(onIntent).not.toHaveBeenCalled();
  });
});
