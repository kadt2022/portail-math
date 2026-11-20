import type Phaser from "phaser";

import { FRUIT_RADIUS, type FruitColor } from "./turbo-pulse-engine";

// Dessin vectoriel (canvas 2D) du canon, du tir et des fruits de Turbo Pulse.
// Chaque élément est « cuit » une seule fois en texture Phaser, puis réutilisé :
// aucun dessin par image, donc aucun coût en cours de partie, et un rendu net
// (dégradés, reflets, halos) que les anciens aplats et emojis ne permettaient pas.
//
// Les textures sont dessinées en unités « monde de référence » (960×540) puis
// cuites à ART_SCALE fois cette taille : elles ne sont jamais réduites de plus de
// moitié à l'écran, ce qui évite l'aspect crénelé d'une grosse image réduite d'un coup.

/** Surdéfinition des textures cuites ; l'affichage les remet à l'échelle 1/ART_SCALE. */
export const ART_SCALE = 2;

// Le canon : une base fixe (plateforme et piédestal) et un bras qui pivote avec la visée.
// Les pivots sont exprimés en unités de dessin : base et bras partagent le même point
// à l'écran (le centre du corps hexagonal).
export const CANNON_BASE = { width: 220, height: 170, pivotX: 110, pivotY: 70 } as const;
export const CANNON_ARM = { width: 230, height: 120, pivotX: 72, pivotY: 60 } as const;
/** Distance du pivot à la bouche du canon (échelle 1) : point de départ du tir et de la visée. */
export const CANNON_MUZZLE_DISTANCE = 122;
export const CANNON_PLATE = { width: 156, height: 46 } as const;

/** Marge de halo autour du rond du fruit (échelle 1). */
const FRUIT_HALO_MARGIN = 9;
export const FRUIT_BADGE_SIZE = 2 * (FRUIT_RADIUS + FRUIT_HALO_MARGIN);

export const CANNON_BASE_KEY = "turbo-cannon-base";
export const CANNON_ARM_KEY = "turbo-cannon-arm";
export const CANNON_PLATE_KEY = "turbo-cannon-plate";
export const ENERGY_GLOW_KEY = "turbo-energy-glow";
export const ENERGY_CORE_KEY = "turbo-energy-core";
export const ENERGY_GLOW_SIZE = 96;
export const ENERGY_CORE_SIZE = 40;

type Ctx = CanvasRenderingContext2D;

// --- Couleurs -----------------------------------------------------------------

function channels(color: number): [number, number, number] {
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255];
}

function rgba(color: number, alpha = 1): string {
  const [r, g, b] = channels(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(from: number, to: number, amount: number): number {
  const [r1, g1, b1] = channels(from);
  const [r2, g2, b2] = channels(to);
  const blend = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return (blend(r1, r2) << 16) | (blend(g1, g2) << 8) | blend(b1, b2);
}

const lighten = (color: number, amount: number) => mix(color, 0xffffff, amount);
const darken = (color: number, amount: number) => mix(color, 0x000000, amount);

// --- Cuisson d'une texture -------------------------------------------------------

function bake(scene: Phaser.Scene, key: string, width: number, height: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, Math.ceil(width * ART_SCALE), Math.ceil(height * ART_SCALE));
  const ctx = texture?.getContext();
  if (!texture || !ctx) return;
  ctx.scale(ART_SCALE, ART_SCALE);
  draw(ctx);
  texture.refresh();
}

function roundRectPath(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function goldGradient(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, "#fff0b0");
  gradient.addColorStop(0.45, "#ffc83d");
  gradient.addColorStop(1, "#b9740f");
  return gradient;
}

// --- Canon ---------------------------------------------------------------------

function drawCannonBase(ctx: Ctx): void {
  // Lueur d'énergie posée au sol.
  const glow = ctx.createRadialGradient(110, 132, 6, 110, 132, 108);
  glow.addColorStop(0, "rgba(111, 226, 255, 0.55)");
  glow.addColorStop(1, "rgba(111, 226, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(110, 134, 108, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Plateforme.
  const plate = ctx.createLinearGradient(0, 106, 0, 154);
  plate.addColorStop(0, "#7d9bc4");
  plate.addColorStop(0.5, "#33497a");
  plate.addColorStop(1, "#0f1c3b");
  ctx.beginPath();
  ctx.ellipse(110, 130, 92, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = goldGradient(ctx, 106, 154);
  ctx.stroke();

  // Anneau lumineux.
  ctx.save();
  ctx.shadowColor = "rgba(111, 226, 255, 0.95)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(110, 129, 72, 17, 0, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(143, 236, 255, 0.95)";
  ctx.stroke();
  ctx.restore();

  // Piédestal.
  const stand = ctx.createLinearGradient(58, 0, 162, 0);
  stand.addColorStop(0, "#14275a");
  stand.addColorStop(0.5, "#4274d8");
  stand.addColorStop(1, "#14275a");
  ctx.beginPath();
  ctx.moveTo(60, 126);
  ctx.lineTo(82, 82);
  ctx.lineTo(138, 82);
  ctx.lineTo(160, 126);
  ctx.quadraticCurveTo(110, 148, 60, 126);
  ctx.closePath();
  ctx.fillStyle = stand;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = goldGradient(ctx, 82, 140);
  ctx.stroke();
}

function hexagonPath(ctx: Ctx, cx: number, cy: number, radius: number): void {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawCannonArm(ctx: Ctx): void {
  const { pivotX: px, pivotY: py } = CANNON_ARM;

  // Culasse, derrière le corps.
  const tail = ctx.createLinearGradient(0, py - 17, 0, py + 17);
  tail.addColorStop(0, "#3b5aa8");
  tail.addColorStop(1, "#0e1836");
  roundRectPath(ctx, 24, py - 17, 56, 34, 9);
  ctx.fillStyle = tail;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#e2a93a";
  ctx.stroke();

  // Tube.
  const tube = ctx.createLinearGradient(0, py - 22, 0, py + 22);
  tube.addColorStop(0, "#d4f1ff");
  tube.addColorStop(0.25, "#5aa4ff");
  tube.addColorStop(0.62, "#2a4fb5");
  tube.addColorStop(1, "#0f2260");
  ctx.beginPath();
  ctx.moveTo(px, py - 22);
  ctx.lineTo(178, py - 17);
  ctx.lineTo(178, py + 17);
  ctx.lineTo(px, py + 22);
  ctx.closePath();
  ctx.fillStyle = tube;
  ctx.fill();

  // Rainures d'énergie le long du tube.
  ctx.save();
  ctx.shadowColor = "rgba(111, 226, 255, 0.9)";
  ctx.shadowBlur = 5;
  ctx.strokeStyle = "rgba(160, 240, 255, 0.85)";
  ctx.lineWidth = 2;
  for (const offset of [-8, 8]) {
    ctx.beginPath();
    ctx.moveTo(96, py + offset);
    ctx.lineTo(170, py + offset * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // Anneaux dorés.
  for (const x of [102, 140]) {
    roundRectPath(ctx, x, py - 26, 9, 52, 3);
    ctx.fillStyle = goldGradient(ctx, py - 26, py + 26);
    ctx.fill();
  }

  // Bouche évasée et lueur de sortie.
  roundRectPath(ctx, 172, py - 27, 22, 54, 8);
  ctx.fillStyle = goldGradient(ctx, py - 27, py + 27);
  ctx.fill();
  ctx.fillStyle = "#06122e";
  ctx.beginPath();
  ctx.ellipse(190, py, 5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  const flare = ctx.createRadialGradient(194, py, 1, 194, py, 24);
  flare.addColorStop(0, "rgba(220, 250, 255, 0.95)");
  flare.addColorStop(0.4, "rgba(111, 226, 255, 0.5)");
  flare.addColorStop(1, "rgba(111, 226, 255, 0)");
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(194, py, 24, 0, Math.PI * 2);
  ctx.fill();

  // Corps hexagonal.
  const body = ctx.createRadialGradient(px - 12, py - 14, 4, px, py, 46);
  body.addColorStop(0, "#7ea4ff");
  body.addColorStop(0.5, "#2c52c4");
  body.addColorStop(1, "#101f66");
  hexagonPath(ctx, px, py, 40);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = goldGradient(ctx, py - 40, py + 40);
  ctx.stroke();
  hexagonPath(ctx, px, py, 29);
  ctx.fillStyle = "rgba(4, 16, 58, 0.55)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(143, 236, 255, 0.85)";
  ctx.stroke();

  // Éclair.
  ctx.beginPath();
  ctx.moveTo(px + 5, py - 22);
  ctx.lineTo(px - 13, py + 3);
  ctx.lineTo(px - 1, py + 3);
  ctx.lineTo(px - 7, py + 23);
  ctx.lineTo(px + 14, py - 6);
  ctx.lineTo(px + 2, py - 6);
  ctx.closePath();
  const bolt = ctx.createLinearGradient(0, py - 22, 0, py + 23);
  bolt.addColorStop(0, "#fff8c4");
  bolt.addColorStop(0.5, "#ffd23f");
  bolt.addColorStop(1, "#ff9a1f");
  ctx.fillStyle = bolt;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.stroke();
}

function drawCannonPlate(ctx: Ctx): void {
  const { width, height } = CANNON_PLATE;
  roundRectPath(ctx, 3, 3, width - 6, height - 6, 15);
  const fill = ctx.createLinearGradient(0, 3, 0, height - 3);
  fill.addColorStop(0, "#fff4c9");
  fill.addColorStop(0.55, "#ffd877");
  fill.addColorStop(1, "#e7a936");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#8a5a10";
  ctx.stroke();
  roundRectPath(ctx, 8, 8, width - 16, height - 16, 11);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.stroke();
}

export function ensureCannonTextures(scene: Phaser.Scene): void {
  bake(scene, CANNON_BASE_KEY, CANNON_BASE.width, CANNON_BASE.height, drawCannonBase);
  bake(scene, CANNON_ARM_KEY, CANNON_ARM.width, CANNON_ARM.height, drawCannonArm);
  bake(scene, CANNON_PLATE_KEY, CANNON_PLATE.width, CANNON_PLATE.height, drawCannonPlate);
}

// --- Tir : boule d'énergie --------------------------------------------------------

// Deux textures blanches : le halo (teinté à la couleur du monde) et le cœur
// (laissé blanc), pour une boule qui brille au centre et colore le décor autour.
export function ensureEnergyTextures(scene: Phaser.Scene): void {
  bake(scene, ENERGY_GLOW_KEY, ENERGY_GLOW_SIZE, ENERGY_GLOW_SIZE, (ctx) => {
    const half = ENERGY_GLOW_SIZE / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.22, "rgba(255, 255, 255, 0.85)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.28)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ENERGY_GLOW_SIZE, ENERGY_GLOW_SIZE);
  });
  bake(scene, ENERGY_CORE_KEY, ENERGY_CORE_SIZE, ENERGY_CORE_SIZE, (ctx) => {
    const half = ENERGY_CORE_SIZE / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.95)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ENERGY_CORE_SIZE, ENERGY_CORE_SIZE);
  });
}

// --- Fruits ----------------------------------------------------------------------

function fruitBody(ctx: Ctx, color: number, cx: number, cy: number, radius: number): CanvasGradient {
  const gradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.08, cx, cy, radius * 1.15);
  gradient.addColorStop(0, rgba(lighten(color, 0.6)));
  gradient.addColorStop(0.42, rgba(color));
  gradient.addColorStop(1, rgba(darken(color, 0.35)));
  return gradient;
}

function shine(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fill();
}

function leaf(ctx: Ctx, x: number, y: number, length: number, rotation: number, color = 0x3f9a45): void {
  const gradient = ctx.createLinearGradient(x, y - length * 0.3, x + length, y + length * 0.3);
  gradient.addColorStop(0, rgba(lighten(color, 0.35)));
  gradient.addColorStop(1, rgba(darken(color, 0.25)));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(length / 2, 0, length / 2, length * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function outline(ctx: Ctx, color: number): void {
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = rgba(darken(color, 0.5), 0.7);
  ctx.stroke();
}

function drawTomato(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = fruitBody(ctx, color, 0, 2, 16);
  ctx.fill();
  outline(ctx, color);
  shine(ctx, -6, -4, 4.6, 2.6, -0.6);
  // Calice : petite étoile verte et queue.
  ctx.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? 8.5 : 3;
    const x = Math.cos(angle) * radius;
    const y = -11 + Math.sin(angle) * radius * 0.55;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#3f9140";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#2e6b2c";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(1, -17);
  ctx.stroke();
}

function drawApple(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(-4, -14, -17, -10, -16, 3);
  ctx.bezierCurveTo(-15, 13, -6, 18, 0, 15);
  ctx.bezierCurveTo(6, 18, 15, 13, 16, 3);
  ctx.bezierCurveTo(17, -10, 4, -14, 0, -8);
  ctx.closePath();
  ctx.fillStyle = fruitBody(ctx, color, 0, 3, 17);
  ctx.fill();
  outline(ctx, color);
  shine(ctx, -7, -2, 3.6, 5.2, 0.35);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "#6b4423";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(1, -13, 3, -16);
  ctx.stroke();
  leaf(ctx, 3, -13, 11, -0.55);
}

function drawAvocado(ctx: Ctx, color: number): void {
  const path = (scale: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -17 * scale + 1);
    ctx.bezierCurveTo(8 * scale, -17 * scale, 9 * scale, -6 * scale, 14 * scale, 2 * scale);
    ctx.bezierCurveTo(19 * scale, 12 * scale, 10 * scale, 19 * scale, 0, 19 * scale);
    ctx.bezierCurveTo(-10 * scale, 19 * scale, -19 * scale, 12 * scale, -14 * scale, 2 * scale);
    ctx.bezierCurveTo(-9 * scale, -6 * scale, -8 * scale, -17 * scale, 0, -17 * scale + 1);
    ctx.closePath();
  };
  path(1);
  ctx.fillStyle = fruitBody(ctx, darken(color, 0.28), 0, 3, 19);
  ctx.fill();
  outline(ctx, darken(color, 0.28));
  // Chair claire et noyau.
  path(0.74);
  ctx.fillStyle = rgba(mix(0xf4f0a8, color, 0.28));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 6, 6.2, 0, Math.PI * 2);
  ctx.fillStyle = fruitBody(ctx, 0x8a5a2b, 0, 6, 6.2);
  ctx.fill();
  shine(ctx, -2, 3.4, 1.8, 1.1, -0.5);
}

const GRAPE_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [-8.5, -3],
  [0, -4.5],
  [8.5, -3],
  [-4.5, 5],
  [4.5, 5],
  [0, 13],
];

function drawGrape(ctx: Ctx, color: number): void {
  for (const [x, y] of GRAPE_POSITIONS) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = fruitBody(ctx, color, x, y, 7);
    ctx.fill();
    outline(ctx, color);
    shine(ctx, x - 2.2, y - 2.4, 1.9, 1.2, -0.6);
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = "#6b4423";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(1, -14, 3, -17);
  ctx.stroke();
  leaf(ctx, 3, -14, 12, -0.5, 0x3f9a45);
}

const ORANGE_DOTS: ReadonlyArray<readonly [number, number]> = [
  [-7, -1],
  [2, -6],
  [8, 2],
  [-3, 7],
  [5, 9],
  [-10, 6],
  [-1, 1],
];

function drawOrange(ctx: Ctx, color: number, variant: FruitColor): void {
  if (variant === "yellow") {
    // Citron : forme ovale terminée par deux petites pointes.
    ctx.save();
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 1, 17, 12.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = fruitBody(ctx, color, 0, 1, 17);
    ctx.fill();
    outline(ctx, color);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 17.5, 1, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = rgba(darken(color, 0.1));
      ctx.fill();
    }
    shine(ctx, -6, -4, 5, 2.4, -0.1);
    ctx.restore();
    leaf(ctx, 3, -10, 10, -0.7);
    return;
  }
  ctx.beginPath();
  ctx.arc(0, 2, 15.5, 0, Math.PI * 2);
  ctx.fillStyle = fruitBody(ctx, color, 0, 2, 15.5);
  ctx.fill();
  outline(ctx, color);
  ctx.fillStyle = rgba(darken(color, 0.3), 0.28);
  for (const [x, y] of ORANGE_DOTS) {
    ctx.beginPath();
    ctx.arc(x, y + 2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  shine(ctx, -6, -4, 4.4, 2.4, -0.6);
  leaf(ctx, 1, -12, 11, -0.6);
  ctx.beginPath();
  ctx.arc(0, -12.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = "#5a7a2c";
  ctx.fill();
}

const BERRY_SEEDS: ReadonlyArray<readonly [number, number]> = [
  [-7, -3],
  [0, -4.5],
  [7, -3],
  [-9, 3],
  [-3, 2],
  [4, 2],
  [10, 3],
  [-5, 8],
  [2, 8],
  [-0.5, 13],
];

function drawBerry(ctx: Ctx, color: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 17);
  ctx.bezierCurveTo(-18, 6, -17, -8, -8, -10);
  ctx.bezierCurveTo(-4, -11, -2, -9, 0, -9);
  ctx.bezierCurveTo(2, -9, 4, -11, 8, -10);
  ctx.bezierCurveTo(17, -8, 18, 6, 0, 17);
  ctx.closePath();
  ctx.fillStyle = fruitBody(ctx, color, 0, 2, 18);
  ctx.fill();
  outline(ctx, color);
  ctx.fillStyle = "rgba(255, 240, 160, 0.95)";
  for (const [x, y] of BERRY_SEEDS) {
    ctx.beginPath();
    ctx.ellipse(x, y, 1.1, 1.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  shine(ctx, -8, -4, 2.6, 4.2, 0.25);
  // Couronne de feuilles.
  for (const angle of [-2.5, -1.9, -1.57, -1.25, -0.65]) {
    leaf(ctx, 0, -10, 9, angle, 0x3f9a45);
  }
}

type FruitPainter = (ctx: Ctx, color: number, variant: FruitColor) => void;

const FRUIT_PAINTERS: Record<string, FruitPainter> = {
  tomato: drawTomato,
  apple: drawApple,
  avocado: drawAvocado,
  grape: drawGrape,
  orange: drawOrange,
  berry: drawBerry,
};

/** Fruit dessiné sans pastille, centré sur l'origine : utilisé dans le badge et dans les tests. */
export function paintFruit(ctx: Ctx, family: string, color: number, variant: FruitColor): void {
  (FRUIT_PAINTERS[family] ?? drawTomato)(ctx, color, variant);
}

export function fruitTextureKey(family: string, variant: FruitColor): string {
  return `turbo-fruit-${family}-${variant}`;
}

function drawFruitBadge(ctx: Ctx, family: string, color: number, variant: FruitColor): void {
  const center = FRUIT_BADGE_SIZE / 2;
  ctx.save();
  ctx.translate(center, center);

  // Halo diffus de la couleur du fruit.
  const halo = ctx.createRadialGradient(0, 0, FRUIT_RADIUS * 0.8, 0, 0, FRUIT_RADIUS + FRUIT_HALO_MARGIN);
  halo.addColorStop(0, rgba(color, 0.55));
  halo.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, FRUIT_RADIUS + FRUIT_HALO_MARGIN, 0, Math.PI * 2);
  ctx.fill();

  // Anneau de couleur : c'est lui qui dit « ce fruit appartient à la famille rouge, verte… ».
  const ring = ctx.createLinearGradient(0, -FRUIT_RADIUS - 7, 0, FRUIT_RADIUS + 7);
  ring.addColorStop(0, rgba(lighten(color, 0.45)));
  ring.addColorStop(0.5, rgba(color));
  ring.addColorStop(1, rgba(darken(color, 0.3)));
  ctx.beginPath();
  ctx.arc(0, 0, FRUIT_RADIUS + 7, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.stroke();

  // Pastille claire qui porte le fruit et le nombre.
  const plate = ctx.createRadialGradient(-8, -10, 3, 0, 0, FRUIT_RADIUS + 2);
  plate.addColorStop(0, "#ffffff");
  plate.addColorStop(0.6, "#fff6d9");
  plate.addColorStop(1, "#ecd9a8");
  ctx.beginPath();
  ctx.arc(0, 0, FRUIT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(22, 50, 74, 0.35)";
  ctx.stroke();

  // Le fruit, dans la moitié haute ; le nombre (texte Phaser) occupe la moitié basse.
  ctx.save();
  ctx.translate(0, -10);
  ctx.scale(0.86, 0.86);
  paintFruit(ctx, family, color, variant);
  ctx.restore();
  ctx.restore();
}

/** Prépare (une seule fois) la texture du badge d'un fruit et renvoie sa clé. */
export function ensureFruitTexture(scene: Phaser.Scene, family: string, variant: FruitColor, color: number): string {
  const key = fruitTextureKey(family, variant);
  bake(scene, key, FRUIT_BADGE_SIZE, FRUIT_BADGE_SIZE, (ctx) => drawFruitBadge(ctx, family, color, variant));
  return key;
}

/** Couleur sombre de l'étiquette d'un fruit (même teinte que son anneau, assombrie). */
export function fruitLabelColor(color: number): number {
  return darken(color, 0.62);
}
