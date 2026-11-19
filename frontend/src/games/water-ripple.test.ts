import { describe, expect, it } from "vitest";

import { EMIT_DISTANCE, EMIT_INTERVAL, shouldEmit } from "./water-ripple";

describe("émission des ondes de la bannière de Léo", () => {
  it("émet toujours la première onde", () => {
    expect(shouldEmit(null, 10, 10, 0)).toBe(true);
  });

  it("n'émet pas tant que le pointeur n'a pas assez bougé", () => {
    const last = { x: 100, y: 100, time: 0 };
    expect(shouldEmit(last, 100 + EMIT_DISTANCE - 1, 100, EMIT_INTERVAL * 5)).toBe(false);
  });

  it("n'émet pas trop vite, même si le pointeur va loin", () => {
    const last = { x: 100, y: 100, time: 1000 };
    expect(shouldEmit(last, 400, 100, 1000 + EMIT_INTERVAL - 1)).toBe(false);
  });

  it("émet quand le pointeur a bougé assez et que le délai est écoulé", () => {
    const last = { x: 100, y: 100, time: 1000 };
    expect(shouldEmit(last, 100 + EMIT_DISTANCE, 100, 1000 + EMIT_INTERVAL)).toBe(true);
  });
});
