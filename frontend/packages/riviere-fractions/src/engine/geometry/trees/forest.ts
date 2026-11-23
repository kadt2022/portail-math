import type { Color, MeshData } from "../kit";
import { mixColor } from "../kit";
import { valueNoise } from "../noise";
import { TREE_PALETTE, type TreePalette } from "./stylizedTree";
import type { UndergrowthKind } from "./undergrowth";

// Forêt traversée par la rivière, faite d'un seul arbre (l'arbre stylisé validé) et d'un sous-bois tiré des mêmes
// feuilles. Ce fichier ne fait que des calculs : où pousse chaque plante, à quelle taille, de quelle couleur, et la
// teinte du sol sous la canopée. La scène dessine.
//
// Composition :
// - trois étages d'arbres : la canopée (grands arbres, vers l'intérieur des terres), l'étage moyen, et de jeunes arbres
//   qui se glissent sous les couronnes ;
// - massifs très denses, zones moyennes et clairières, dessinés par un bruit lent ;
// - couleurs mêlées arbre par arbre ; deux champs de couleur très doux (clair ou sombre, chaud ou froid) font
//   seulement pencher la balance d'un endroit à l'autre, sans former de groupes d'une seule teinte ;
// - abords des portiques dégagés : rien ne masque les panneaux, rien ne gêne la navigation.
//
// Écrit pour Yamba.

type Rng = () => number;

interface PaletteEntry {
  name: string;
  weight: number;
  /** Penchant pour les endroits clairs (+1) ou sombres (-1), chauds (+1) ou froids (-1). */
  light: number;
  warm: number;
  palette: TreePalette;
}

/** Les teintes de feuillage : le même arbre, d'autres verts, et quelques touches dorées et cuivrées. */
export const FOREST_PALETTES: readonly PaletteEntry[] = [
  {
    name: "vert profond",
    weight: 0.17,
    light: -1,
    warm: 0,
    palette: { ...TREE_PALETTE, barkDark: [0.27, 0.17, 0.1], bark: [0.47, 0.3, 0.17], leafDeep: [0.05, 0.25, 0.08], leaf: [0.13, 0.4, 0.12], leafBright: [0.36, 0.6, 0.18] },
  },
  { name: "vert forêt", weight: 0.21, light: 0, warm: 0, palette: TREE_PALETTE },
  {
    name: "vert émeraude",
    weight: 0.15,
    light: 0,
    warm: -1,
    palette: { ...TREE_PALETTE, barkGrey: [0.5, 0.45, 0.4], moss: [0.3, 0.52, 0.2], leafDeep: [0.04, 0.33, 0.17], leaf: [0.11, 0.53, 0.27], leafBright: [0.42, 0.8, 0.42] },
  },
  {
    name: "vert clair",
    weight: 0.12,
    light: 1,
    warm: 0,
    palette: { ...TREE_PALETTE, leafDeep: [0.17, 0.45, 0.12], leaf: [0.37, 0.69, 0.2], leafBright: [0.7, 0.9, 0.36] },
  },
  {
    name: "vert jaune lumineux",
    weight: 0.08,
    light: 1,
    warm: 0.6,
    palette: { ...TREE_PALETTE, barkWarm: [0.68, 0.42, 0.2], leafDeep: [0.28, 0.48, 0.07], leaf: [0.56, 0.76, 0.12], leafBright: [0.88, 0.94, 0.3] },
  },
  {
    name: "vert olive",
    weight: 0.12,
    light: -0.4,
    warm: 0.4,
    palette: { ...TREE_PALETTE, barkGrey: [0.5, 0.46, 0.38], bark: [0.5, 0.34, 0.2], leafDeep: [0.2, 0.26, 0.08], leaf: [0.4, 0.46, 0.16], leafBright: [0.66, 0.68, 0.3] },
  },
  {
    name: "doré",
    weight: 0.035,
    light: 0.5,
    warm: 0.5,
    palette: { ...TREE_PALETTE, barkWarm: [0.7, 0.42, 0.18], leafDeep: [0.33, 0.35, 0.07], leaf: [0.7, 0.6, 0.14], leafBright: [0.95, 0.84, 0.32] },
  },
  {
    name: "cuivré",
    weight: 0.025,
    light: 0,
    warm: 0.5,
    palette: { ...TREE_PALETTE, bark: [0.58, 0.32, 0.16], barkWarm: [0.7, 0.38, 0.17], leafDeep: [0.3, 0.24, 0.07], leaf: [0.64, 0.42, 0.14], leafBright: [0.92, 0.68, 0.28] },
  },
];

/** Teintes du sous-bois (indices dans FOREST_PALETTES) : des verts, jamais d'or ni de cuivre. */
export const UNDERGROWTH_PALETTES: Readonly<Record<UndergrowthKind, readonly number[]>> = {
  shrub: [0, 1, 3],
  fern: [2, 1],
  grass: [1, 5],
};

/** Étage d'un arbre : canopée, étage moyen, jeune arbre sous les couronnes. */
export type ForestLayer = "canopy" | "middle" | "young";

export interface ForestTree {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Inclinaison : direction (x, z) vers laquelle le houppier penche, de longueur égale à l'angle (radians). */
  leanX: number;
  leanZ: number;
  /** Hauteur relative à l'arbre modèle (7,5 m), et largeur relative à cette hauteur. */
  scale: number;
  width: number;
  /** Indice dans FOREST_PALETTES. */
  palette: number;
  /** Légère variation de couleur propre à l'arbre (multiplie ses couleurs). */
  tint: Color;
  layer: ForestLayer;
  /** Distance au bord de l'eau (m) : les arbres de l'intérieur, cachés par le premier rang, passent plus tôt aux versions légères. */
  inland: number;
}

export interface UndergrowthPlant {
  kind: UndergrowthKind;
  /** Indice dans UNDERGROWTH_PALETTES[kind]. */
  variant: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  tint: Color;
}

/** Le terrain vu par la forêt : coordonnées de rivière (s, d) converties en monde, hauteur du sol, zones interdites. */
export interface ForestSite {
  /** Distance au bord de l'eau (m), ou null si l'endroit est interdit (eau, village, pont, hors du paysage). */
  edge(s: number, d: number): number | null;
  toWorld(s: number, d: number): { x: number; z: number };
  ground(s: number, d: number): number;
  heading(s: number): number;
  halfWidth(s: number): number;
  /** Abscisses des portiques : leurs abords restent dégagés. */
  gates: readonly number[];
  /**
   * Lignes de vue de la caméra du joueur vers les panneaux (points du monde) : aucune couronne ne doit les couper.
   */
  sightlines: readonly { from: readonly [number, number, number]; to: readonly [number, number, number] }[];
}

export interface ForestOptions {
  from: number;
  to: number;
  /** Distance maximale à l'axe de la rivière (m). */
  reach?: number;
  seed?: number;
}

export interface Forest {
  trees: ForestTree[];
  undergrowth: UndergrowthPlant[];
}

/** Rayon de couronne approximatif de l'arbre modèle à l'échelle 1 (m). */
export const CROWN_RADIUS = 3.1;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Grille de voisinage dans le monde, pour vérifier vite les écarts entre plantes. */
class SpatialGrid<T extends { x: number; z: number }> {
  private readonly cells = new Map<string, T[]>();
  constructor(private readonly size: number) {}
  add(item: T): void {
    const key = `${Math.floor(item.x / this.size)},${Math.floor(item.z / this.size)}`;
    const cell = this.cells.get(key);
    if (cell) cell.push(item);
    else this.cells.set(key, [item]);
  }
  near(x: number, z: number, radius: number): T[] {
    const out: T[] = [];
    const r = Math.ceil(radius / this.size);
    const cx = Math.floor(x / this.size);
    const cz = Math.floor(z / this.size);
    for (let i = -r; i <= r; i += 1) for (let j = -r; j <= r; j += 1) out.push(...(this.cells.get(`${cx + i},${cz + j}`) ?? []));
    return out;
  }
}

function tintFor(rng: Rng): Color {
  const v = 0.9 + rng() * 0.17;
  return [v * (0.97 + rng() * 0.06), v * (0.97 + rng() * 0.06), v * (0.96 + rng() * 0.06)];
}

/** Teinte d'un arbre : tirage pondéré, que les champs de couleur font pencher doucement selon l'endroit. */
function pickPalette(rng: Rng, x: number, z: number, seed: number): number {
  const light = (valueNoise(x * 0.022, z * 0.022, seed + 61) - 0.5) * 2;
  const warm = (valueNoise(x * 0.018 + 50, z * 0.018, seed + 67) - 0.5) * 2;
  const weights = FOREST_PALETTES.map((p) => p.weight * Math.exp(0.75 * (p.light * light + p.warm * warm)));
  let pick = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i += 1) {
    pick -= weights[i];
    if (pick <= 0) return i;
  }
  return 1;
}

/**
 * Plante la forêt entre les abscisses from et to, des deux côtés, du bord de l'eau jusqu'à `reach` mètres de l'axe.
 * Les arbres sont semés sur une grille irrégulière ; un bruit lent décide de la densité (massif, zone moyenne,
 * clairière) ; chaque arbre garde un écart à ses voisins proportionnel à leurs couronnes, plus petit entre étages
 * différents (un jeune arbre pousse sous un grand). Puis le sous-bois comble les vides entre les troncs.
 */
export function plantForest(site: ForestSite, rng: Rng, options: ForestOptions): Forest {
  const reach = options.reach ?? 72;
  const seed = options.seed ?? 5;
  const trees: (ForestTree & { crown: number; trunk: number })[] = [];
  const grid = new SpatialGrid<ForestTree & { crown: number; trunk: number }>(8);
  const nearGate = (s: number) => site.gates.some((gate) => s > gate - 34 && s < gate + 8);
  // Distance d'un point à un segment, au carré : une couronne qui touche une ligne de vue est refusée.
  const blocksSigns = (x: number, y: number, z: number, r: number) =>
    site.sightlines.some(({ from, to }) => {
      const ux = to[0] - from[0];
      const uy = to[1] - from[1];
      const uz = to[2] - from[2];
      const t = Math.max(0, Math.min(1, ((x - from[0]) * ux + (y - from[1]) * uy + (z - from[2]) * uz) / (ux * ux + uy * uy + uz * uz)));
      const dx = from[0] + ux * t - x;
      const dy = from[1] + uy * t - y;
      const dz = from[2] + uz * t - z;
      return dx * dx + dy * dy + dz * dz < r * r;
    });

  const tryTree = (s: number, d: number, side: number, layer: ForestLayer) => {
    const edge = site.edge(s, d);
    if (edge === null) return;
    const scale = layer === "canopy" ? 1.0 + rng() * 0.38 : layer === "middle" ? 0.68 + rng() * 0.28 : 0.42 + rng() * 0.2;
    const width = 0.84 + rng() * 0.34;
    const crown = CROWN_RADIUS * scale * width;
    // Au bord de l'eau, la couronne peut avancer au-dessus de la rivière, mais d'au plus deux mètres ; aux abords des
    // portiques, rien ne dépasse vers le chenal (les panneaux restent dégagés).
    const overhang = nearGate(s) ? -1.5 : 2;
    if (edge < 3 || crown - edge > overhang) return;
    const { x, z } = site.toWorld(s, d);
    const trunk = 0.9 * scale;
    for (const other of grid.near(x, z, crown + 6)) {
      const gap = Math.hypot(other.x - x, other.z - z);
      const sameLayer = (other.layer === "young") === (layer === "young");
      const need = sameLayer ? 0.58 * (other.crown + crown) : other.trunk + trunk + 0.6;
      if (gap < need) return;
    }
    const lean = nearGate(s) ? 0 : Math.max(0, 1 - edge / 8) * 0.1;
    // Couronne vue comme une sphère, du bas des masses (3,4 m) au sommet (7,8 m) de l'arbre modèle.
    const groundY = site.ground(s, d);
    const crownY = groundY + 5.6 * scale;
    const crownR = Math.max(crown, 2.2 * scale) * 0.95;
    if (blocksSigns(x, crownY, z, crownR)) return;
    const heading = site.heading(s);
    const tree: ForestTree & { crown: number; trunk: number } = {
      x,
      z,
      y: groundY - 0.1 * scale,
      yaw: rng() * Math.PI * 2,
      // Vers l'eau, c'est l'opposé de la droite de la rivière (cos h, -sin h) multipliée par le côté.
      leanX: -side * Math.cos(heading) * lean + (rng() - 0.5) * 0.07,
      leanZ: side * Math.sin(heading) * lean + (rng() - 0.5) * 0.07,
      scale,
      width,
      palette: pickPalette(rng, x, z, seed),
      tint: tintFor(rng),
      layer,
      inland: edge,
      crown,
      trunk,
    };
    grid.add(tree);
    trees.push(tree);
  };

  const step = 2.7;
  for (const side of [-1, 1] as const) {
    // Deux passes : la canopée et l'étage moyen d'abord, puis les jeunes arbres dans les vides.
    for (const pass of [0, 1]) {
      for (let s = options.from + 1; s < options.to - 1; s += step) {
        const width = site.halfWidth(s);
        for (let dd = width + 2.5; dd < reach; dd += step) {
          const ss = s + (rng() - 0.5) * step;
          const d = side * (dd + (rng() - 0.5) * step);
          const { x, z } = site.toWorld(ss, d);
          const edge = Math.abs(d) - site.halfWidth(ss);
          // Massifs, zones moyennes et clairières. Les clairières sont plus fréquentes près de l'eau (on voit la forêt
          // s'ouvrir sur la rive) que dans l'intérieur des terres (la canopée se referme).
          const field = valueNoise(x * 0.028, z * 0.028, seed + 41) * 0.75 + valueNoise(x * 0.09, z * 0.09, seed + 43) * 0.25;
          const clearing = 0.3 - smooth(8, 30, edge) * 0.12;
          const density = field < clearing ? 0 : field < clearing + 0.14 ? 0.4 : 0.95;
          if (rng() > density) continue;
          if (pass === 0) {
            const canopy = 0.2 + smooth(5, 24, edge) * 0.65;
            tryTree(ss, d, side, rng() < canopy ? "canopy" : "middle");
          } else if (edge < 22 && rng() < 0.6) {
            // Les jeunes arbres seulement là où on les voit depuis la rivière : plus loin, la canopée les cache.
            tryTree(ss, d, side, "young");
          }
        }
      }
    }
  }

  // Sous-bois : herbes au bord de l'eau, plantes à larges feuilles et arbustes entre les troncs, jusqu'à 30 m de la
  // rive (plus loin, la canopée le cache). Aux abords des portiques, seulement des herbes basses.
  const undergrowth: UndergrowthPlant[] = [];
  const cell = 1.9;
  for (const side of [-1, 1] as const) {
    for (let s = options.from + 1; s < options.to - 1; s += cell) {
      for (let e = 0.9; e < 30; e += cell) {
        const ss = s + (rng() - 0.5) * cell;
        const d = side * (site.halfWidth(ss) + e + (rng() - 0.5) * cell);
        const edge = site.edge(ss, d);
        if (edge === null || edge < 0.7) continue;
        const { x, z } = site.toWorld(ss, d);
        const field = valueNoise(x * 0.05, z * 0.05, seed + 71);
        if (rng() > 0.25 + field * 0.6) continue;
        if (grid.near(x, z, 3).some((tree) => Math.hypot(tree.x - x, tree.z - z) < tree.trunk + 0.5)) continue;
        const roll = rng();
        let kind: UndergrowthKind;
        if (nearGate(ss) || edge < 2.2) kind = roll < 0.75 ? "grass" : "fern";
        else if (edge < 5) kind = roll < 0.45 ? "grass" : roll < 0.75 ? "fern" : "shrub";
        else kind = roll < 0.2 ? "grass" : roll < 0.55 ? "fern" : "shrub";
        if (kind === "shrub" && nearGate(ss) && edge < 8) continue;
        const variants = UNDERGROWTH_PALETTES[kind];
        undergrowth.push({
          kind,
          variant: Math.floor(rng() * variants.length),
          x,
          z,
          y: site.ground(ss, d) - 0.05,
          yaw: rng() * Math.PI * 2,
          scale: kind === "shrub" ? 0.8 + rng() * 0.6 : kind === "fern" ? 0.8 + rng() * 0.7 : 0.8 + rng() * 0.5,
          tint: tintFor(rng),
        });
      }
    }
  }
  // Les rayons de couronne et de tronc ne servaient qu'aux écarts : on rend des arbres sans eux.
  const publicTrees: ForestTree[] = trees.map((tree) => {
    const copy: Partial<typeof tree> = { ...tree };
    delete copy.crown;
    delete copy.trunk;
    return copy as ForestTree;
  });
  return { trees: publicTrees, undergrowth };
}

/** Couleur du sol sous la canopée : humus et mousse. */
const FLOOR: Color = [0.17, 0.27, 0.1];
const FLOOR_EARTH: Color = [0.3, 0.26, 0.15];

/**
 * Assombrit le sol sous les couronnes : sous une canopée serrée, la pelouse laisse place à un sol de sous-bois
 * (mousse, humus), et la lisière reste plus claire. Modifie les couleurs du maillage, pas sa forme.
 */
export function shadeForestFloor(mesh: MeshData, trees: readonly ForestTree[]): void {
  if (trees.length === 0) return;
  const grid = new SpatialGrid<ForestTree>(8);
  for (const tree of trees) grid.add(tree);
  for (let v = 0; v < mesh.positions.length / 3; v += 1) {
    const x = mesh.positions[v * 3];
    const z = mesh.positions[v * 3 + 2];
    let cover = 0;
    for (const tree of grid.near(x, z, 6)) {
      const crown = CROWN_RADIUS * tree.scale * tree.width * 1.15;
      const t = Math.hypot(tree.x - x, tree.z - z) / crown;
      if (t < 1) cover += 1 - t * t;
    }
    if (cover <= 0) continue;
    const amount = Math.min(0.78, cover * 0.55);
    const floor = mixColor(FLOOR, FLOOR_EARTH, valueNoise(x * 0.3, z * 0.3, 83) * 0.6);
    for (let c = 0; c < 3; c += 1) mesh.colors[v * 4 + c] = mesh.colors[v * 4 + c] * (1 - amount) + floor[c] * amount;
  }
}

/**
 * Matrice de placement, au format des matrices de Babylon.js (vecteurs lignes, translation en 12-14) : échelle (la
 * largeur sur x et z, la hauteur sur y), rotation autour de la verticale, inclinaison dans le monde (formule de
 * Rodrigues), puis position.
 */
export function plantMatrix(p: { x: number; y: number; z: number; yaw: number; scale: number; width?: number; leanX?: number; leanZ?: number }, out: Float32Array = new Float32Array(16), offset = 0): Float32Array {
  const leanX = p.leanX ?? 0;
  const leanZ = p.leanZ ?? 0;
  const angle = Math.hypot(leanX, leanZ);
  const kx = angle > 0 ? leanZ / angle : 0;
  const kz = angle > 0 ? -leanX / angle : 0;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  // Rotation autour de l'axe horizontal k = (kx, 0, kz) : le haut (0, 1, 0) part vers (leanX, ·, leanZ).
  const tilt = (x: number, y: number, z: number): [number, number, number] => {
    const kv = kx * x + kz * z;
    return [x * c + -kz * y * sn + kx * kv * (1 - c), y * c + (kz * x - kx * z) * sn, z * c + kx * y * sn + kz * kv * (1 - c)];
  };
  const cy = Math.cos(p.yaw);
  const sy = Math.sin(p.yaw);
  const across = p.scale * (p.width ?? 1);
  const rows: [[number, number, number], number][] = [[tilt(cy, 0, -sy), across], [tilt(0, 1, 0), p.scale], [tilt(sy, 0, cy), across]];
  rows.forEach(([row, k], r) => {
    out[offset + r * 4] = row[0] * k;
    out[offset + r * 4 + 1] = row[1] * k;
    out[offset + r * 4 + 2] = row[2] * k;
    out[offset + r * 4 + 3] = 0;
  });
  out[offset + 12] = p.x;
  out[offset + 13] = p.y;
  out[offset + 14] = p.z;
  out[offset + 15] = 1;
  return out;
}
