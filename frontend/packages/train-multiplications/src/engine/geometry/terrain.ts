import { isBridge, type Network } from "../../domain/network";
import { GALLERY, TUNNEL, TUNNEL_CROWN } from "./structures";
import type { Track } from "../../domain/track";
import { emptyMesh, mixColor, scaleColor, type MeshData } from "./kit";
import { fbm, smoothstep, valueNoise } from "./noise";
import { PALETTE as C } from "./palette";
import { FORMATION_DEPTH } from "./trackGeometry";

// Le relief strictement nécessaire au réseau, en TypeScript pur, déduit des ouvrages : une plaine neutre ; sous chaque
// pont, une vallée (large et évasée sous le viaduc de pierre, gorge aux parois raides sous le pont métallique) ; autour
// de chaque tunnel, un massif allongé ; au-dessus de la galerie, un plateau ; et sous chaque gare, une plateforme à
// niveau, pour qu'elle ne soit jamais perchée ni enterrée. Le long de la voie, le terrain se plie à la plateforme : il
// ne peut s'en écarter que d'une pente de 2 pour 3, ce qui dessine tout seul les remblais et les tranchées. Sous les
// ponts, le terrain reste libre (on voit la vallée) ; au-dessus des tunnels, la montagne reste entière.
//
// Le décor naturel (végétation, rivières, cascades, roches de détail, paysage lointain) viendra se poser sur ce
// terrain sans le changer : voir `world/anchors.ts`.
//
// Écrit pour Yamba.

interface Sample {
  x: number;
  z: number;
  s: number;
  y: number;
  heading: number;
  route: number;
}

export interface Relief {
  /** Altitude naturelle (avant la voie) et altitude finale du sol. */
  natural(x: number, z: number): number;
  height(x: number, z: number): number;
  /** Bornes du terrain. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Fond de chaque vallée franchie par un pont : centre, altitude, axe (direction de la vallée), demi-largeur. */
  valleys: { structure: string; x: number; z: number; level: number; axis: [number, number]; halfWidth: number }[];
  /** Point de voie le plus proche (à moins de `reach` m) : abscisse, itinéraire, altitude du rail, écart latéral. */
  nearestTrack(x: number, z: number, reach?: number): { s: number; route: "main" | "branch"; y: number; distance: number; heading: number; x: number; z: number } | null;
  /** Près d'une bouche de tunnel : 1 sous la voûte, −1 dans la tranchée d'accès, 0 ailleurs (gabarit de 5 m). */
  portalSide(x: number, z: number): number;
}

const PLATFORM_HALF = 3.1;
const SLOPE = 1.5;

export function createRelief(network: Network): Relief {
  const main = network.routes.main;
  const tracks: Track[] = [main, network.routes.branch];
  const samples: Sample[] = [];
  tracks.forEach((track, route) => {
    for (let s = 0; s <= track.length; s += 2) {
      if (route === 1 && s < network.switchAt) continue;
      const p = track.pointAt(s);
      samples.push({ x: p.x, z: p.z, s, y: p.y, heading: p.heading, route });
    }
  });
  const cell = 24;
  const grid = new Map<string, Sample[]>();
  for (const sample of samples) {
    const key = `${Math.floor(sample.x / cell)},${Math.floor(sample.z / cell)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(sample);
  }
  const nearest = (x: number, z: number, reach: number) => {
    let best: Sample | null = null;
    let bestD = reach * reach;
    const r = Math.ceil(reach / cell);
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let i = -r; i <= r; i += 1) {
      for (let j = -r; j <= r; j += 1) {
        for (const sample of grid.get(`${cx + i},${cz + j}`) ?? []) {
          const d = (sample.x - x) ** 2 + (sample.z - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = sample;
          }
        }
      }
    }
    return best ? { sample: best, distance: Math.sqrt(bestD) } : null;
  };

  const along = (x: number, z: number, o: { x: number; z: number }, dir: [number, number]) => (x - o.x) * dir[0] + (z - o.z) * dir[1];
  const across = (x: number, z: number, o: { x: number; z: number }, dir: [number, number]) => (x - o.x) * -dir[1] + (z - o.z) * dir[0];
  const chord = (from: number, to: number) => {
    const a = main.pointAt(from);
    const b = main.pointAt(to);
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    return { a, b, mid: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, length, dir: [(b.x - a.x) / length, (b.z - a.z) / length] as [number, number] };
  };

  // Vallées sous les ponts : axe perpendiculaire à la corde du pont, fond à `depth` sous le tablier.
  const bridges = network.structures.filter((st) => isBridge(st.kind));
  const valleys = bridges.map((st) => {
    const c = chord(st.from, st.to);
    const deck = Math.min(c.a.y, c.b.y);
    const gorge = st.kind === "truss-bridge";
    return { st, c, floor: deck - (st.depth ?? 30), half: c.length / 2, gorge };
  });
  // Massifs des tunnels : allongés le long de la corde, flancs raides près des portails.
  const mountains = network.structures.filter((st) => st.kind === "rock-tunnel").map((st) => {
    const c = chord(st.from, st.to);
    return { c, top: Math.max(c.a.y, c.b.y), height: st.depth ?? 50, seed: st.from };
  });
  // Plateaux des galeries.
  const plateaus = network.structures.filter((st) => st.kind === "gallery").map((st) => {
    const c = chord(st.from, st.to);
    return { c, top: Math.max(c.a.y, c.b.y) + GALLERY.ceiling + 2.6 };
  });
  // Plateformes des gares (le quai et ses abords sont à niveau).
  const pads = network.stations.filter((st) => st.route !== "branch").map((st) => {
    const c = chord(st.from - 30, st.to + 30);
    return { c, level: main.pointAt((st.from + st.to) / 2).y - FORMATION_DEPTH - 0.3 };
  });

  const natural = (x: number, z: number) => {
    let h = -FORMATION_DEPTH - 0.4 + (fbm(x * 0.006, z * 0.006, 3, 4) - 0.5) * 3;
    for (const pad of pads) {
      const u = Math.abs(along(x, z, pad.c.mid, pad.c.dir));
      const w = Math.abs(across(x, z, pad.c.mid, pad.c.dir));
      const k = (1 - smoothstep(pad.c.length / 2, pad.c.length / 2 + 70, u)) * (1 - smoothstep(30, 110, w));
      h = h * (1 - k) + pad.level * k;
    }
    for (const m of mountains) {
      const u = along(x, z, m.c.mid, m.c.dir);
      const w = across(x, z, m.c.mid, m.c.dir);
      const shape = 1 / (1 + Math.abs(u / (m.c.length / 2 - 6)) ** 6) / (1 + Math.abs(w / 230) ** 4);
      const ridges = fbm(x * 0.018 + m.seed, z * 0.018, 4, 12);
      const peak = m.top + 4 + m.height * shape * (0.8 + ridges * 0.4);
      h = Math.max(h, h * (1 - shape) + peak * shape);
    }
    for (const p of plateaus) {
      const u = Math.abs(along(x, z, p.c.mid, p.c.dir));
      const w = Math.abs(across(x, z, p.c.mid, p.c.dir));
      const k = (1 - smoothstep(p.c.length / 2 - 4, p.c.length / 2 + 22, u)) * (1 - smoothstep(55, 90, w));
      h = Math.max(h, h * (1 - k) + p.top * k);
    }
    // Les vallées creusent tout le reste : la gorge tranche les deux montagnes en falaises.
    for (const v of valleys) {
      const u = Math.abs(along(x, z, v.c.mid, v.c.dir)) / v.half;
      const w = Math.abs(across(x, z, v.c.mid, v.c.dir));
      const k = (1 - (v.gorge ? smoothstep(0.62, 0.98, u) : smoothstep(0.18, 1.02, u))) * (1 - smoothstep(700, 1100, w));
      const bed = v.floor + (fbm(x * 0.02, z * 0.02, 2, 8) - 0.5) * 2 + (v.gorge ? 0 : smoothstep(0, 0.5, u) * 6);
      h = h * (1 - k) + Math.min(h, bed) * k;
    }
    return h;
  };

  const bores = network.structures.filter((st) => st.kind === "rock-tunnel" || st.kind === "gallery");
  const underground = (s: number) => bores.some((st) => s > st.from + 1 && s < st.to - 1);
  const onBridge = (s: number) => bridges.some((st) => s > st.from + 0.5 && s < st.to - 0.5);

  // Tranchées d'accès aux tunnels : leur fond s'élargit jusqu'à la largeur des têtes (passages de service compris) sur
  // les 40 m qui précèdent chaque portail, pour que le relief ne vienne pas masquer l'ouverture.
  const cuttingHalf = (s: number) => {
    let k = 0;
    for (const bore of bores) {
      const gap = s < bore.from ? bore.from - s : s > bore.to ? s - bore.to : 0;
      k = Math.max(k, 1 - smoothstep(0, 40, gap));
    }
    return PLATFORM_HALF + (TUNNEL.halfWidth + 1.6 - PLATFORM_HALF) * k;
  };

  const height = (x: number, z: number) => {
    const h = natural(x, z);
    const near = nearest(x, z, 70);
    if (!near) return h;
    const { sample, distance } = near;
    if (underground(sample.s) || onBridge(sample.s)) {
      // Sous les ponts et au-dessus des tunnels, le terrain est libre ; il ne touche jamais la voûte d'un tunnel.
      // La montagne recouvre toujours la chemise de la voûte (clé à 6,8 m, chemise de 2,4 m, plus un mètre de roche).
      if (underground(sample.s)) return distance < TUNNEL.halfWidth + 4 ? Math.max(h, sample.y + TUNNEL_CROWN + 3.4) : h;
      // Sous un pont, le relief ne remonte jamais jusqu'au tablier.
      return distance < 7 ? Math.min(h, sample.y - FORMATION_DEPTH - 2) : h;
    }
    const formation = sample.y - FORMATION_DEPTH - 0.04;
    const reach = Math.max(0, distance - cuttingHalf(sample.s)) / SLOPE;
    return Math.min(Math.max(h, formation - reach), formation + reach);
  };

  const portalSide = (x: number, z: number) => {
    const near = nearest(x, z, 8);
    if (!near || near.distance > TUNNEL.halfWidth + 1.6) return 0;
    const s = near.sample.s;
    for (const bore of bores) {
      if (s > bore.from && s < bore.to) return 1;
      if ((s > bore.from - 14 && s <= bore.from) || (s >= bore.to && s < bore.to + 14)) return -1;
    }
    return 0;
  };

  const xs = samples.map((s) => s.x);
  const zs = samples.map((s) => s.z);
  const margin = 200;
  return {
    natural,
    height,
    portalSide,
    bounds: { minX: Math.min(...xs) - margin, maxX: Math.max(...xs) + margin, minZ: Math.min(...zs) - margin, maxZ: Math.max(...zs) + margin },
    valleys: valleys.map((v) => ({ structure: v.st.name, x: v.c.mid.x, z: v.c.mid.z, level: v.floor, axis: [-v.c.dir[1], v.c.dir[0]] as [number, number], halfWidth: v.half })),
    nearestTrack: (x, z, reach = 40) => {
      const near = nearest(x, z, reach);
      if (!near) return null;
      const { sample } = near;
      return { s: sample.s, route: sample.route === 1 ? "branch" : "main", y: sample.y, distance: near.distance, heading: sample.heading, x: sample.x, z: sample.z };
    },
  };
}

/** Couleur du sol : terre neutre, roche sur les fortes pentes (parois des vallées, flancs des massifs) et en altitude. */
function groundColor(relief: Relief, x: number, y: number, z: number, slope: number) {
  const n = valueNoise(x * 0.08, z * 0.08, 31);
  const base = mixColor(C.groundDark, C.ground, n);
  const rocky = Math.max(smoothstep(0.55, 1.1, slope), smoothstep(16, 34, y) * 0.8);
  const rock = mixColor(C.rockDark, mixColor(C.rock, C.rockWarm, valueNoise(x * 0.03, z * 0.03, 7)), valueNoise(x * 0.2, y * 0.3, 5));
  void relief;
  return scaleColor(mixColor(base, rock, rocky), 0.92 + n * 0.12);
}

/**
 * Tuiles de terrain (maillages séparés, pour que la caméra n'affiche que celles qu'elle voit) : grille régulière de
 * `cell` mètres, couleurs par sommet. Chaque tuile a aussi une version lointaine trois fois moins fine ; une jupe le long
 * des bords cache les petites fentes entre deux tuiles de finesses différentes.
 */
export interface TerrainTile {
  near: MeshData;
  far: MeshData;
}

export function terrainTiles(relief: Relief, cell = 6, tile = 36): TerrainTile[] {
  const { minX, maxX, minZ, maxZ } = relief.bounds;
  const cols = Math.ceil((maxX - minX) / cell / 3) * 3;
  const rows = Math.ceil((maxZ - minZ) / cell / 3) * 3;
  const heights = new Float32Array((cols + 1) * (rows + 1));
  for (let r = 0; r <= rows; r += 1) for (let c = 0; c <= cols; c += 1) heights[r * (cols + 1) + c] = relief.height(minX + c * cell, minZ + r * cell);
  const at = (c: number, r: number) => heights[Math.min(rows, Math.max(0, r)) * (cols + 1) + Math.min(cols, Math.max(0, c))];
  // Bouches de tunnel : un triangle qui relie la tranchée d'accès au dessus de la voûte traverserait le gabarit
  // (et la caméra qui suit le train) ; on l'ôte, la façade du portail cache le bord.
  const side = new Int8Array((cols + 1) * (rows + 1));
  for (let r = 0; r <= rows; r += 1) for (let c = 0; c <= cols; c += 1) side[r * (cols + 1) + c] = relief.portalSide(minX + c * cell, minZ + r * cell);
  const crosses = (...cells: [number, number][]) => {
    let inside = false;
    let outside = false;
    for (const [c, r] of cells) {
      const v = side[Math.min(rows, r) * (cols + 1) + Math.min(cols, c)];
      inside ||= v === 1;
      outside ||= v === -1;
    }
    return inside && outside;
  };
  const build = (tr: number, tc: number, r1: number, c1: number, stride: number): MeshData => {
    const mesh = emptyMesh();
    const width = Math.floor((c1 - tc) / stride) + 1;
    const height = Math.floor((r1 - tr) / stride) + 1;
    const vertex = (c: number, r: number, drop = 0) => {
      const x = minX + c * cell;
      const z = minZ + r * cell;
      const y = at(c, r);
      const dx = (at(c + stride, r) - at(c - stride, r)) / (2 * cell * stride);
      const dz = (at(c, r + stride) - at(c, r - stride)) / (2 * cell * stride);
      const len = Math.hypot(dx, 1, dz);
      mesh.positions.push(x, y - drop, z);
      mesh.normals.push(-dx / len, 1 / len, -dz / len);
      const color = groundColor(relief, x, y, z, Math.hypot(dx, dz));
      mesh.colors.push(color[0], color[1], color[2], 0);
    };
    for (let j = 0; j < height; j += 1) for (let i = 0; i < width; i += 1) vertex(tc + i * stride, tr + j * stride);
    for (let j = 0; j < height - 1; j += 1) {
      for (let i = 0; i < width - 1; i += 1) {
        const a = j * width + i;
        const c0 = tc + i * stride;
        const r0 = tr + j * stride;
        if (!crosses([c0, r0], [c0 + stride, r0], [c0, r0 + stride])) mesh.indices.push(a, a + 1, a + width);
        if (!crosses([c0 + stride, r0], [c0 + stride, r0 + stride], [c0, r0 + stride])) mesh.indices.push(a + 1, a + width + 1, a + width);
      }
    }
    // Jupe : les bords de la tuile, doublés trois mètres plus bas.
    const edge: [number, number][] = [];
    for (let i = 0; i < width; i += 1) edge.push([i, 0]);
    for (let j = 1; j < height; j += 1) edge.push([width - 1, j]);
    for (let i = width - 2; i >= 0; i -= 1) edge.push([i, height - 1]);
    for (let j = height - 2; j >= 0; j -= 1) edge.push([0, j]);
    const base = mesh.positions.length / 3;
    for (const [i, j] of edge) vertex(tc + i * stride, tr + j * stride, 3);
    for (let k = 0; k < edge.length; k += 1) {
      const [i0, j0] = edge[k];
      const [i1, j1] = edge[(k + 1) % edge.length];
      const top0 = j0 * width + i0;
      const top1 = j1 * width + i1;
      mesh.indices.push(top0, top1, base + k, top1, base + ((k + 1) % edge.length), base + k);
    }
    return mesh;
  };
  const tiles: TerrainTile[] = [];
  for (let tr = 0; tr < rows; tr += tile) {
    for (let tc = 0; tc < cols; tc += tile) {
      const r1 = Math.min(rows, tr + tile);
      const c1 = Math.min(cols, tc + tile);
      tiles.push({ near: build(tr, tc, r1, c1, 1), far: build(tr, tc, r1, c1, 3) });
    }
  }
  return tiles;
}
