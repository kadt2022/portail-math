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
import turquoiseHouse from "./assets/leo-house-turquoise.webp?inline";
import yellowHouse from "./assets/leo-house-yellow-v1-compact.webp?inline";

import {
  FAR_SIDE_HOUSE_BASE_Y,
  FAR_SIDE_HOUSE_MAX_HEIGHT,
  FAR_SIDE_HOUSE_WIDTH,
  GROUND_MARGIN,
  HOUSE_ROW_Y,
  MAIN_LANE_Y,
  ROAD_HALF_WIDTH,
  ROAD_WIDTH,
  ROAD_Y,
  SCENE_BOTTOM,
  STREET_VIEW_HEIGHT,
  STREET_VIEW_TOP,
  WORLD_HEIGHT,
} from "./leoGeometry";

/** Dimensions d'une image WebP (en-têtes VP8, VP8L ou VP8X), lues dans les octets du fichier lui-même. */
function webpSize(dataUri: string) {
  const binary = atob(dataUri.slice(dataUri.indexOf(",") + 1));
  const byte = (index: number) => binary.charCodeAt(index);
  const uint = (index: number, length: number) => Array.from({ length }, (_, k) => byte(index + k) * 256 ** k).reduce((a, b) => a + b, 0);
  const chunk = binary.slice(12, 16);
  if (chunk === "VP8X") return { width: 1 + uint(24, 3), height: 1 + uint(27, 3) };
  if (chunk === "VP8L") {
    const bits = uint(21, 4);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { width: uint(26, 2) & 0x3fff, height: uint(28, 2) & 0x3fff };
}

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
    // Cadre de téléphone assez haut pour toute la rue (720 unités) à l'échelle minimale.
    expect(cameraZoomFor(320, 320)).toBe(MIN_CAMERA_ZOOM);
  });

  it("la bande de rue va du toit de la plus haute maison nord au bas du monde, et tient dans la vue de bureau", () => {
    // Façades nord réellement chargées (voir FAR_SIDE_HOUSE_KEYS) : aucune n'est plus haute que la constante.
    for (const image of [turquoiseHouse, yellowHouse]) {
      const { width, height } = webpSize(image);
      expect((FAR_SIDE_HOUSE_WIDTH * height) / width).toBeLessThanOrEqual(FAR_SIDE_HOUSE_MAX_HEIGHT);
    }
    expect(STREET_VIEW_TOP).toBe(FAR_SIDE_HOUSE_BASE_Y - FAR_SIDE_HOUSE_MAX_HEIGHT);
    // La bande descend jusqu'au sol sous le décor : la base des maisons sud n'est jamais au bord de l'écran.
    expect(STREET_VIEW_TOP + STREET_VIEW_HEIGHT).toBe(SCENE_BOTTOM);
    expect(SCENE_BOTTOM).toBe(WORLD_HEIGHT + GROUND_MARGIN);
    expect(GROUND_MARGIN).toBeGreaterThan(0);
    // Maisons sud et route comprises ; la bande ne dépasse pas la vue de bureau (aucun changement sur ordinateur).
    expect(STREET_VIEW_TOP).toBeLessThan(ROAD_Y - ROAD_HALF_WIDTH);
    expect(HOUSE_ROW_Y).toBeLessThan(WORLD_HEIGHT);
    expect(STREET_VIEW_HEIGHT).toBeLessThanOrEqual(VIEW_WORLD_HEIGHT);
  });

  it("cadre bas (téléphone, lecteur dans la page) : la caméra recule juste assez pour montrer toute la rue", () => {
    // Scènes mesurées sur téléphone : couché dans la page, couché en plein écran, colonnes latérales.
    for (const [width, height] of [[765, 165], [812, 268], [600, 231], [207, 174]]) {
      const zoom = cameraZoomFor(width, height);
      expect(height / zoom).toBeGreaterThanOrEqual(STREET_VIEW_HEIGHT - 0.5);
      // Jamais plus de recul que nécessaire : la rue remplit exactement la hauteur quand l'échelle minimale ne suffit pas.
      if (height / MIN_CAMERA_ZOOM < STREET_VIEW_HEIGHT) expect(height / zoom).toBeCloseTo(STREET_VIEW_HEIGHT, 5);
    }
  });

  it("cadre de bureau ou assez haut : échelle inchangée par la bande de rue", () => {
    for (const [width, height] of [[1150, 620], [1025, 449], [1366, 618], [320, 320]]) {
      const fit = Math.min(width / VIEW_WORLD_WIDTH, height / VIEW_WORLD_HEIGHT);
      expect(cameraZoomFor(width, height)).toBe(Math.max(MIN_CAMERA_ZOOM, Math.min(1, fit)));
    }
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
