import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RiverEngineModule } from "../../src/adapters/engineLoader";
import type { RiverFractionsSettings } from "../../src/adapters/playerContract";
import { useRiverFractions } from "../../src/adapters/useRiverFractions";
import { expectedValue, type Expression } from "../../src/domain/challenge";
import { Fraction } from "../../src/domain/fraction";

// Le jeu dans un hôte minimal : un faux moteur 3D remplace Babylon.js, un faux lecteur affiche ce que le jeu lui donne.

function fakeEngineModule() {
  const handle = {
    setSigns: vi.fn(),
    showVerdict: vi.fn(),
    resetCrossing: vi.fn(),
    celebrate: vi.fn(),
    castOff: vi.fn(),
    setSteer: vi.fn(),
    setPaused: vi.fn(),
    resize: vi.fn(),
    getStats: vi.fn(() => ({ fps: 60, activeMeshes: 40, triangles: 90_000, buildMs: 400, boatS: 10, boatD: 0 })),
    dispose: vi.fn(),
  };
  let crossed: ((fork: number, lane: 0 | 1 | 2) => void) | null = null;
  const createRiverEngine = vi.fn(async (options: { onLaneCrossed: (fork: number, lane: 0 | 1 | 2) => void; onBuildProgress?: (f: number) => void }) => {
    crossed = options.onLaneCrossed;
    options.onBuildProgress?.(1);
    return handle;
  });
  const module = { createRiverEngine, RiverEngineUnsupportedError: class extends Error {} } as unknown as RiverEngineModule;
  return { module, handle, cross: (fork: number, lane: 0 | 1 | 2) => act(() => crossed?.(fork, lane)), createRiverEngine };
}

function Host(props: Partial<RiverFractionsSettings> & { loadEngine: () => Promise<RiverEngineModule> }) {
  const game = useRiverFractions({ locale: "fr", seed: 12, ...props });
  return (
    <div>
      <h1>{game.player.title}</h1>
      <p data-testid="stats">{game.player.stats.map((stat) => `${stat.label}:${stat.value}`).join(" ")}</p>
      <p data-testid="loading">{game.loading.ready ? "prêt" : game.loading.failed ? (game.loading.unsupported ? "sans-webgl" : "échec") : "chargement"}</p>
      <p data-testid="engine">{String(game.loading.engineLoaded)}</p>
      <p data-testid="build">{game.loading.buildProgress.toFixed(2)}</p>
      <button onClick={game.player.paused ? game.player.onPlay : game.player.onPause}>{game.player.paused ? "Jouer" : "Pause"}</button>
      <button onClick={game.player.onRestart}>{game.player.restartLabel}</button>
      <button onClick={game.player.onHint} disabled={game.player.hintDisabled}>Indice</button>
      <button onClick={game.loading.retry}>Réessayer</button>
      {game.stage}
    </div>
  );
}

function laneOfAnswer(): 0 | 1 | 2 {
  const card = screen.getByRole("region", { name: "Question" });
  const expression = card.dataset.expression ? (JSON.parse(card.dataset.expression) as Expression) : null;
  if (!expression) throw new Error("expression absente");
  const expected = expectedValue(expression);
  const answers = [...card.querySelectorAll("li[data-answer]")].map((item) => item.getAttribute("data-answer") ?? "");
  return answers.findIndex((text) => {
    const [numerator, denominator] = text.split("/").map(Number);
    return Fraction.of(numerator, denominator ?? 1).equals(expected);
  }) as 0 | 1 | 2;
}

describe("Le jeu dans un hôte React", () => {
  it("charge le moteur, attend au ponton, puis pose la première question", async () => {
    const fake = fakeEngineModule();
    render(<Host loadEngine={() => Promise.resolve(fake.module)} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("La Rivière des Fractions");
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    expect(fake.handle.setSigns).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "Question" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Larguer les amarres" }));
    expect(fake.handle.castOff).toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Question" })).toHaveTextContent("Défi 1 sur 7");
    expect(screen.getByTestId("stats")).toHaveTextContent("Défi:1/7 Essai:1");
  });

  it("une bonne voie fait avancer ; une mauvaise montre l'explication et fait recommencer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fake = fakeEngineModule();
    render(<Host loadEngine={() => Promise.resolve(fake.module)} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    fireEvent.click(screen.getByRole("button", { name: "Larguer les amarres" }));
    const lane = laneOfAnswer();
    fake.cross(0, lane);
    expect(fake.handle.showVerdict).toHaveBeenLastCalledWith(0, lane, true);
    expect(screen.getByRole("status")).toHaveTextContent("Bonne voie !");
    expect(screen.getByTestId("stats")).toHaveTextContent("Défi:2/7");

    const next = laneOfAnswer();
    fake.cross(1, ((next + 1) % 3) as 0 | 1 | 2);
    expect(fake.handle.showVerdict).toHaveBeenLastCalledWith(1, (next + 1) % 3, false);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const panel = screen.getByRole("alertdialog", { name: "Ce n'était pas la bonne voie" });
    expect(panel).toHaveTextContent("La bonne réponse était");
    fireEvent.click(screen.getByRole("button", { name: "Recommencer la traversée" }));
    expect(fake.handle.resetCrossing).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("stats")).toHaveTextContent("Défi:1/7 Essai:2");
    vi.useRealTimers();
  });

  it("dirige le bateau au clavier et avec les boutons ◀ ▶, et relâche tout en pause", async () => {
    const fake = fakeEngineModule();
    render(<Host loadEngine={() => Promise.resolve(fake.module)} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    fireEvent.click(screen.getByRole("button", { name: "Larguer les amarres" }));
    fireEvent.keyDown(window, { code: "ArrowLeft" });
    expect(fake.handle.setSteer).toHaveBeenLastCalledWith(-1);
    fireEvent.keyUp(window, { code: "ArrowLeft" });
    expect(fake.handle.setSteer).toHaveBeenLastCalledWith(0);
    const right = screen.getByRole("button", { name: "Vers la droite" });
    fireEvent.pointerDown(right, { pointerId: 1 });
    expect(fake.handle.setSteer).toHaveBeenLastCalledWith(1);
    fireEvent.pointerUp(right, { pointerId: 1 });
    expect(fake.handle.setSteer).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(window, { code: "KeyD" });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(fake.handle.setPaused).toHaveBeenLastCalledWith(true);
    expect(fake.handle.setSteer).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole("button", { name: "Jouer" }));
    expect(fake.handle.setPaused).toHaveBeenLastCalledWith(false);
  });

  it("se met en pause quand il n'est plus visible, et libère le moteur en partant", async () => {
    const fake = fakeEngineModule();
    const { rerender, unmount } = render(<Host loadEngine={() => Promise.resolve(fake.module)} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    rerender(<Host loadEngine={() => Promise.resolve(fake.module)} active={false} />);
    expect(fake.handle.setPaused).toHaveBeenLastCalledWith(true);
    unmount();
    expect(fake.handle.dispose).toHaveBeenCalledTimes(1);
  });

  it("annonce le moteur téléchargé, puis l'avancement réel de la construction de la scène, jamais en recul", async () => {
    const fake = fakeEngineModule();
    let build: (fraction: number) => void = () => {};
    let finish: () => void = () => {};
    const created = new Promise<typeof fake.handle>((resolve) => {
      finish = () => resolve(fake.handle);
    });
    const module = {
      createRiverEngine: vi.fn(async (options: { onBuildProgress?: (f: number) => void }) => {
        build = options.onBuildProgress ?? build;
        return created;
      }),
      RiverEngineUnsupportedError: class extends Error {},
    } as unknown as RiverEngineModule;
    render(<Host loadEngine={() => Promise.resolve(module)} />);
    expect(screen.getByTestId("engine")).toHaveTextContent("false");
    expect(screen.getByTestId("build")).toHaveTextContent("0.00");
    await waitFor(() => expect(screen.getByTestId("engine")).toHaveTextContent("true"));
    expect(screen.getByTestId("build")).toHaveTextContent("0.00");
    act(() => build(0.4));
    expect(screen.getByTestId("build")).toHaveTextContent("0.40");
    act(() => build(0.1));
    expect(screen.getByTestId("build")).toHaveTextContent("0.40");
    expect(screen.getByTestId("loading")).toHaveTextContent("chargement");
    await act(async () => finish());
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    expect(screen.getByTestId("build")).toHaveTextContent("1.00");
  });

  it("propose de réessayer quand le moteur n'a pas pu être téléchargé", async () => {
    const fake = fakeEngineModule();
    const load = vi.fn().mockRejectedValueOnce(new Error("réseau")).mockResolvedValue(fake.module);
    render(<Host loadEngine={load} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("échec"));
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("explique quand WebGL manque, sans proposer de réessayer pour rien", async () => {
    const error = Object.assign(new Error("WebGL"), { name: "RiverEngineUnsupportedError" });
    render(<Host loadEngine={() => Promise.reject(error)} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("sans-webgl"));
    expect(screen.getByRole("alert")).toHaveTextContent("WebGL");
  });

  it("donne un indice adapté au défi en cours", async () => {
    const fake = fakeEngineModule();
    render(<Host loadEngine={() => Promise.resolve(fake.module)} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    expect(screen.getByRole("button", { name: "Indice" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Larguer les amarres" }));
    fireEvent.click(screen.getByRole("button", { name: "Indice" }));
    expect(screen.getByText(/multiplié par le diviseur/)).toBeInTheDocument();
  });

  it("parle anglais quand l'hôte le demande, et remonte les événements de la partie", async () => {
    const fake = fakeEngineModule();
    const onEvent = vi.fn();
    render(<Host loadEngine={() => Promise.resolve(fake.module)} locale="en" onEvent={onEvent} />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("prêt"));
    fireEvent.click(screen.getByRole("button", { name: "Cast off" }));
    expect(screen.getByRole("region", { name: "Question" })).toHaveTextContent("Challenge 1 of 7");
    expect(onEvent).toHaveBeenCalledWith({ type: "attempt-started", attempt: 1 });
  });
});
