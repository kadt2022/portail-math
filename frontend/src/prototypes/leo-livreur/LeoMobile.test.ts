import { describe, expect, it, vi } from "vitest";

// La scène Phaser n'est pas démarrée ici : seule la fonction pure de densité est testée.
vi.mock("phaser", () => ({ default: { Scene: class {}, Scale: {}, AUTO: 0 } }));

import { cameraZoomFor } from "./leoBridgeLayout";
import { CITY_ZOOM_FACTOR } from "./leoCityLayout";
import { CITY_SPEED_LIMIT, MAX_SPEED } from "./leoDriving";
import { VEHICLE_LENGTH, WORLD_HEIGHT } from "./leoGeometry";
import { renderPixelRatio } from "./LeoLivreurGame";
import { LOOK_AHEAD_RATIO, MIN_LOOK_RATIO, requiredSightDistance, steadyFraming, visibleAhead } from "./leoSightline";

const game = Object.values(import.meta.glob("./LeoLivreurGame.ts", { query: "?raw", import: "default", eager: true }))[0] as string;
const cityViewWidth = (width: number, height: number) => width / (cameraZoomFor(width, height) * CITY_ZOOM_FACTOR);
const cityViewHeight = (width: number, height: number) => height / (cameraZoomFor(width, height) * CITY_ZOOM_FACTOR);

/** Formats de téléphone Android courants (zone de scène en pixels CSS) et ordinateurs. */
const SCREENS: Array<[number, number]> = [[360, 340], [390, 403], [412, 420], [844, 273], [568, 206], [1366, 535], [1910, 780]];

describe("caméra sur téléphone : Avancer et Freiner ne zooment plus", () => {
  it("garde exactement le même zoom à toutes les vitesses, sur tous les écrans", () => {
    for (const [width, height] of SCREENS) {
      const viewWidth = cityViewWidth(width, height);
      const viewHeight = cityViewHeight(width, height);
      const zoom = steadyFraming(0, viewWidth, viewHeight).zoomFactor;
      for (const speed of [0, 50, 150, 300, CITY_SPEED_LIMIT, MAX_SPEED]) {
        expect(steadyFraming(speed, viewWidth, viewHeight).zoomFactor).toBe(zoom);
      }
    }
  });

  it("ne recule jamais au-delà de la hauteur du monde : pas de vide, voitures lisibles en portrait", () => {
    for (const [width, height] of SCREENS) {
      const viewHeight = cityViewHeight(width, height);
      const framing = steadyFraming(CITY_SPEED_LIMIT, cityViewWidth(width, height), viewHeight);
      // Le recul d'anticipation n'ajoute jamais de vide : il s'arrête dès que le monde remplit la hauteur
      // (si le cadrage de base montre déjà plus que le monde, il ne recule plus du tout).
      expect(framing.zoomFactor).toBeGreaterThanOrEqual(Math.min(1, viewHeight / WORLD_HEIGHT) - 1e-9);
    }
    // Téléphone en portrait (scène 390 × 403) : aucun recul, les voitures gardent leur taille.
    expect(steadyFraming(CITY_SPEED_LIMIT, cityViewWidth(390, 403), cityViewHeight(390, 403)).zoomFactor).toBe(1);
  });

  it("voit le feu à temps jusqu'à la limite de la route dès que l'écran le permet ; seul Léo glisse dans le cadre", () => {
    for (const [width, height] of SCREENS) {
      const viewWidth = cityViewWidth(width, height);
      const viewHeight = cityViewHeight(width, height);
      const unconstrained = steadyFraming(CITY_SPEED_LIMIT, viewWidth).zoomFactor;
      for (const speed of [0, 100, 260, 390, CITY_SPEED_LIMIT]) {
        const framing = steadyFraming(speed, viewWidth, viewHeight);
        expect(framing.ratio).toBeGreaterThanOrEqual(MIN_LOOK_RATIO);
        expect(framing.ratio).toBeLessThanOrEqual(LOOK_AHEAD_RATIO);
        // Écran assez large (zoom non relevé par la hauteur) : le feu est visible avant la distance d'arrêt.
        if (framing.zoomFactor === unconstrained) {
          expect(visibleAhead(framing, viewWidth)).toBeGreaterThanOrEqual(requiredSightDistance(speed) + VEHICLE_LENGTH / 2 - 1e-6);
        }
      }
    }
    // Ordinateurs : la garantie tient toujours.
    for (const [width, height] of [[1366, 535], [1910, 780]] as const) {
      const framing = steadyFraming(CITY_SPEED_LIMIT, cityViewWidth(width, height), cityViewHeight(width, height));
      expect(visibleAhead(framing, cityViewWidth(width, height))).toBeGreaterThanOrEqual(requiredSightDistance(CITY_SPEED_LIMIT) + VEHICLE_LENGTH / 2 - 1e-6);
    }
  });

  it("utilise ce cadrage stable dans la scène (plus de zoom lié à la vitesse)", () => {
    expect(game).toContain("steadyFraming(Math.abs(this.motion.speed), viewWidth, viewHeight)");
    expect(game).not.toContain("lookAheadFraming(Math.abs(this.motion.speed)");
    expect(game).toContain("zoomFactor: target.zoomFactor");
  });
});

describe("netteté sur téléphone : rendu à la densité de l'écran", () => {
  it("rend à la densité de l'écran, plafonnée à 2, jamais sous 1", () => {
    expect(renderPixelRatio(1)).toBe(1);
    expect(renderPixelRatio(2)).toBe(2);
    expect(renderPixelRatio(2.625)).toBe(2);
    expect(renderPixelRatio(3.5)).toBe(2);
    expect(renderPixelRatio(0.75)).toBe(1);
    expect(renderPixelRatio(undefined)).toBe(1);
    expect(renderPixelRatio(Number.NaN)).toBe(1);
  });

  it("dimensionne le canvas en pixels réels et l'affiche à la taille CSS, avec le même cadrage", () => {
    expect(game).toContain("mode: Phaser.Scale.NONE");
    expect(game).toContain("zoom: 1 / pixelRatio");
    expect(game).toContain("cameraZoomFor(this.scale.width / this.pixelRatio, this.scale.height / this.pixelRatio) * this.pixelRatio");
  });
});

describe("chargement sur téléphone", () => {
  it("ne télécharge pas les illustrations du trafic perpendiculaire tant qu'il est à l'arrêt", () => {
    expect(game).toContain("const CROSS_TRAFFIC_ENABLED = false;");
    const preload = game.slice(game.indexOf("preload()"), game.indexOf("create()"));
    const gated = preload.slice(preload.indexOf("if (CROSS_TRAFFIC_ENABLED)"));
    for (const key of ["leo-cross-limousine", "leo-cross-bus", "leo-cross-suv", "leo-cross-sport", "leo-cross-sedan\""]) {
      expect(gated).toContain(key);
    }
  });
});
