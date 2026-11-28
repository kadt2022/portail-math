import { describe, expect, it } from "vitest";

import type { FlightInput } from "../src/flight/flightModel";
import { Controls } from "../src/ui/controls";

const last = () => {
  const received: FlightInput[] = [];
  const controls = new Controls();
  controls.attach((input) => received.push(input));
  return { controls, last: () => received[received.length - 1] };
};

describe("commandes", () => {
  it("combine le clavier : gauche + droite s'annulent, haut et accélérer s'additionnent aux autres axes", () => {
    const { controls, last: get } = last();
    controls.setKey("left", true);
    expect(get()).toMatchObject({ x: -1, y: 0, throttle: 0 });
    controls.setKey("right", true);
    expect(get().x).toBe(0);
    controls.setKey("up", true);
    controls.setKey("accel", true);
    expect(get()).toMatchObject({ y: 1, throttle: 1 });
    controls.setKey("accel", false);
    controls.setKey("brake", true);
    expect(get().throttle).toBe(-1);
  });

  it("ajoute le joystick au clavier, sans dépasser 1", () => {
    const { controls, last: get } = last();
    controls.setStick(0.6, -0.4);
    expect(get()).toMatchObject({ x: 0.6, y: -0.4 });
    controls.setKey("right", true);
    expect(get().x).toBe(1);
  });

  it("relâche tout (perte de focus) et se débranche proprement", () => {
    const { controls, last: get } = last();
    controls.setKey("left", true);
    controls.setStick(1, 1);
    controls.releaseAll();
    expect(get()).toEqual({ x: 0, y: 0, throttle: 0 });
    controls.attach(null);
    expect(() => controls.setKey("up", true)).not.toThrow();
  });
});
