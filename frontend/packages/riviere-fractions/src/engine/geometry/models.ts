import { box, cylinder, emptyMesh, hull, lathe, mixColor, quad, scaleColor, sphere, type Color, type MeshData } from "./kit";
import { valueNoise } from "./noise";

// Modèles du niveau 1, construits en code et réutilisés partout : arbres, bambous, cerisiers, maisons sur pilotis,
// pavillon, ponts arqués, lanternes, rochers, lotus, pitons calcaires et bateaux des autres navigateurs (le bateau du
// joueur a son propre atelier, dans `boat/`). Chaque modèle remplit deux maillages : `lit` (éclairé par le soleil) et
// `glow` (lanternes, qui brillent d'elles-mêmes).

export interface ModelParts {
  lit: MeshData;
  glow: MeshData;
}

export function emptyParts(): ModelParts {
  return { lit: emptyMesh(), glow: emptyMesh() };
}

export const PALETTE = {
  trunk: [0.36, 0.25, 0.17] as Color,
  leafDark: [0.16, 0.42, 0.16] as Color,
  leafLight: [0.42, 0.68, 0.24] as Color,
  bamboo: [0.55, 0.68, 0.28] as Color,
  bambooLeaf: [0.32, 0.58, 0.2] as Color,
  blossom: [0.97, 0.66, 0.8] as Color,
  blossomLight: [1, 0.86, 0.92] as Color,
  wood: [0.56, 0.37, 0.21] as Color,
  woodDark: [0.36, 0.22, 0.13] as Color,
  woodLight: [0.72, 0.52, 0.32] as Color,
  lacquer: [0.74, 0.12, 0.1] as Color,
  roof: [0.42, 0.13, 0.11] as Color,
  roofDark: [0.28, 0.1, 0.09] as Color,
  plaster: [0.93, 0.88, 0.78] as Color,
  rock: [0.55, 0.54, 0.5] as Color,
  rockDark: [0.38, 0.38, 0.36] as Color,
  lotusPad: [0.22, 0.5, 0.2] as Color,
  lotusFlower: [0.98, 0.55, 0.72] as Color,
  reed: [0.48, 0.6, 0.26] as Color,
  lantern: [0.98, 0.26, 0.12] as Color,
  lanternWarm: [1, 0.78, 0.38] as Color,
  jacket: [0.88, 0.16, 0.12] as Color,
  shirt: [0.95, 0.95, 0.92] as Color,
  skin: [0.4, 0.25, 0.16] as Color,
  hair: [0.07, 0.05, 0.04] as Color,
  straw: [0.82, 0.7, 0.42] as Color,
  canvas: [0.62, 0.5, 0.33] as Color,
  teal: [0.13, 0.5, 0.5] as Color,
};

type Rng = () => number;

const jitter = (seed: number) => (ring: number, angle: number) => 0.82 + 0.36 * valueNoise(ring * 1.7 + seed, angle * 0.9 + seed * 0.3, 3);

/** Arbre feuillu : tronc et trois masses de feuillage irrégulières. */
export function broadleafTree(rng: Rng): ModelParts {
  const parts = emptyParts();
  const height = 2.2 + rng() * 1.8;
  cylinder(parts.lit, 0.22, 0.14, height, 6, PALETTE.trunk);
  const crowns = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < crowns; i += 1) {
    const r = 1.2 + rng() * 0.9;
    const angle = (i / crowns) * Math.PI * 2 + rng();
    const offset = i === 0 ? 0 : 0.9;
    const green = mixColor(PALETTE.leafDark, PALETTE.leafLight, 0.25 + rng() * 0.5);
    sphere(parts.lit, r, (h) => scaleColor(green, 0.85 + h * 0.12), { x: Math.cos(angle) * offset, y: height + r * 0.55 + (i === 0 ? 0.5 : rng() * 0.6), z: Math.sin(angle) * offset, scale: [1, 0.8, 1] }, 4, jitter(rng() * 50));
  }
  return parts;
}

/** Cerisier en fleurs : tronc sombre et nuages roses. */
export function blossomTree(rng: Rng): ModelParts {
  const parts = emptyParts();
  const height = 2 + rng() * 1.2;
  cylinder(parts.lit, 0.2, 0.12, height, 6, PALETTE.woodDark);
  cylinder(parts.lit, 0.1, 0.05, 1.6, 5, PALETTE.woodDark, { y: height * 0.7, roll: 0.7, yaw: rng() * 6 });
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + rng();
    const r = 1 + rng() * 0.6;
    const pink = mixColor(PALETTE.blossom, PALETTE.blossomLight, rng() * 0.6);
    sphere(parts.lit, r, pink, { x: Math.cos(angle) * 0.9, y: height + 0.5 + rng() * 0.7, z: Math.sin(angle) * 0.9, scale: [1, 0.75, 1] }, 4, jitter(rng() * 50));
  }
  return parts;
}

/** Touffe de bambous. */
export function bambooClump(rng: Rng): ModelParts {
  const parts = emptyParts();
  const stems = 6 + Math.floor(rng() * 5);
  for (let i = 0; i < stems; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * 0.9;
    const height = 5 + rng() * 3.5;
    const lean = (rng() - 0.5) * 0.25;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    cylinder(parts.lit, 0.07, 0.05, height, 5, mixColor(PALETTE.bamboo, PALETTE.leafLight, rng() * 0.4), { x, z, roll: lean }, false);
    sphere(parts.lit, 0.9 + rng() * 0.5, PALETTE.bambooLeaf, { x: x + Math.sin(lean) * -height * 0.85, y: height * 0.86, z, scale: [1.3, 0.45, 1], yaw: rng() * 6 }, 3);
  }
  return parts;
}

/** Buisson bas, pour habiller densément les berges à petit prix. */
export function bush(rng: Rng): ModelParts {
  const parts = emptyParts();
  const green = mixColor(PALETTE.leafDark, PALETTE.leafLight, 0.2 + rng() * 0.5);
  for (let i = 0; i < 2; i += 1) {
    sphere(parts.lit, 0.55 + rng() * 0.45, (h) => scaleColor(green, 0.8 + h * 0.2), { x: (rng() - 0.5) * 0.9, y: 0.25, z: (rng() - 0.5) * 0.9, scale: [1.2, 0.75, 1.1] }, 3, jitter(rng() * 40));
  }
  if (rng() > 0.45) {
    const flower = rng() > 0.5 ? PALETTE.blossom : rng() > 0.5 ? PALETTE.lanternWarm : PALETTE.shirt;
    for (let i = 0; i < 4; i += 1) sphere(parts.lit, 0.12, flower, { x: (rng() - 0.5) * 1.2, y: 0.65 + rng() * 0.2, z: (rng() - 0.5) * 1.2 }, 2);
  }
  return parts;
}

export function rock(rng: Rng, size = 1): ModelParts {
  const parts = emptyParts();
  const r = (0.5 + rng() * 0.9) * size;
  const tone = mixColor(PALETTE.rock, PALETTE.rockDark, rng() * 0.7);
  sphere(parts.lit, r, (h) => scaleColor(tone, 0.85 + h * 0.15), { y: r * 0.25, scale: [1.2, 0.65, 1] }, 4, jitter(rng() * 50));
  return parts;
}

export function reeds(rng: Rng): ModelParts {
  const parts = emptyParts();
  for (let i = 0; i < 9; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * 0.8;
    cylinder(parts.lit, 0.04, 0, 1 + rng() * 0.9, 3, mixColor(PALETTE.reed, PALETTE.leafLight, rng() * 0.5), { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, roll: (rng() - 0.5) * 0.4 }, false);
  }
  return parts;
}

/** Feuilles et fleurs de lotus, posées sur l'eau. */
export function lotus(rng: Rng): ModelParts {
  const parts = emptyParts();
  const pads = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < pads; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 0.3 + rng() * 1.4;
    cylinder(parts.lit, 0.35 + rng() * 0.25, 0.35, 0.03, 9, mixColor(PALETTE.lotusPad, PALETTE.leafLight, rng() * 0.4), { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });
  }
  const flowers = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < flowers; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * 1.1;
    lathe(parts.lit, [[0.05, 0], [0.3, 0.1], [0.36, 0.28], [0.18, 0.42]], 6, PALETTE.lotusFlower, { x: Math.cos(angle) * radius, y: 0.02, z: Math.sin(angle) * radius }, (ring, a) => (ring > 1 ? 0.75 + 0.4 * (a % 2) : 1));
  }
  return parts;
}

function lanternBody(target: MeshData, x: number, y: number, z: number, size = 1): void {
  sphere(target, 0.22 * size, (h) => (Math.abs(h) > 0.2 * size ? PALETTE.lanternWarm : PALETTE.lantern), { x, y, z, scale: [1, 1.25, 1] }, 5);
}

/** Poteau de bois avec une lanterne rouge suspendue. */
export function lanternPost(): ModelParts {
  const parts = emptyParts();
  cylinder(parts.lit, 0.09, 0.07, 2.8, 5, PALETTE.woodDark);
  box(parts.lit, 0.08, 0.08, 0.7, PALETTE.woodDark, { y: 2.65, z: 0.3 });
  cylinder(parts.lit, 0.01, 0.01, 0.25, 3, PALETTE.woodDark, { y: 2.42, z: 0.6 }, false);
  lanternBody(parts.glow, 0, 2.2, 0.6);
  box(parts.lit, 0.16, 0.06, 0.16, PALETTE.woodDark, { y: 2.45, z: 0.6 });
  return parts;
}

/** Toit à bords relevés : deux pans, une faîtière, et quatre coins qui remontent. */
function upturnedRoof(target: MeshData, width: number, depth: number, rise: number, y: number, color: Color): void {
  const w = width / 2 + 0.5;
  const d = depth / 2 + 0.5;
  const tip = 0.35;
  quad(target, [[-w, y + tip, -d], [-w * 0.92, y + rise, 0], [w * 0.92, y + rise, 0], [w, y + tip, -d]], color);
  quad(target, [[w, y + tip, d], [w * 0.92, y + rise, 0], [-w * 0.92, y + rise, 0], [-w, y + tip, d]], scaleColor(color, 0.85));
  quad(target, [[-w, y + tip, -d], [-w * 0.92, y + rise, 0], [-w, y + tip, d], [-w - 0.1, y + tip * 0.2, 0]], scaleColor(color, 0.75));
  quad(target, [[w, y + tip, d], [w * 0.92, y + rise, 0], [w, y + tip, -d], [w + 0.1, y + tip * 0.2, 0]], scaleColor(color, 0.75));
  box(target, width * 0.95, 0.16, 0.22, PALETTE.roofDark, { y: y + rise - 0.06 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(target, 0.08, 0.02, 0.55, 4, color, { x: sx * w, y: y + tip - 0.05, z: sz * d, roll: sx * 0.6, pitch: -sz * 0.6 }, false);
    }
  }
}

/** Maison de bois sur pilotis, au bord de l'eau, face à la rivière (vers -z local). */
export function stiltHouse(rng: Rng): ModelParts {
  const parts = emptyParts();
  const width = 4.2 + rng() * 1.6;
  const depth = 3.4 + rng() * 1;
  const floor = 1.5;
  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 1]) {
      cylinder(parts.lit, 0.11, 0.11, floor + 2.5, 5, PALETTE.woodDark, { x: sx * (width / 2 - 0.2), y: -2.5, z: sz * (depth / 2 - 0.2) }, false);
    }
  }
  box(parts.lit, width + 1.2, 0.18, depth + 1.4, PALETTE.wood, { y: floor - 0.18, z: -0.4 });
  const walls = rng() > 0.5 ? PALETTE.woodLight : PALETTE.plaster;
  box(parts.lit, width, 2.3, depth, walls, { y: floor });
  // Poutres et ouvertures, côté rivière.
  box(parts.lit, width + 0.1, 0.14, depth + 0.1, PALETTE.woodDark, { y: floor + 2.2 });
  for (let i = -1; i <= 1; i += 2) box(parts.lit, 0.9, 0.9, 0.06, PALETTE.woodDark, { x: i * width * 0.25, y: floor + 0.9, z: -depth / 2 - 0.02 });
  box(parts.lit, 0.9, 1.7, 0.06, PALETTE.woodDark, { x: 0, y: floor, z: -depth / 2 - 0.02 });
  // Balustrade de la galerie.
  box(parts.lit, width + 1.2, 0.08, 0.08, PALETTE.woodDark, { y: floor + 0.75, z: -depth / 2 - 1.05 });
  upturnedRoof(parts.lit, width, depth, 1.7, floor + 2.3, rng() > 0.4 ? PALETTE.roof : PALETTE.roofDark);
  for (const sx of [-1, 1]) {
    cylinder(parts.lit, 0.01, 0.01, 0.4, 3, PALETTE.woodDark, { x: sx * (width / 2 + 0.3), y: floor + 2.0, z: -depth / 2 - 0.6 }, false);
    lanternBody(parts.glow, sx * (width / 2 + 0.3), floor + 1.75, -depth / 2 - 0.6);
  }
  return parts;
}

/** Pavillon hexagonal à deux toits, sur une petite colline. */
export function pavilion(): ModelParts {
  const parts = emptyParts();
  cylinder(parts.lit, 3.2, 3, 0.6, 6, PALETTE.rock);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    cylinder(parts.lit, 0.14, 0.14, 2.8, 6, PALETTE.lacquer, { x: Math.cos(a) * 2.3, y: 0.6, z: Math.sin(a) * 2.3 }, false);
  }
  const roof = (y: number, radius: number) =>
    lathe(parts.lit, [[radius + 0.6, y + 0.35], [radius, y], [radius * 0.55, y + 0.9], [0.25, y + 1.7], [0.05, y + 1.9]], 6, (h) => (h < y + 0.2 ? PALETTE.roofDark : PALETTE.roof));
  roof(3.3, 3);
  roof(4.9, 1.9);
  cylinder(parts.lit, 0.08, 0.02, 0.9, 5, PALETTE.lanternWarm, { y: 6.7 });
  lanternBody(parts.glow, 0, 2.7, 0, 1.3);
  return parts;
}

/**
 * Pont arqué rouge qui enjambe le chenal (axe x local, d'une berge à l'autre). Le milieu reste assez haut pour que
 * les bateaux passent dessous.
 */
export function archedBridge(span: number, clearance: number): ModelParts {
  const parts = emptyParts();
  const steps = 18;
  const half = span / 2;
  const archY = (x: number) => clearance * (1 - (x / half) ** 2) + 0.8;
  for (let i = 0; i < steps; i += 1) {
    const x0 = -half + (span * i) / steps;
    const x1 = x0 + span / steps;
    const y0 = archY(x0);
    const y1 = archY(x1);
    const mid = (x0 + x1) / 2;
    const slope = Math.atan2(y1 - y0, x1 - x0);
    box(parts.lit, span / steps + 0.08, 0.35, 2.6, i % 2 === 0 ? PALETTE.wood : PALETTE.woodLight, { x: mid, y: (y0 + y1) / 2 - 0.2, roll: slope });
    box(parts.lit, span / steps + 0.06, 0.55, 0.14, PALETTE.lacquer, { x: mid, y: (y0 + y1) / 2 - 0.55, z: 1.25, roll: slope });
    box(parts.lit, span / steps + 0.06, 0.55, 0.14, PALETTE.lacquer, { x: mid, y: (y0 + y1) / 2 - 0.55, z: -1.25, roll: slope });
    for (const z of [-1.25, 1.25]) {
      cylinder(parts.lit, 0.07, 0.07, 1, 4, PALETTE.lacquer, { x: x0, y: y0, z }, false);
      box(parts.lit, span / steps + 0.1, 0.1, 0.12, PALETTE.lacquer, { x: mid, y: (y0 + y1) / 2 + 0.95, z, roll: slope });
    }
  }
  for (const side of [-1, 1]) {
    box(parts.lit, 1.4, 2.4, 3.2, PALETTE.rock, { x: side * (half + 0.4), y: -1.2 });
    cylinder(parts.lit, 0.12, 0.12, 2.2, 5, PALETTE.lacquer, { x: side * (half - 0.2), y: archY(side * (half - 0.2)), z: 1.4 }, false);
    cylinder(parts.lit, 0.12, 0.12, 2.2, 5, PALETTE.lacquer, { x: side * (half - 0.2), y: archY(side * (half - 0.2)), z: -1.4 }, false);
    lanternBody(parts.glow, side * (half - 0.2), archY(side * (half - 0.2)) + 1.9, 1.4);
    lanternBody(parts.glow, side * (half - 0.2), archY(side * (half - 0.2)) + 1.9, -1.4);
  }
  return parts;
}

/** Ponton de bois sur pieux (axe z local, depuis la berge vers l'eau). */
export function dock(length: number, width = 2.2): ModelParts {
  const parts = emptyParts();
  const planks = Math.round(length / 0.5);
  for (let i = 0; i < planks; i += 1) box(parts.lit, width, 0.1, 0.44, i % 3 === 0 ? PALETTE.woodLight : PALETTE.wood, { y: 0.55, z: i * 0.5 });
  for (let i = 0; i <= length / 2.5; i += 1) {
    for (const sx of [-1, 1]) cylinder(parts.lit, 0.12, 0.12, 2.6, 5, PALETTE.woodDark, { x: sx * (width / 2 - 0.1), y: -2, z: i * 2.5 }, false);
  }
  return parts;
}

/**
 * Portique d'une voie : deux poteaux de bois laqué, une poutre et un petit toit, avec deux lanternes. Le panneau de
 * la réponse s'accroche sous la poutre (posé par la scène). Axe x local d'un poteau à l'autre.
 */
export function laneGate(width: number, height: number): ModelParts {
  const parts = emptyParts();
  const half = width / 2;
  for (const side of [-1, 1]) {
    cylinder(parts.lit, 0.2, 0.17, height + 2.6, 6, PALETTE.lacquer, { x: side * half, y: -2.4 }, false);
    cylinder(parts.lit, 0.32, 0.32, 0.5, 6, PALETTE.rockDark, { x: side * half, y: -0.3 });
    cylinder(parts.lit, 0.02, 0.02, 0.35, 3, PALETTE.woodDark, { x: side * (half - 0.55), y: height - 0.55, z: -0.15 }, false);
    lanternBody(parts.glow, side * (half - 0.55), height - 0.8, -0.15, 1.15);
  }
  box(parts.lit, width + 1.4, 0.32, 0.4, PALETTE.lacquer, { y: height });
  box(parts.lit, width + 0.6, 0.18, 0.3, PALETTE.woodDark, { y: height - 0.55 });
  quad(parts.lit, [[-half - 1.1, height + 0.55, -0.6], [-half - 0.9, height + 0.85, 0], [half + 0.9, height + 0.85, 0], [half + 1.1, height + 0.55, -0.6]], PALETTE.roofDark);
  quad(parts.lit, [[half + 1.1, height + 0.55, 0.6], [half + 0.9, height + 0.85, 0], [-half - 0.9, height + 0.85, 0], [-half - 1.1, height + 0.55, 0.6]], PALETTE.roof);
  return parts;
}

/** Barrage flottant de bambous : il se lève dans une mauvaise voie. Axe x local d'une rive de la voie à l'autre. */
export function bambooBarrier(width: number): ModelParts {
  const parts = emptyParts();
  for (let i = 0; i < 3; i += 1) {
    cylinder(parts.lit, 0.16, 0.16, width, 6, i === 1 ? PALETTE.bamboo : scaleColor(PALETTE.bamboo, 0.85), { y: 0.15 + i * 0.32, x: -width / 2, roll: -Math.PI / 2 }, true);
  }
  for (let x = -width / 2 + 0.4; x <= width / 2; x += 1.1) {
    cylinder(parts.lit, 0.09, 0.09, 2.2, 4, PALETTE.woodDark, { x, y: -0.3 }, false);
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k += 1) {
      cylinder(parts.lit, 0.2, 0.2, 0.55, 6, k % 2 === 0 ? PALETTE.lacquer : PALETTE.shirt, { x: side * (width / 2 - 0.2), y: -0.2 + k * 0.55 }, k === 3);
    }
  }
  // Fanions rouges et blancs : le barrage se voit sans dépendre d'une seule couleur (il barre la voie).
  for (let x = -width / 2 + 0.6; x < width / 2; x += 1.6) {
    quad(parts.lit, [[x, 1.3, 0], [x + 0.55, 1.15, 0], [x, 0.95, 0], [x, 0.95, 0]], x % 3.2 < 1.6 ? PALETTE.lacquer : PALETTE.shirt);
  }
  return parts;
}

/**
 * Piton calcaire : tour arrondie couverte de végétation, avec des pans de roche. Hauteur et rayon en mètres.
 */
export function karstTower(rng: Rng, height: number, radius: number): ModelParts {
  const parts = emptyParts();
  const seed = rng() * 100;
  const profile: [number, number][] = [
    [radius * 1.15, -2],
    [radius, height * 0.12],
    [radius * (0.9 + rng() * 0.1), height * 0.35],
    [radius * (0.8 + rng() * 0.12), height * 0.58],
    [radius * (0.66 + rng() * 0.12), height * 0.78],
    [radius * 0.46, height * 0.92],
    [radius * 0.12, height],
  ];
  lathe(
    parts.lit,
    profile,
    11,
    (h, _ring, angle) => {
      const rocky = valueNoise(angle * 2.2 + seed, h * 0.08 + seed, 5) > 0.62 && h > height * 0.1 && h < height * 0.85;
      const green = mixColor(PALETTE.leafDark, PALETTE.leafLight, 0.2 + 0.45 * valueNoise(angle * 3 + seed, h * 0.15, 9));
      return rocky ? mixColor(PALETTE.rock, PALETTE.rockDark, 0.3) : scaleColor(green, 0.82 + 0.3 * (h / height));
    },
    {},
    (ring, angle) => 0.8 + 0.42 * valueNoise(ring * 1.3 + seed, angle * 0.85 + seed, 11),
  );
  return parts;
}

function person(target: MeshData, y: number, z: number, shirt: Color, skin: Color, hat: boolean, scale = 1): void {
  cylinder(target, 0.26 * scale, 0.22 * scale, 0.55 * scale, 7, shirt, { y, z });
  sphere(target, 0.2 * scale, skin, { y: y + 0.75 * scale, z }, 5);
  if (hat) {
    lathe(target, [[0.55 * scale, 0], [0.05 * scale, 0.3 * scale]], 10, PALETTE.straw, { y: y + 0.82 * scale, z });
  } else {
    sphere(target, 0.215 * scale, PALETTE.hair, { y: y + 0.82 * scale, z: z - 0.02, scale: [1, 0.85, 1] }, 5);
  }
}

export function fishingBoat(rng: Rng): ModelParts {
  const parts = emptyParts();
  hull(parts.lit, 6, 1.4, 0.5, PALETTE.woodDark, PALETTE.wood);
  lathe(parts.lit, [[0.85, 0], [0.8, 0.45], [0.55, 0.8], [0.05, 0.95]], 8, PALETTE.canvas, { y: 0.75, z: -0.6, scale: [1, 1, 1.9] });
  person(parts.lit, 0.75, 1.5, mixColor(PALETTE.teal, PALETTE.shirt, rng() * 0.5), PALETTE.skin, true, 0.95);
  cylinder(parts.lit, 0.03, 0.03, 4, 3, PALETTE.woodDark, { y: 1.2, z: 1.6, pitch: 0.9 }, false);
  return parts;
}

export function cargoBoat(rng: Rng): ModelParts {
  const parts = emptyParts();
  hull(parts.lit, 8, 2.4, 0.7, PALETTE.wood, PALETTE.woodDark);
  box(parts.lit, 1.8, 1.4, 1.8, PALETTE.woodLight, { y: 0.8, z: -2.6 });
  upturnedRoof(parts.lit, 1.8, 1.8, 0.7, 2.2, PALETTE.roofDark);
  for (let i = 0; i < 5; i += 1) {
    box(parts.lit, 0.7, 0.55, 0.7, mixColor(PALETTE.straw, PALETTE.canvas, rng()), { x: (i % 2) * 0.75 - 0.35, y: 0.8 + Math.floor(i / 4) * 0.55, z: -0.6 + i * 0.6 });
  }
  person(parts.lit, 0.8, -1.4, PALETTE.shirt, scaleColor(PALETTE.skin, 1.2), false, 0.95);
  return parts;
}

export function passengerBoat(rng: Rng): ModelParts {
  const parts = emptyParts();
  hull(parts.lit, 7, 2.2, 0.6, PALETTE.wood, PALETTE.woodLight);
  for (const sx of [-1, 1]) {
    for (const z of [-2, 0, 2]) cylinder(parts.lit, 0.06, 0.06, 1.6, 4, PALETTE.woodDark, { x: sx * 0.9, y: 0.75, z }, false);
  }
  box(parts.lit, 2.3, 0.1, 5, PALETTE.teal, { y: 2.35 });
  box(parts.lit, 2.5, 0.08, 5.2, PALETTE.lacquer, { y: 2.3 });
  for (let i = 0; i < 4; i += 1) {
    const shirt = [PALETTE.lacquer, PALETTE.lanternWarm, PALETTE.shirt, PALETTE.teal][i];
    person(parts.lit, 0.75, -1.6 + i * 1.05, shirt, mixColor(PALETTE.skin, [0.78, 0.6, 0.46], rng() * 0.7), i === 0, 0.85);
  }
  lanternBody(parts.glow, 0, 1.9, 2.4);
  return parts;
}

/** Lanterne céleste de la fête d'arrivée. */
export function skyLantern(): ModelParts {
  const parts = emptyParts();
  lathe(parts.glow, [[0.25, 0], [0.42, 0.35], [0.38, 0.8], [0.1, 0.95]], 6, PALETTE.lanternWarm);
  return parts;
}
