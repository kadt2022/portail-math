import { addShape, emptyMesh, mixColor, type Color, type MeshData } from "../kit";
import { barkTube, leaf, spline, type TreePalette, type Vec3 } from "./stylizedTree";

// Sous-bois de la forêt : arbustes, plantes à larges feuilles et touffes d'herbe. Ils sont faits des mêmes feuilles
// et de la même écorce que l'arbre stylisé, et utilisent ses palettes. Ils comblent les vides entre les troncs, à
// hauteur des yeux du joueur. Aucune texture.
//
// Écrit pour Yamba.

type Rng = () => number;

export type UndergrowthKind = "shrub" | "fern" | "grass";

/**
 * Arbuste d'environ 1,6 m : trois ou quatre tiges courtes portant des grappes de feuilles pointues. En version
 * allégée (au-delà de 25 m), des feuilles simples, moins nombreuses et plus grandes.
 */
export function shrub(rng: Rng, palette: TreePalette, light = false): MeshData {
  const mesh = emptyMesh();
  const clusters = light ? 3 : 4;
  for (let c = 0; c < clusters; c += 1) {
    const a = (c / clusters) * Math.PI * 2 + rng() * 0.6;
    const spread = c === 0 ? 0.1 : 0.45 + rng() * 0.25;
    const top: Vec3 = [Math.cos(a) * spread, 0.85 + rng() * 0.45 + (c === 0 ? 0.25 : 0), Math.sin(a) * spread];
    if (!light) barkTube(mesh, palette, spline([[0, -0.05, 0], [top[0] * 0.5, top[1] * 0.45, top[2] * 0.5], [top[0], top[1] - 0.25, top[2]]], 3), (t) => 0.05 * (1 - t * 0.6), 3, 70 + c, 0.3, 2);
    const count = light ? 5 : 11;
    for (let i = 0; i < count; i += 1) {
      const y = 1 - ((i + 0.5) / count) * 1.5;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const la = i * 2.39996 + rng() * 0.4;
      const n: Vec3 = [Math.cos(la) * ring, y, Math.sin(la) * ring];
      const r = 0.42;
      const at: Vec3 = [top[0] + n[0] * r * 0.6, top[1] + n[1] * r * 0.5, top[2] + n[2] * r * 0.6];
      const lightness = Math.min(1, Math.max(0, 0.45 + n[1] * 0.4 + (rng() - 0.5) * 0.25));
      const color = lightness > 0.55 ? mixColor(palette.leaf, palette.leafBright, (lightness - 0.55) / 0.45) : mixColor(palette.leafDeep, palette.leaf, lightness / 0.55);
      leaf(mesh, palette, at, [n[0] + (rng() - 0.5) * 0.4, 0, n[2] + (rng() - 0.5) * 0.4], (light ? 0.95 : 0.62) * (0.85 + rng() * 0.3), 0.15 + (1 - n[1]) * 0.45, color, light);
    }
  }
  return mesh;
}

/** Plante à larges feuilles (bananier nain, fougère) : sept à neuf grandes feuilles arquées autour du pied. */
export function fern(rng: Rng, palette: TreePalette): MeshData {
  const mesh = emptyMesh();
  const fronds = 7 + Math.floor(rng() * 3);
  for (let i = 0; i < fronds; i += 1) {
    const a = (i / fronds) * Math.PI * 2 + rng() * 0.5;
    const lift = 0.15 + rng() * 0.35;
    const color = mixColor(palette.leafDeep, palette.leafBright, 0.35 + rng() * 0.4);
    // Une feuille longue posée haut, retombant vers l'extérieur : l'arche est faite de deux feuilles bout à bout.
    const base: Vec3 = [Math.cos(a) * 0.08, lift, Math.sin(a) * 0.08];
    const out: Vec3 = [Math.cos(a), 0, Math.sin(a)];
    leaf(mesh, palette, base, out, 0.75 + rng() * 0.25, -0.55 - rng() * 0.25, color, false);
    const mid: Vec3 = [Math.cos(a) * 0.6, lift + 0.42, Math.sin(a) * 0.6];
    leaf(mesh, palette, mid, out, 0.65 + rng() * 0.2, 0.35 + rng() * 0.25, mixColor(color, palette.leafBright, 0.15), false);
  }
  return mesh;
}

/** Touffe d'herbes hautes : neuf brins fins, un peu courbés, plus clairs au bout. */
export function grassTuft(rng: Rng, palette: TreePalette): MeshData {
  const mesh = emptyMesh();
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const triangles: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = rng() * 0.25;
    const h = 0.45 + rng() * 0.45;
    const bend = 0.15 + rng() * 0.25;
    const side: Vec3 = [-Math.sin(a) * 0.045, 0, Math.cos(a) * 0.045];
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const base = vertices.length;
    vertices.push([x - side[0], 0, z - side[2]], [x + side[0], 0, z + side[2]], [x + Math.cos(a) * bend * 0.4, h * 0.6, z + Math.sin(a) * bend * 0.4], [x + Math.cos(a) * bend, h, z + Math.sin(a) * bend]);
    const dark = mixColor(palette.leafDeep, palette.leaf, 0.3);
    colors.push(dark, dark, palette.leaf, mixColor(palette.leaf, palette.leafBright, 0.6));
    triangles.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  addShape(mesh, vertices, triangles, colors);
  return mesh;
}
