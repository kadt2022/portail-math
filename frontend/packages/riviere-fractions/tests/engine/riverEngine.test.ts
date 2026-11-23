import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRiverEngine, RiverEngineUnsupportedError } from "../../src/engine/scene/riverEngine";

// Le moteur est testé sans navigateur ni portail : un moteur Babylon sans rendu remplace WebGL.

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function host(): HTMLElement {
  const element = document.createElement("div");
  document.body.appendChild(element);
  hosts.push(element);
  return element;
}

describe("Scène 3D de la rivière", () => {
  it("se construit, affiche des panneaux, et libère tout à la fermeture", async () => {
    const element = host();
    const progress: number[] = [];
    let created: NullEngine | null = null;
    const engine = await createRiverEngine({
      host: element,
      onLaneCrossed: vi.fn(),
      onBuildProgress: (fraction) => progress.push(fraction),
      readyTimeoutMs: 50,
      createEngine: () => {
        created = new NullEngine();
        return created;
      },
    });
    expect(element.querySelector("canvas")).not.toBeNull();
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((value, index) => index === 0 || value >= progress[index - 1])).toBe(true);

    const label = { kind: "text", text: "3" } as const;
    engine.setSigns(Array.from({ length: 7 }, () => [label, label, label] as const));
    engine.showVerdict(0, 2, false);
    engine.showVerdict(1, 0, true);
    engine.castOff();
    engine.setSteer(5);
    engine.celebrate();
    engine.resetCrossing();

    const stats = engine.getStats();
    expect(stats.buildMs).toBeGreaterThanOrEqual(0);
    expect(stats.boatS).toBeGreaterThan(0);

    const stop = vi.spyOn(created!, "stopRenderLoop");
    engine.setPaused(true);
    expect(stop).toHaveBeenCalled();
    const run = vi.spyOn(created!, "runRenderLoop");
    engine.setPaused(false);
    expect(run).toHaveBeenCalled();

    const dispose = vi.spyOn(created!, "dispose");
    engine.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(element.querySelector("canvas")).toBeNull();
    // Une seconde fermeture ne fait rien.
    engine.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("signale clairement un appareil sans WebGL, sans laisser de canevas", async () => {
    const element = host();
    await expect(
      createRiverEngine({
        host: element,
        onLaneCrossed: vi.fn(),
        createEngine: () => {
          throw new Error("WebGL not supported");
        },
      }),
    ).rejects.toBeInstanceOf(RiverEngineUnsupportedError);
    expect(element.querySelector("canvas")).toBeNull();
  });
});
