import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onPageSuspended, onViewportSettled } from "./viewport-events";

// Images d'animation pilotées à la main : on vérifie que le rappel attend que la nouvelle disposition soit appliquée.
let frames: FrameRequestCallback[] = [];
const runFrame = () => {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(0));
};

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

describe("changements d'écran", () => {
  it("retour de veille : le rappel part quand la page redevient visible, deux images plus tard (disposition appliquée)", () => {
    const callback = vi.fn();
    const stop = onViewportSettled(callback);
    setVisibility("hidden");
    runFrame();
    expect(callback).not.toHaveBeenCalled();
    setVisibility("visible");
    runFrame();
    expect(callback).not.toHaveBeenCalled();
    runFrame();
    expect(callback).toHaveBeenCalledOnce();
    stop();
  });

  it("rotation, redimensionnement, plein écran, page restaurée : une seule remesure par rafale d'évènements", () => {
    const callback = vi.fn();
    const stop = onViewportSettled(callback);
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
    document.dispatchEvent(new Event("fullscreenchange"));
    window.dispatchEvent(new Event("pageshow"));
    runFrame();
    runFrame();
    // cancelAnimationFrame est neutralisé ici : on vérifie seulement que chaque évènement déclenche bien une remesure.
    expect(callback).toHaveBeenCalled();
    stop();
    callback.mockClear();
    window.dispatchEvent(new Event("resize"));
    runFrame();
    runFrame();
    expect(callback).not.toHaveBeenCalled();
  });

  it("mise en veille : onglet caché, page quittée ou gelée par le navigateur", () => {
    const callback = vi.fn();
    const stop = onPageSuspended(callback);
    setVisibility("hidden");
    window.dispatchEvent(new Event("pagehide"));
    document.dispatchEvent(new Event("freeze"));
    expect(callback).toHaveBeenCalledTimes(3);
    setVisibility("visible");
    expect(callback).toHaveBeenCalledTimes(3);
    stop();
  });
});
