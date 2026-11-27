import { describe, expect, it } from "vitest";

import { advancePipe, canEnter, createPipe, enterPipe, pipeContents } from "../src/engine/pipe";
import type { NumberTile } from "../src/engine/types";

const n = (id: number, value = id): NumberTile => ({ kind: "number", id, value });

describe("tuyau unique", () => {
  it("refuse une longueur invalide", () => {
    expect(() => createPipe(0)).toThrow();
    expect(() => createPipe(2.5)).toThrow();
  });

  it("transporte un nombre de l'entrée à la sortie en autant de pas que sa longueur", () => {
    let pipe = enterPipe(createPipe(4), n(1));
    const exits: Array<number | null> = [];
    for (let step = 0; step < 4; step += 1) {
      const advance = advancePipe(pipe);
      exits.push(advance.exiting?.id ?? null);
      pipe = advance.pipe;
    }
    expect(exits).toEqual([null, null, null, 1]);
    expect(pipeContents(pipe)).toEqual([]);
  });

  it("garde l'ordre d'entrée : premier entré, premier sorti", () => {
    let pipe = createPipe(3);
    const out: number[] = [];
    const queue = [n(1), n(2), n(3)];
    for (let step = 0; step < 10; step += 1) {
      const advance = advancePipe(pipe);
      pipe = advance.pipe;
      if (advance.exiting) out.push(advance.exiting.id);
      const next = queue[0];
      if (next && canEnter(pipe)) {
        pipe = enterPipe(pipe, next);
        queue.shift();
      }
    }
    expect(out).toEqual([1, 2, 3]);
  });

  it("ne transporte qu'un seul nombre à la fois : les autres attendent", () => {
    let pipe = enterPipe(createPipe(5), n(1));
    expect(canEnter(pipe)).toBe(false);
    expect(() => enterPipe(pipe, n(2))).toThrow();
    pipe = advancePipe(pipe).pipe;
    expect(canEnter(pipe)).toBe(false);
    expect(pipeContents(pipe)).toHaveLength(1);
  });

  it("accepte le suivant au pas même où le précédent sort, pas avant", () => {
    let pipe = enterPipe(createPipe(3), n(1));
    const steps: boolean[] = [];
    for (let step = 0; step < 3; step += 1) {
      const advance = advancePipe(pipe);
      pipe = advance.pipe;
      steps.push(canEnter(pipe));
    }
    expect(steps).toEqual([false, false, true]);
  });

  it("fonctionne avec un tuyau d'un seul emplacement", () => {
    let pipe = enterPipe(createPipe(1), n(7));
    expect(canEnter(pipe)).toBe(false);
    const advance = advancePipe(pipe);
    pipe = advance.pipe;
    expect(advance.exiting?.id).toBe(7);
    expect(canEnter(pipe)).toBe(true);
  });
});
