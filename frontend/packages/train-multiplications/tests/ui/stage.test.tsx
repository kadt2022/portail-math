import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrainEngineModule } from "../../src/adapters/engineLoader";
import { useTrainMultiplications } from "../../src/adapters/useTrainMultiplications";
import type { TrainEngineHandle, TrainSnapshot } from "../../src/engine/scene/trainEngine";

// Le tableau de bord et l'adaptateur, avec un faux moteur : les commandes arrivent bien au train, les caméras
// changent, et le moteur est entièrement libéré à la fermeture du jeu.

function fakeEngine(overrides: Partial<TrainSnapshot> = {}) {
  let snapshot: TrainSnapshot = {
    speedKmh: 0,
    direction: 1,
    throttle: 0,
    brake: 0,
    emergency: false,
    camera: "behind",
    route: "main",
    nextStation: { id: "col", name: "Halte du col", distance: 1154 },
    atStation: null,
    underground: false,
    switchFree: true,
    structure: null,
    ...overrides,
  };
  const handle = {
    setInput: vi.fn(),
    reverse: vi.fn(() => true),
    emergencyStop: vi.fn(),
    whistle: vi.fn(),
    setCamera: vi.fn((mode) => (snapshot = { ...snapshot, camera: mode })),
    toggleSwitch: vi.fn(() => {
      snapshot = { ...snapshot, route: snapshot.route === "main" ? "branch" : "main" };
      return true;
    }),
    snapshot: () => snapshot,
    stats: () => ({ fps: 60, triangles: 1000, drawCalls: 10, activeMeshes: 5, particles: 0, buildMs: 1, head: 0, pixelRatio: 1, quality: "high" as const, logicMs: 0.3, renderMs: 2, renderer: "webgl2" as const, environment: "prefiltered" as const, clusteredLights: 0, gpuParticles: false }),
    audio: { enabled: true, setEnabled: vi.fn(), resume: vi.fn(), chuff: vi.fn(), whistle: vi.fn(), setBrake: vi.fn(), chime: vi.fn(), dispose: vi.fn() },
    setPaused: vi.fn(),
    restart: vi.fn(),
    decor: {} as TrainEngineHandle["decor"],
    dispose: vi.fn(),
  } satisfies TrainEngineHandle;
  const module = { createTrainEngine: vi.fn(async () => handle), TrainEngineUnsupportedError: Error } as unknown as TrainEngineModule;
  return { handle, module };
}

function Game({ load }: { load: () => Promise<TrainEngineModule> }) {
  const game = useTrainMultiplications({ locale: "fr", loadEngine: load });
  return (
    <div>
      <p data-testid="ready">{String(game.loading.ready)}</p>
      <p data-testid="speed">{String(game.player.stats[0].value)}</p>
      {game.stage}
    </div>
  );
}

describe("tableau de bord du train", () => {
  it("relie les commandes au train, change de caméra et d'aiguillage, puis libère le moteur", async () => {
    const { handle, module } = fakeEngine();
    const view = render(<Game load={() => Promise.resolve(module)} />);
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Accélérer" })).toBeInTheDocument());
    expect(screen.getByText("Halte du col")).toBeInTheDocument();

    const accelerate = screen.getByRole("button", { name: "Accélérer" });
    fireEvent.pointerDown(accelerate, { pointerId: 1 });
    expect(handle.setInput).toHaveBeenLastCalledWith({ throttle: true });
    fireEvent.pointerUp(accelerate, { pointerId: 1 });
    expect(handle.setInput).toHaveBeenLastCalledWith({ throttle: false });

    fireEvent.click(screen.getByRole("button", { name: "Cabine" }));
    expect(handle.setCamera).toHaveBeenCalledWith("cab");
    fireEvent.click(screen.getByRole("button", { name: "Siffler" }));
    expect(handle.whistle).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Aiguillage du village/ }));
    expect(handle.toggleSwitch).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: /Voie 2/ })).toBeInTheDocument());

    // Clavier : flèche haut tenue, puis relâchée ; 4 choisit la caméra de chargement.
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
    });
    expect(handle.setInput).toHaveBeenLastCalledWith({ throttle: true });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit4" }));
    });
    expect(handle.setCamera).toHaveBeenLastCalledWith("loading");

    view.unmount();
    expect(handle.dispose).toHaveBeenCalledTimes(1);
  });

  it("regroupe le côté droit dans l'ordre de la disposition cible : caméras avec leur libellé, aiguillage, puis tableau de bord", async () => {
    const { module } = fakeEngine();
    render(<Game load={() => Promise.resolve(module)} />);
    const cameras = await screen.findByRole("group", { name: "Caméras" });
    expect(cameras).toHaveTextContent("Caméra :");
    expect(within(cameras).getAllByRole("button").map((button) => button.textContent)).toEqual(["Derrière", "Cabine", "Latérale", "Chargement", "Panorama"]);
    const side = cameras.parentElement as HTMLElement;
    const switchBox = screen.getByRole("button", { name: /Aiguillage du village/ }).parentElement as HTMLElement;
    const dashboard = screen.getByRole("button", { name: "Accélérer" }).closest("[class*=dashboard]") as HTMLElement;
    expect(switchBox.parentElement).toBe(side);
    expect(dashboard.parentElement).toBe(side);
    const order = Array.from(side.children);
    expect(order.indexOf(cameras)).toBeLessThan(order.indexOf(switchBox));
    expect(order.indexOf(switchBox)).toBeLessThan(order.indexOf(dashboard));
    // Le tableau de bord garde ses cinq commandes, dans l'ordre : Accélérer, Freiner, Reculer, Arrêter le train, Siffler.
    expect(within(dashboard).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Accélérer", "Freiner", "Reculer", "Arrêter le train", "Siffler"]);
  });

  it("aiguillage franchi : une pastille avec sa coche, qui ne se manœuvre plus", async () => {
    const { handle, module } = fakeEngine({ switchFree: false });
    render(<Game load={() => Promise.resolve(module)} />);
    const locked = await screen.findByRole("button", { name: /Aiguillage du village/ });
    expect(locked).toBeDisabled();
    expect(locked).toHaveTextContent("Aiguillage franchi");
    expect(locked.querySelector("svg")).not.toBeNull();
    fireEvent.click(locked);
    expect(handle.toggleSwitch).not.toHaveBeenCalled();
  });
});
