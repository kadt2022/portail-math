import { describe, expect, it } from "vitest";

import { boulevardLayout } from "./leoBoulevardLayout";
import { ROAD_HALF_WIDTH, ROAD_Y } from "./leoGeometry";
import {
  boulevardDepthPedestrians,
  boulevardPedestrians,
  boulevardSeatedPedestrians,
  pedestrianExitAlpha,
  PEDESTRIAN_FRAME,
  PEDESTRIAN_FRAMES,
} from "./leoPedestrians";

describe("passants du boulevard", () => {
  it("utilisent quatre cadres cohérents et une boucle de marche sans rebond", () => {
    expect(PEDESTRIAN_FRAME).toEqual({ width: 543, height: 724 });
    expect(PEDESTRIAN_FRAMES).toEqual([0, 1, 2, 1]);
  });

  it("marche en sens unique sur les trottoirs, puis sort définitivement de scène", () => {
    const boulevard = boulevardLayout();
    const pedestrians = boulevardPedestrians();

    expect(pedestrians).toHaveLength(3);
    for (const pedestrian of pedestrians) {
      expect(pedestrian.x).toBeGreaterThanOrEqual(boulevard.panelX);
      expect(pedestrian.x).toBeLessThanOrEqual(boulevard.panelEnd);
      expect(Math.abs(pedestrian.exitX - pedestrian.x)).toBeGreaterThan(100);
      expect(Math.abs(pedestrian.speed)).toBeGreaterThan(0);
      expect(
        pedestrian.groundY < ROAD_Y - ROAD_HALF_WIDTH
        || pedestrian.groundY > ROAD_Y + ROAD_HALF_WIDTH,
      ).toBe(true);
    }
  });

  it("disparaît progressivement à sa sortie, sans réapparition ni demi-tour", () => {
    for (const pedestrian of boulevardPedestrians()) {
      expect(pedestrianExitAlpha(pedestrian.exitX, pedestrian)).toBe(0);
      const inside = pedestrian.exitX > pedestrian.x ? pedestrian.exitX - 115 : pedestrian.exitX + 115;
      expect(pedestrianExitAlpha(inside, pedestrian)).toBe(1);
    }
  });

  it("anime des passants dans les rues perpendiculaires avec une perspective de profondeur", () => {
    const depth = boulevardDepthPedestrians();
    expect(depth).toHaveLength(4);
    expect(depth.map((pedestrian) => Math.sign(pedestrian.speed))).toEqual([1, -1, 1, -1]);
    for (const pedestrian of depth) {
      expect(Math.abs(pedestrian.exitY - pedestrian.y)).toBeGreaterThan(100);
      expect(Math.abs(pedestrian.waitY - pedestrian.y)).toBeGreaterThan(20);
      expect(pedestrian.startScale).not.toBe(pedestrian.endScale);
    }
  });

  it("place deux personnes sur le banc de la promenade", () => {
    const seated = boulevardSeatedPedestrians();
    expect(seated).toHaveLength(2);
    expect(new Set(seated.map((pedestrian) => pedestrian.textureKey)).size).toBe(2);
    expect(seated[0].x).not.toBe(seated[1].x);
  });
});
