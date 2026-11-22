import { describe, expect, it } from "vitest";

import { cameraZoomFor } from "./leoBridgeLayout";
import { drivingLayout, MIN_CONTROL_SIZE, MIN_STREET_SCENE_HEIGHT, playerDrivingLayout } from "./leoDrivingLayout";
import { STREET_VIEW_HEIGHT } from "./leoGeometry";

// Marges du panneau et espace entre ses boutons (voir leoDrivingLayout et le CSS du panneau).
const PADDING = 8;
const GAP = 8;

describe("panneau de conduite dans le lecteur des jeux", () => {
  it.each([
    // Scènes mesurées dans le lecteur : sans les colonnes, il ne restait que 82, 60 et 165 px de route.
    ["téléphone tenu droit, scène paysage dans la page", 343, 220],
    ["téléphone tenu droit, scène paysage en plein écran", 375, 211],
    ["téléphone couché, dans la page", 765, 227],
    ["téléphone couché, plein écran", 812, 330],
  ] as const)("%s (%i × %i) : colonnes latérales, boutons tactiles, toute la rue visible", (_name, width, height) => {
    const layout = playerDrivingLayout({ width, height, coarsePointer: true });
    expect(layout.format).toBe("landscape-rails");
    // Trois boutons empilés par colonne, de taille tactile, sans dépasser la hauteur de la scène.
    expect(layout.controlSize).toBeGreaterThanOrEqual(MIN_CONTROL_SIZE);
    expect(3 * layout.controlSize + 2 * GAP + 2 * PADDING).toBeLessThanOrEqual(height);
    // Scène restante (colonnes de part et d'autre, une ligne de consigne dessous) : la caméra y montre toute la rue.
    const sceneWidth = width - 2 * (layout.controlSize + 12);
    const sceneHeight = height - MIN_CONTROL_SIZE;
    expect(sceneHeight / cameraZoomFor(sceneWidth, sceneHeight)).toBeGreaterThanOrEqual(STREET_VIEW_HEIGHT - 0.5);
  });

  it.each([
    ["ordinateur, dans la page", 1025, 449],
    ["ordinateur, plein écran", 1366, 700],
    ["tablette en paysage", 1024, 600],
  ] as const)("%s (%i × %i) : panneau sous la scène, exactement comme avant", (_name, width, height) => {
    const layout = playerDrivingLayout({ width, height, coarsePointer: false });
    expect(layout).toEqual(drivingLayout({ width, height, coarsePointer: false }));
    // La scène au-dessus du panneau garde la rue entière à l'échelle minimale.
    expect(height - (layout.controlSize + 2 * PADDING)).toBeGreaterThanOrEqual(MIN_STREET_SCENE_HEIGHT);
  });

  it("scène portrait (lecteur en portrait sur téléphone) : panneau portrait du jeu, inchangé", () => {
    for (const [width, height] of [[343, 457], [375, 600]]) {
      expect(playerDrivingLayout({ width, height, coarsePointer: true })).toEqual(drivingLayout({ width, height, coarsePointer: true }));
    }
  });

  it("scène paysage étroite mais assez haute : panneau sur deux lignes sous la scène, comme avant", () => {
    const layout = playerDrivingLayout({ width: 600, height: 520, coarsePointer: true });
    expect(layout.format).toBe("portrait");
  });
});
