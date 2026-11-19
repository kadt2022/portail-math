import { afterEach, describe, expect, it, vi } from "vitest";

import { enterNativeFullscreen, exitNativeFullscreen, fullscreenElement } from "./fullscreen";

type Doc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
  delete (document as Doc).webkitFullscreenElement;
  delete (document as Doc).webkitExitFullscreen;
});

describe("plein écran natif", () => {
  it("demande le plein écran, puis le verrouillage en paysage quand on le souhaite", async () => {
    const element = document.createElement("div");
    const request = vi.fn().mockResolvedValue(undefined);
    element.requestFullscreen = request;
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", { orientation: { lock, unlock: vi.fn() } });

    await expect(enterNativeFullscreen(element, true)).resolves.toBe(true);
    expect(request).toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith("landscape");
  });

  it("n'exige pas le verrouillage : un refus d'orientation ne casse rien", async () => {
    const element = document.createElement("div");
    element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", { orientation: { lock: vi.fn().mockRejectedValue(new Error("refusé")) } });
    await expect(enterNativeFullscreen(element, true)).resolves.toBe(true);

    const noLockSupport = document.createElement("div");
    noLockSupport.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("screen", {});
    await expect(enterNativeFullscreen(noLockSupport, true)).resolves.toBe(true);
  });

  it("ne verrouille pas l'orientation sur ordinateur", async () => {
    const element = document.createElement("div");
    element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const lock = vi.fn();
    vi.stubGlobal("screen", { orientation: { lock } });
    await enterNativeFullscreen(element, false);
    expect(lock).not.toHaveBeenCalled();
  });

  it("renvoie false sans erreur quand le plein écran est absent ou refusé (présentation de remplacement)", async () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "requestFullscreen", { value: undefined, configurable: true });
    await expect(enterNativeFullscreen(element, true)).resolves.toBe(false);

    const refused = document.createElement("div");
    refused.requestFullscreen = vi.fn().mockRejectedValue(new Error("refusé"));
    await expect(enterNativeFullscreen(refused, true)).resolves.toBe(false);
  });

  it("utilise la version WebKit quand la version standard n'existe pas", async () => {
    const element = document.createElement("div") as HTMLElement & { webkitRequestFullscreen?: () => void };
    Object.defineProperty(element, "requestFullscreen", { value: undefined, configurable: true });
    element.webkitRequestFullscreen = vi.fn();
    await expect(enterNativeFullscreen(element, false)).resolves.toBe(true);
    expect(element.webkitRequestFullscreen).toHaveBeenCalled();
  });

  it("lit l'élément en plein écran (standard ou WebKit)", () => {
    expect(fullscreenElement()).toBeNull();
    const el = document.createElement("div");
    (document as Doc).webkitFullscreenElement = el;
    expect(fullscreenElement()).toBe(el);
    Object.defineProperty(document, "fullscreenElement", { value: document.body, configurable: true });
    expect(fullscreenElement()).toBe(document.body);
  });

  it("quitte le plein écran et lève le verrou d'orientation, sans erreur s'il n'y a rien à quitter", async () => {
    const unlock = vi.fn();
    vi.stubGlobal("screen", { orientation: { unlock } });
    await expect(exitNativeFullscreen()).resolves.toBeUndefined();
    expect(unlock).toHaveBeenCalled();

    const exit = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "fullscreenElement", { value: document.body, configurable: true });
    document.exitFullscreen = exit;
    await exitNativeFullscreen();
    expect(exit).toHaveBeenCalled();

    document.exitFullscreen = vi.fn().mockRejectedValue(new Error("déjà sorti"));
    await expect(exitNativeFullscreen()).resolves.toBeUndefined();
  });
});
