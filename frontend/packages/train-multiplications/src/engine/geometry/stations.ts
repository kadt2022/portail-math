import type { StationStop } from "../../domain/network";
import type { Track } from "../../domain/track";
import { addShape, box, cylinder, emptyMesh, mixColor, place, type Color, type MeshData, type Vec3 } from "./kit";
import { valueNoise } from "./noise";
import { PALETTE as C } from "./palette";
import { mangoCrate } from "./rollingStock";
import { arcBand, bar, disc, rod } from "./shapes";

// Gares et quais, avec une identité commune : murs blancs, ferronneries vert profond, toits d'ardoise, touches de
// brique, quais de béton clair. Un quai longe la voie à 1,65 m de son axe, à 0,55 m au-dessus du rail : bordure
// blanche, bande d'éveil jaune, dalles de béton. Derrière lui, le bâtiment voyageurs : grande gare de départ (façade
// blanche, pilastres, arcades, pavillon central de brique à horloge, marquise sur colonnes), petite gare de village
// (murs blancs, volets bleus) ou abri de la halte. Les marchandises (caisses de mangues) attendent sur le quai.
//
// Tout est construit dans le repère de la gare — x vers l'extérieur du quai (côté opposé à la voie), z le long de la
// voie, y vers le haut, origine sur l'axe de la voie au milieu du quai, au niveau du rail — puis posé sur le tracé.
//
// Écrit pour Yamba.

export const PLATFORM = { edge: 1.65, height: 0.55 } as const;

type Builder = { mesh: MeshData; sx: number };

/** Boîte en coordonnées de gare : x mesuré depuis l'axe de la voie, vers l'extérieur du quai. */
function b(bd: Builder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: Color): void {
  const xa = bd.sx * x0;
  const xb = bd.sx * x1;
  box(bd.mesh, Math.abs(xb - xa), y1 - y0, Math.abs(z1 - z0), color, { x: (xa + xb) / 2, y: y0, z: (z0 + z1) / 2 });
}

function quad(bd: Builder, points: [number, number, number][], color: Color | Color[]): void {
  addShape(bd.mesh, points.map(([x, y, z]) => [bd.sx * x, y, z] as Vec3), [0, 1, 2, 0, 2, 3], color as Color);
}

/** Quai : mur de quai, bordure, ligne jaune, dallage en damier discret ; du côté x > edge, sur `width` mètres. */
function platform(bd: Builder, length: number, width: number): void {
  const h = PLATFORM.height;
  const half = length / 2;
  const edge = PLATFORM.edge;
  b(bd, edge + 0.05, edge + width, -0.9, h, -half, half, C.platformDark);
  b(bd, edge, edge + 0.45, h - 0.12, h, -half, half, C.stoneLight);
  b(bd, edge, edge + 0.08, -0.9, h - 0.12, -half, half, C.stoneDark);
  b(bd, edge + 0.62, edge + 0.74, h, h + 0.006, -half, half, C.safety);
  const tile = 1.2;
  for (let z = -half; z < half - 0.01; z += tile) {
    for (let x = edge + 0.8; x < edge + width - 0.01; x += tile) {
      const n = valueNoise(x * 3.1, z * 2.7, 41);
      // Une dalle = une face (le joint est le dessus du massif, plus sombre, visible entre deux dalles).
      const x1 = Math.min(edge + width, x + tile - 0.04);
      const z1 = Math.min(half, z + tile - 0.04);
      quad(bd, [[x, h + 0.004, z], [x1, h + 0.004, z], [x1, h + 0.004, z1], [x, h + 0.004, z1]], mixColor(C.platformDark, C.platform, 0.55 + n * 0.45));
    }
  }
  // Rampe en bout de quai.
  for (const dir of [-1, 1]) {
    const z = dir * half;
    quad(bd, [[edge, h, z], [edge + width, h, z], [edge + width, -0.6, z + dir * 3], [edge, -0.6, z + dir * 3]], C.platformDark);
  }
}

/** Fenêtre ou porte cintrée dans un mur de façade (plan x = wallX, vers -x), avec encadrement blanc et clé. */
function archedOpening(bd: Builder, wallX: number, zc: number, y0: number, width: number, height: number, fill: Color, frame: Color): void {
  const r = width / 2;
  const y1 = y0 + height - r;
  const x = wallX - 0.03;
  b(bd, x - 0.02, x, y0, y1, zc - r, zc + r, fill);
  // Demi-cercle du cintre en éventail.
  const steps = 10;
  for (let i = 0; i < steps; i += 1) {
    const a0 = (Math.PI * i) / steps;
    const a1 = (Math.PI * (i + 1)) / steps;
    addShape(bd.mesh, [[bd.sx * (x - 0.02), y1, zc], [bd.sx * (x - 0.02), y1 + Math.sin(a0) * r, zc + Math.cos(a0) * r], [bd.sx * (x - 0.02), y1 + Math.sin(a1) * r, zc + Math.cos(a1) * r]], [0, 1, 2], fill);
  }
  // Encadrement : montants, cintre en bandeau, appui, clé.
  b(bd, x - 0.08, x, y0, y1, zc - r - 0.14, zc - r, frame);
  b(bd, x - 0.08, x, y0, y1, zc + r, zc + r + 0.14, frame);
  const local = emptyMesh();
  arcBand(local, r + 0.07, 0.08, 0.14, 0, Math.PI, 12, frame);
  place(bd.mesh, local, { x: bd.sx * (x - 0.04), y: y1, z: zc, yaw: 0 });
  b(bd, x - 0.14, x, y0 - 0.1, y0, zc - r - 0.18, zc + r + 0.18, frame);
  b(bd, x - 0.12, x, y1 + r - 0.05, y1 + r + 0.22, zc - 0.13, zc + 0.13, C.stoneLight);
  // Petits bois (croisillons) des fenêtres.
  if (fill === C.glass) {
    b(bd, x - 0.05, x - 0.02, y0, y1 + r, zc - 0.025, zc + 0.025, C.white);
    b(bd, x - 0.05, x - 0.02, y0 + (y1 - y0) * 0.55, y0 + (y1 - y0) * 0.55 + 0.05, zc - r, zc + r, C.white);
  }
}

/** Toit à quatre pans en tuiles : pans faits de rangs de tuiles alternés, faîtage et arêtiers sombres. */
function hipRoof(bd: Builder, x0: number, x1: number, z0: number, z1: number, eaves: number, rise: number): void {
  const overhang = 0.5;
  const xa = x0 - overhang;
  const xb = x1 + overhang;
  const za = z0 - overhang;
  const zb = z1 + overhang;
  const inset = Math.min(xb - xa, zb - za) / 2;
  const ridge = { y: eaves + rise, za: za + inset, zb: zb - inset, x: (xa + xb) / 2 };
  const rows = 9;
  const tileColor = (i: number) => (i % 2 === 0 ? C.tile : mixColor(C.tile, C.tileDark, 0.45));
  for (let i = 0; i < rows; i += 1) {
    const t0 = i / rows;
    const t1 = (i + 1) / rows;
    const lerp = (a: number, c: number, t: number) => a + (c - a) * t;
    const y0 = lerp(eaves, ridge.y, t0);
    const y1 = lerp(eaves, ridge.y, t1);
    // Pans longs (côté voie et côté rue).
    for (const [xe, sign] of [[xa, 1], [xb, -1]] as const) {
      const xr0 = lerp(xe, ridge.x, t0);
      const xr1 = lerp(xe, ridge.x, t1);
      quad(bd, [[xr0, y0, lerp(za, ridge.za, t0)], [xr0, y0, lerp(zb, ridge.zb, t0)], [xr1, y1, lerp(zb, ridge.zb, t1)], [xr1, y1, lerp(za, ridge.za, t1)]], tileColor(i + (sign > 0 ? 0 : 1)));
    }
    // Croupes (pignons inclinés).
    for (const [ze, zr] of [[za, ridge.za], [zb, ridge.zb]] as const) {
      quad(bd, [[lerp(xa, ridge.x, t0), y0, lerp(ze, zr, t0)], [lerp(xb, ridge.x, t0), y0, lerp(ze, zr, t0)], [lerp(xb, ridge.x, t1), y1, lerp(ze, zr, t1)], [lerp(xa, ridge.x, t1), y1, lerp(ze, zr, t1)]], tileColor(i));
    }
  }
  const s = bd.sx;
  bar(bd.mesh, [s * ridge.x, ridge.y + 0.06, ridge.za], [s * ridge.x, ridge.y + 0.06, ridge.zb], 0.22, 0.16, C.tileDark);
  for (const [xc, zc, zr] of [[xa, za, ridge.za], [xb, za, ridge.za], [xa, zb, ridge.zb], [xb, zb, ridge.zb]] as const) bar(bd.mesh, [s * xc, eaves + 0.05, zc], [s * ridge.x, ridge.y + 0.06, zr], 0.16, 0.12, C.tileDark);
  // Génoise sous l'avant-toit.
  b(bd, xa + 0.1, xb - 0.1, eaves - 0.3, eaves, za + 0.1, zb - 0.1, C.cream);
}

/** Grande gare de départ : façade ocre de 26 m, pilastres, arcades, pavillon central à horloge, marquise sur le quai. */
function terminal(bd: Builder, length: number): void {
  const wallX = PLATFORM.edge + 6.2;
  const depth = 9;
  const half = 13;
  const h = 5.4;
  const back = wallX + depth;
  // Soubassement de pierre, murs, bandeau, corniche.
  b(bd, wallX, back, PLATFORM.height - 0.1, PLATFORM.height + 0.7, -half, half, C.stoneDark);
  b(bd, wallX + 0.05, back - 0.05, PLATFORM.height + 0.7, h, -half + 0.05, half - 0.05, C.ochre);
  b(bd, wallX - 0.08, back + 0.08, h - 0.45, h - 0.25, -half - 0.08, half + 0.08, C.cream);
  // Pilastres et arcades côté quai.
  const bays = 8;
  for (let i = 0; i <= bays; i += 1) {
    const z = -half + (2 * half * i) / bays;
    b(bd, wallX - 0.14, wallX + 0.05, PLATFORM.height + 0.7, h - 0.45, z - 0.28, z + 0.28, C.cream);
  }
  for (let i = 0; i < bays; i += 1) {
    const zc = -half + (2 * half * (i + 0.5)) / bays;
    const door = i === 3 || i === 4;
    archedOpening(bd, wallX, zc, door ? PLATFORM.height + 0.02 : PLATFORM.height + 1.2, door ? 1.7 : 1.4, door ? 3.3 : 2.6, door ? C.woodDark : C.glass, C.white);
  }
  // Pavillon central plus haut, fronton, horloge.
  const pz = 4.2;
  b(bd, wallX - 0.6, back + 0.3, PLATFORM.height + 0.7, h + 2.2, -pz, pz, C.ochreDark);
  b(bd, wallX - 0.7, wallX - 0.55, PLATFORM.height + 0.7, h + 2.2, -pz, -pz + 0.5, C.cream);
  b(bd, wallX - 0.7, wallX - 0.55, PLATFORM.height + 0.7, h + 2.2, pz - 0.5, pz, C.cream);
  b(bd, wallX - 0.75, back + 0.35, h + 1.9, h + 2.2, -pz - 0.15, pz + 0.15, C.cream);
  archedOpening(bd, wallX - 0.6, 0, PLATFORM.height + 0.02, 2.6, 4.2, C.woodDark, C.white);
  const pediment: [number, number, number][] = [[wallX - 0.75, h + 2.2, -pz - 0.2], [wallX - 0.75, h + 2.2, pz + 0.2], [wallX - 0.75, h + 3.6, 0], [wallX - 0.75, h + 3.6, 0]];
  quad(bd, pediment, C.ochre);
  bar(bd.mesh, [bd.sx * (wallX - 0.8), h + 2.25, -pz - 0.25], [bd.sx * (wallX - 0.8), h + 3.65, 0], 0.2, 0.22, C.cream);
  bar(bd.mesh, [bd.sx * (wallX - 0.8), h + 2.25, pz + 0.25], [bd.sx * (wallX - 0.8), h + 3.65, 0], 0.2, 0.22, C.cream);
  const clockX = bd.sx * (wallX - 0.82);
  disc(bd.mesh, 0.72, 0.1, 28, C.cream, [clockX, h + 1.25, 0]);
  disc(bd.mesh, 0.6, 0.12, 28, C.white, [clockX - bd.sx * 0.01, h + 1.25, 0]);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    bar(bd.mesh, [clockX - bd.sx * 0.08, h + 1.25 + Math.cos(a) * 0.5, Math.sin(a) * 0.5], [clockX - bd.sx * 0.08, h + 1.25 + Math.cos(a) * 0.56, Math.sin(a) * 0.56], 0.02, 0.05, C.black, [1, 0, 0]);
  }
  bar(bd.mesh, [clockX - bd.sx * 0.09, h + 1.25, 0], [clockX - bd.sx * 0.09, h + 1.62, 0.05], 0.02, 0.05, C.black, [1, 0, 0]);
  bar(bd.mesh, [clockX - bd.sx * 0.1, h + 1.25, 0], [clockX - bd.sx * 0.1, h + 1.32, 0.3], 0.02, 0.06, C.black, [1, 0, 0]);
  ringOn(bd, clockX, h + 1.25, 0.72);
  // Toits : grand toit à croupes, toit du pavillon, cheminées.
  hipRoof(bd, wallX, back, -half, half, h, 2.4);
  hipRoof(bd, wallX - 0.6, back + 0.3, -pz, pz, h + 2.2, 1.6);
  for (const z of [-9, 9]) {
    b(bd, back - 3, back - 2.3, h + 1.2, h + 3.2, z - 0.35, z + 0.35, C.ochreDark);
    b(bd, back - 3.08, back - 2.22, h + 3.2, h + 3.38, z - 0.43, z + 0.43, C.cream);
  }
  // Marquise sur le quai : colonnes de fonte vertes, consoles, toit en pente, lambrequin festonné rouge et blanc.
  canopy(bd, PLATFORM.edge + 0.9, wallX, Math.min(length / 2 - 4, 22), 4.6, 4.05, C.green);
  // Bancs, réverbères et caisses de mangues prêtes à charger.
  for (const z of [-17, -9, 9, 17]) bench(bd, wallX - 0.8, z);
  for (const z of [-24, 24]) lampPost(bd, PLATFORM.edge + 1.2, z);
  for (let i = 0; i < 6; i += 1) {
    const crate = mangoCrate(i + 3);
    place(bd.mesh, crate, { x: bd.sx * (PLATFORM.edge + 2.6 + (i % 2) * 1.1), y: PLATFORM.height + (i >= 4 ? 0.62 : 0), z: -28 + Math.floor(i / 2) * 1.65 - (i >= 4 ? 2.4 : 0), yaw: 0 });
  }
}

function ringOn(bd: Builder, x: number, y: number, r: number): void {
  const steps = 28;
  for (let i = 0; i < steps; i += 1) {
    const a0 = (i / steps) * Math.PI * 2;
    const a1 = ((i + 1) / steps) * Math.PI * 2;
    bar(bd.mesh, [x - bd.sx * 0.06, y + Math.cos(a0) * r, Math.sin(a0) * r], [x - bd.sx * 0.06, y + Math.cos(a1) * r, Math.sin(a1) * r], 0.06, 0.08, C.goldDark, [1, 0, 0]);
  }
}

function canopy(bd: Builder, outer: number, inner: number, half: number, high: number, low: number, posts: Color): void {
  const s = bd.sx;
  for (let z = -half; z <= half + 0.01; z += 5) {
    const x = outer + 1.2;
    cylinder(bd.mesh, 0.13, 0.1, low - 0.05, 10, posts, { x: s * x, y: PLATFORM.height, z });
    cylinder(bd.mesh, 0.22, 0.2, 0.25, 10, posts, { x: s * x, y: PLATFORM.height, z });
    cylinder(bd.mesh, 0.18, 0.12, 0.22, 10, C.gold, { x: s * x, y: PLATFORM.height + low - 0.4, z });
    bar(bd.mesh, [s * x, PLATFORM.height + low - 0.9, z], [s * (x - 1.0), PLATFORM.height + low - 0.05, z], 0.07, 0.1, posts);
    bar(bd.mesh, [s * x, PLATFORM.height + low - 0.9, z], [s * (x + 1.6), PLATFORM.height + low + 0.12, z], 0.07, 0.1, posts);
  }
  // Toit : rangs de tôle ondulée claire, pente vers la voie.
  const rows = 6;
  for (let i = 0; i < rows; i += 1) {
    const x0 = outer + ((inner - outer) * i) / rows;
    const x1 = outer + ((inner - outer) * (i + 1)) / rows;
    const y0 = PLATFORM.height + low + ((high - low) * i) / rows;
    const y1 = PLATFORM.height + low + ((high - low) * (i + 1)) / rows;
    quad(bd, [[x0, y0, -half - 1], [x0, y0, half + 1], [x1, y1, half + 1], [x1, y1, -half - 1]], i % 2 === 0 ? C.tile : C.tileDark);
  }
  // Lambrequin festonné.
  const teeth = Math.round((2 * half + 2) / 0.4);
  for (let i = 0; i < teeth; i += 1) {
    const z0 = -half - 1 + i * 0.4;
    const y = PLATFORM.height + low;
    addShape(bd.mesh, [[s * outer, y, z0], [s * outer, y, z0 + 0.4], [s * outer, y - 0.42, z0 + 0.2]], [0, 1, 2], i % 2 === 0 ? C.white : C.green);
  }
  bar(bd.mesh, [s * outer, PLATFORM.height + low + 0.02, -half - 1], [s * outer, PLATFORM.height + low + 0.02, half + 1], 0.08, 0.12, C.white);
}

function bench(bd: Builder, x: number, z: number): void {
  b(bd, x - 0.25, x + 0.25, PLATFORM.height + 0.42, PLATFORM.height + 0.5, z - 0.9, z + 0.9, C.woodLight);
  b(bd, x + 0.18, x + 0.25, PLATFORM.height + 0.5, PLATFORM.height + 0.95, z - 0.9, z + 0.9, C.woodLight);
  for (const dz of [-0.75, 0.75]) b(bd, x - 0.22, x + 0.22, PLATFORM.height, PLATFORM.height + 0.42, z + dz - 0.04, z + dz + 0.04, C.iron);
}

/**
 * Réverbère de quai, le même dans toutes les gares (identité de la ligne) : socle mouluré, fût cannelé vert, crosse,
 * lanterne à quatre vitres sous un chapeau pointu.
 */
function lampPost(bd: Builder, x: number, z: number): void {
  const s = bd.sx;
  const y = PLATFORM.height;
  cylinder(bd.mesh, 0.2, 0.16, 0.45, 10, C.green, { x: s * x, y, z });
  cylinder(bd.mesh, 0.13, 0.13, 0.08, 10, C.gold, { x: s * x, y: y + 0.45, z });
  cylinder(bd.mesh, 0.09, 0.06, 3.2, 8, C.green, { x: s * x, y: y + 0.5, z });
  cylinder(bd.mesh, 0.1, 0.1, 0.06, 8, C.gold, { x: s * x, y: y + 3.4, z });
  // Crosse et volute.
  bar(bd.mesh, [s * x, y + 3.55, z], [s * (x - 0.62), y + 3.62, z], 0.05, 0.05, C.green);
  bar(bd.mesh, [s * x, y + 3.25, z], [s * (x - 0.35), y + 3.58, z], 0.03, 0.03, C.green);
  // Lanterne : montants, vitres lumineuses, chapeau et fleuron.
  const lx = s * (x - 0.62);
  box(bd.mesh, 0.22, 0.05, 0.22, C.green, { x: lx, y: y + 3.02, z });
  box(bd.mesh, 0.26, 0.36, 0.26, C.lamp, { x: lx, y: y + 3.07, z });
  for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [0.13, 0.13], [-0.13, 0.13]]) box(bd.mesh, 0.03, 0.38, 0.03, C.green, { x: lx + dx, y: y + 3.06, z: z + dz });
  cylinder(bd.mesh, 0.24, 0.02, 0.22, 4, C.green, { x: lx, y: y + 3.43, z });
  cylinder(bd.mesh, 0.03, 0.03, 0.1, 6, C.gold, { x: lx, y: y + 3.64, z });
}

/** Horloge de quai sur colonne, à double cadran (on la lit des deux côtés), comme celle de la grande gare. */
function pillarClock(bd: Builder, x: number, z: number): void {
  const s = bd.sx;
  const y = PLATFORM.height;
  cylinder(bd.mesh, 0.22, 0.18, 0.4, 10, C.green, { x: s * x, y, z });
  cylinder(bd.mesh, 0.08, 0.08, 2.6, 8, C.green, { x: s * x, y: y + 0.4, z });
  const cy = y + 3.35;
  for (const side of [-1, 1]) {
    disc(bd.mesh, 0.42, 0.06, 24, C.goldDark, [s * x, cy, z + side * 0.06], "z");
    disc(bd.mesh, 0.36, 0.02, 24, C.cream, [s * x, cy, z + side * 0.1], "z");
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      bar(bd.mesh, [s * x + Math.sin(a) * 0.29, cy + Math.cos(a) * 0.29, z + side * 0.115], [s * x + Math.sin(a) * 0.33, cy + Math.cos(a) * 0.33, z + side * 0.115], 0.02, 0.012, C.black, [0, 0, 1]);
    }
    bar(bd.mesh, [s * x, cy, z + side * 0.12], [s * x + 0.04, cy + 0.24, z + side * 0.12], 0.025, 0.012, C.black, [0, 0, 1]);
    bar(bd.mesh, [s * x, cy, z + side * 0.125], [s * x + 0.16, cy - 0.06, z + side * 0.125], 0.03, 0.012, C.black, [0, 0, 1]);
  }
  cylinder(bd.mesh, 0.12, 0.02, 0.25, 8, C.goldDark, { x: s * x, y: cy + 0.42, z });
}

/** Petite gare de village : murs blancs, volets bleus, toit de tuiles, petite marquise. */
function villageStation(bd: Builder): void {
  const wallX = PLATFORM.edge + 4.6;
  const depth = 7;
  const half = 7.5;
  const h = 4.4;
  const back = wallX + depth;
  b(bd, wallX, back, PLATFORM.height - 0.1, PLATFORM.height + 0.5, -half, half, C.stoneDark);
  b(bd, wallX + 0.05, back - 0.05, PLATFORM.height + 0.5, h, -half + 0.05, half - 0.05, C.white);
  for (let i = 0; i < 5; i += 1) {
    const zc = -half + 1.5 + i * 3;
    const door = i === 2;
    archedOpening(bd, wallX, zc, door ? PLATFORM.height + 0.02 : PLATFORM.height + 1.1, door ? 1.5 : 1.1, door ? 2.8 : 2.0, door ? C.shutter : C.glass, C.ochre);
    if (!door) for (const dz of [-0.95, 0.95]) b(bd, wallX - 0.08, wallX - 0.02, PLATFORM.height + 1.1, PLATFORM.height + 2.7, zc + dz - 0.28, zc + dz + 0.28, C.shutter);
  }
  hipRoof(bd, wallX, back, -half, half, h, 2.0);
  canopy(bd, PLATFORM.edge + 0.9, wallX, 6, 3.9, 3.5, C.shutter);
  for (const z of [-5, 5]) bench(bd, wallX - 0.7, z);
  for (const z of [-30, 0, 30]) lampPost(bd, PLATFORM.edge + 1.2, z);
  pillarClock(bd, PLATFORM.edge + 2.3, -12);
}

/**
 * Abri de la halte du col : soubassement de pierre, ossature de bois peinte, paroi arrière de planches à fenêtre,
 * joues vitrées, toit à croupes de tuiles prolongé d'un auvent à lambrequin festonné ; banc, horloge et réverbères aux
 * couleurs de la ligne.
 */
function shelter(bd: Builder): void {
  const x0 = PLATFORM.edge + 2.2;
  const x1 = x0 + 3.0;
  const half = 4.2;
  const y = PLATFORM.height;
  const eaves = y + 3.0;
  b(bd, x0 - 0.1, x1 + 0.1, y, y + 0.45, -half - 0.1, half + 0.1, C.stoneDark);
  for (const z of [-half, -half / 3, half / 3, half]) for (const x of [x0, x1]) b(bd, x - 0.09, x + 0.09, y + 0.45, eaves, z - 0.09, z + 0.09, C.green);
  // Paroi arrière : planches alternées et une fenêtre à croisillons.
  for (let i = 0; i < 8; i += 1) {
    const yy = y + 0.45 + i * 0.32;
    b(bd, x1 - 0.04, x1 + 0.04, yy, yy + 0.3, -half, half, i % 2 === 0 ? C.wood : C.woodLight);
  }
  b(bd, x1 - 0.07, x1 - 0.03, y + 1.4, y + 2.4, -1.0, 1.0, C.glass);
  b(bd, x1 - 0.09, x1 - 0.05, y + 1.86, y + 1.94, -1.0, 1.0, C.white);
  b(bd, x1 - 0.09, x1 - 0.05, y + 1.4, y + 2.4, -0.04, 0.04, C.white);
  // Joues vitrées.
  for (const z of [-half, half]) {
    b(bd, x0 + 0.1, x1 - 0.1, y + 0.45, y + 1.2, z - 0.03, z + 0.03, C.woodDark);
    b(bd, x0 + 0.1, x1 - 0.1, y + 1.2, eaves - 0.2, z - 0.02, z + 0.02, C.glass);
  }
  hipRoof(bd, x0 - 0.3, x1 + 0.4, -half - 0.4, half + 0.4, eaves, 1.5);
  // Auvent vers la voie, et son lambrequin.
  canopy(bd, PLATFORM.edge + 0.9, x0 - 0.3, half, 2.95, 2.6, C.green);
  bench(bd, x1 - 0.5, -1.6);
  bench(bd, x1 - 0.5, 1.6);
  pillarClock(bd, PLATFORM.edge + 1.6, 9);
  for (const z of [-22, 22]) lampPost(bd, PLATFORM.edge + 1.2, z);
}

export interface StationPlacement {
  /** Point d'ancrage (axe de la voie au milieu du quai), cap de la voie. */
  x: number;
  y: number;
  z: number;
  heading: number;
}

export function stationPlacement(track: Track, station: StationStop): StationPlacement {
  const p = track.pointAt((station.from + station.to) / 2);
  return { x: p.x, y: p.y, z: p.z, heading: p.heading };
}

/** Quai et bâtiment d'une gare, dans le repère du monde. */
export function stationMesh(track: Track, station: StationStop, platformWidth: number): MeshData {
  const local: Builder = { mesh: emptyMesh(), sx: station.side === "right" ? 1 : -1 };
  const length = station.to - station.from;
  platform(local, length, platformWidth);
  if (station.building === "terminal") terminal(local, length);
  else if (station.building === "village") villageStation(local);
  else if (station.building === "shelter") shelter(local);
  const mesh = emptyMesh();
  const at = stationPlacement(track, station);
  place(mesh, local.mesh, { x: at.x, y: at.y, z: at.z, yaw: at.heading });
  return mesh;
}

/** Quai central entre les voies 1 et 2 du village : dallé, marquise à colonnes centrales, bancs. */
export function islandPlatform(track: Track, station: StationStop, spacing: number): MeshData {
  const local: Builder = { mesh: emptyMesh(), sx: 1 };
  const length = station.to - station.from;
  const width = spacing - 2 * PLATFORM.edge;
  platform(local, length, width);
  // Mur de quai côté voie 2.
  b(local, PLATFORM.edge + width - 0.45, PLATFORM.edge + width, PLATFORM.height - 0.12, PLATFORM.height, -length / 2, length / 2, C.stoneLight);
  b(local, PLATFORM.edge + width - 0.74, PLATFORM.edge + width - 0.62, PLATFORM.height, PLATFORM.height + 0.006, -length / 2, length / 2, C.safety);
  const mid = PLATFORM.edge + width / 2;
  for (let z = -20; z <= 20.01; z += 5) {
    cylinder(local.mesh, 0.13, 0.1, 3.6, 10, C.shutter, { x: mid, y: PLATFORM.height, z });
  }
  for (let i = 0; i < 4; i += 1) {
    const x0 = mid - 2.6 + i * 1.3;
    quad(local, [[x0, PLATFORM.height + 3.6 + (i < 2 ? i : 3 - i) * 0.15, -22], [x0, PLATFORM.height + 3.6 + (i < 2 ? i : 3 - i) * 0.15, 22], [x0 + 1.3, PLATFORM.height + 3.6 + (i < 2 ? i + 1 : 2 - i) * 0.15, 22], [x0 + 1.3, PLATFORM.height + 3.6 + (i < 2 ? i + 1 : 2 - i) * 0.15, -22]], i % 2 === 0 ? C.tile : C.tileDark);
  }
  for (const z of [-12, 0, 12]) bench(local, mid - 0.2, z);
  for (let i = 0; i < 4; i += 1) {
    place(local.mesh, mangoCrate(i + 9), { x: mid + (i % 2) * 1.05 - 0.5, y: PLATFORM.height, z: 28 + Math.floor(i / 2) * 1.6, yaw: 0 });
  }
  const mesh = emptyMesh();
  const at = stationPlacement(track, station);
  // Le quai central est à droite de la voie 1 : repère de la voie 1, côté droit.
  place(mesh, local.mesh, { x: at.x, y: at.y, z: at.z, yaw: at.heading });
  return mesh;
}

/** Tableau d'arrêt « STOP » au bout du repère d'arrêt (poteau et plaque ; le texte est posé par la scène). */
export function stopBoard(): MeshData {
  const mesh = emptyMesh();
  rod(mesh, [0, 0, 0], [0, 2.2, 0], 0.05, C.steelDark);
  box(mesh, 0.6, 0.6, 0.06, C.white, { y: 2.0 });
  box(mesh, 0.52, 0.52, 0.07, C.red, { y: 2.04 });
  return mesh;
}

