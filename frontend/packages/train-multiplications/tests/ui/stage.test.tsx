import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrainEngineModule } from "../../src/adapters/engineLoader";
import { useTrainMultiplications } from "../../src/adapters/useTrainMultiplications";
import type { TrainEngineHandle, TrainSnapshot } from "../../src/engine/scene/trainEngine";

// Le tableau de bord et l'adaptateur, avec un faux moteur : les commandes arrivent bien au train, les caméras
// changent, et le moteur est entièrement libéré à la fermeture du jeu.

function fakeEngine() {
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
});
