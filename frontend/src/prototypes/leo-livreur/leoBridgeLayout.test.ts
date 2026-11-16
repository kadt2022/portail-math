import { describe, expect, it } from "vitest";

import {
  BRIDGE_CAMERA_OFFSET,
  bridgeBlend,
  bridgeLayout,
  cameraZoomFor,
  DECK,
  MIN_CAMERA_ZOOM,
  RAIL,
  SUSPENSION,
  VIEW_WORLD_HEIGHT,
  VIEW_WORLD_WIDTH,
} from "./leoBridgeLayout";
import { MAIN_LANE_Y, ROAD_HALF_WIDTH, ROAD_WIDTH, ROAD_Y } from "./leoGeometry";

describe("pont en pseudo-3D", () => {
  const layout = bridgeLayout();

  it("cale l'asphalte du tablier exactement sur la chaussée physique, sans la déformer", () => {
    const top = layout.deckTop + (DECK.asphaltTop - DECK.firstRow) * layout.deckScale;
    const bottom = layout.deckTop + (DECK.asphaltBottom - DECK.firstRow) * layout.deckScale;
    expect(top).toBeCloseTo(ROAD_Y - ROAD_HALF_WIDTH, 6);
    expect(bottom - top).toBeCloseTo(ROAD_WIDTH, 6);
    expect(layout.deckTileWidth).toBeCloseTo(DECK.width * layout.deckScale, 6);
  });

  it("empile les calques de l'arrière vers l'avant : ciel, garde-corps arrière, route, garde-corps avant, arches", () => {
    expect(layout.topPartBottom).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH + 1);
    expect(layout.backRailBase).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH);
    expect(layout.frontRailBase).toBeGreaterThan(ROAD_Y + ROAD_HALF_WIDTH);
    expect(layout.bottomPartTop).toBeGreaterThanOrEqual(layout.frontRailBase);
    expect(layout.deckBottom).toBeGreaterThan(layout.frontRailBase);
  });

  it("garde le garde-corps avant hors des voies : il ne recouvre ni voiture ni roue", () => {
    const frontRailTop = layout.frontRailBase - (RAIL.baseRow - RAIL.wallTopRow) * layout.railScale;
    // Les pneus d'un véhicule touchent au plus le bord de la voie : le garde-corps commence après la chaussée.
    expect(frontRailTop).toBeGreaterThan(ROAD_Y + ROAD_HALF_WIDTH);
  });

  it("garde des proportions : un lampadaire ne dépasse pas la hauteur de trois voitures", () => {
    const lamp = (RAIL.baseRow - RAIL.lampTopRow) * layout.railScale;
    expect(lamp).toBeLessThan(3 * 96);
    expect(layout.suspensionWidth / (SUSPENSION.height * layout.suspensionScale)).toBeCloseTo(SUSPENSION.width / SUSPENSION.height, 6);
  });

  it("fait entrer et sortir la vue du pont en douceur, sans saut", () => {
    expect(bridgeBlend(0, 7200, 12000)).toBe(0);
    expect(bridgeBlend(9000, 7200, 12000)).toBe(1);
    let previous = 0;
    for (let x = 6400; x <= 7900; x += 10) {
      const blend = bridgeBlend(x, 7200, 12000);
      expect(blend).toBeGreaterThanOrEqual(previous);
      expect(blend - previous).toBeLessThan(0.02);
      previous = blend;
    }
  });
});

describe("zoom de la caméra", () => {
  it("montre toute la scène (maisons, route, pont, rivière) dans un cadre de bureau", () => {
    for (const [width, height] of [[1150, 620], [1150, 720], [1400, 720], [1000, 560]]) {
      const zoom = cameraZoomFor(width, height);
      expect(width / zoom).toBeGreaterThanOrEqual(VIEW_WORLD_WIDTH - 1);
      expect(height / zoom).toBeGreaterThanOrEqual(VIEW_WORLD_HEIGHT - 1);
      expect(zoom).toBeLessThanOrEqual(1);
    }
  });

  it("n'agrandit jamais l'image et ne descend pas sous l'échelle minimale sur téléphone", () => {
    expect(cameraZoomFor(3000, 2000)).toBe(1);
    expect(cameraZoomFor(320, 300)).toBe(MIN_CAMERA_ZOOM);
  });

  it("la scène du pont tient dans la vue avec le décalage de caméra", () => {
    const layout = bridgeLayout();
    const centerY = MAIN_LANE_Y - BRIDGE_CAMERA_OFFSET;
    const viewTop = centerY - VIEW_WORLD_HEIGHT / 2;
    const viewBottom = centerY + VIEW_WORLD_HEIGHT / 2;
    const towersTop = layout.topPartBottom - SUSPENSION.topEnd * SUSPENSION.height * layout.suspensionScale;
    const waterBottom = layout.bottomPartTop + (1 - SUSPENSION.bottomStart) * SUSPENSION.height * layout.suspensionScale;
    expect(viewTop).toBeLessThanOrEqual(towersTop + 40);
    expect(viewBottom).toBeGreaterThanOrEqual(waterBottom - 40);
  });
});
