import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useImmersiveDevice } from "./useImmersiveDevice";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const state = { matches };
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return state.matches;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    set(next: boolean) {
      state.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("appareil immersif (téléphone, tablette tactile)", () => {
  it("est faux sans matchMedia (rendu serveur, anciens navigateurs)", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useImmersiveDevice()).result.current).toBe(false);
  });

  it("suit l'écran : ordinateur, puis téléphone quand la fenêtre ou l'orientation change", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useImmersiveDevice());
    expect(result.current).toBe(false);
    act(() => media.set(true));
    expect(result.current).toBe(true);
  });
});
