import { place, type MeshData, type Transform } from "./kit";
import { LANE_CENTERS, terrainHeight, TERRAIN_HALF_WIDTH, ISLAND_CENTER, type RiverLayout } from "./layout";
import {
  archedBridge,
  bambooBarrier,
  bambooClump,
  bush,
  blossomTree,
  broadleafTree,
  dock,
  emptyParts,
  karstTower,
  lanternPost,
  laneGate,
  lotus,
  pavilion,
  reeds,
  rock,
  stiltHouse,
  type ModelParts,
} from "./models";
import { createSeeded } from "../navigation/seeded";
import { plantForest, shadeForestFloor, type Forest } from "./trees/forest";
import { buildPlain, buildTerrainChunk, buildWaterChunk, coarsePath, distanceToPath, plainSampler, type WaterMeshData } from "./terrain";

// Le paysage du niveau 1, assemblé une fois au chargement : terrain, eau, décors et montagnes, rangés par morceaux de
// 100 m pour que seuls les morceaux visibles soient dessinés. Tout est calculé ; rien n'est téléchargé.

export const CHUNK_LENGTH = 100;
export const GATE_HEIGHT = 6.4;
export const SIGN_WIDTH = 4.7;
export const SIGN_HEIGHT = 2.9;

export interface LandscapeChunk {
  s0: number;
  s1: number;
  terrain: MeshData;
  water: WaterMeshData;
  props: ModelParts;
}

export interface Anchor {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Landscape {
  chunks: LandscapeChunk[];
  plain: MeshData;
  mountains: ModelParts[];
  /** Panneau de chaque voie de chaque embranchement : signs[fork][lane]. */
  signs: Anchor[][];
  /** Barrage de chaque voie : barriers[fork][lane]. */
  barriers: Anchor[][];
  barrierModel: ModelParts;
  /** Point de départ des lanternes célestes de la fête d'arrivée. */
  celebration: Anchor;
  /** Abscisses s couvertes par le terrain. */
  from: number;
  to: number;
  /** Forêt d'arbres stylisés et son sous-bois (dessinés par la scène en instances) ; vide sans forêt. */
  forest: Forest;
}

export interface LandscapeOptions {
  /**
   * Essai de la forêt sur un tronçon : entre ces abscisses, les anciens feuillus, cerisiers, bambous et buissons (faits
   * de boules et de volumes empilés) disparaissent ; l'arbre stylisé et son sous-bois forment une forêt qui s'étend
   * jusque dans l'intérieur des terres. Ailleurs, rien ne change (mêmes tirages, mêmes places).
   */
  forest?: { from: number; to: number };
}

type Rng = () => number;

function variants(count: number, rng: Rng, make: (rng: Rng) => ModelParts): ModelParts[] {
  return Array.from({ length: count }, () => make(rng));
}

function placeParts(target: ModelParts, model: ModelParts, transform: Transform): void {
  place(target.lit, model.lit, transform);
  place(target.glow, model.glow, transform);
}

export interface BuildProgress {
  (fraction: number): void;
}

/**
 * Lignes de vue de la caméra du joueur vers les trois panneaux de chaque portique, depuis toute l'approche : bateau sur
 * l'une des trois voies, caméra en paysage (basse) et en portrait (plus haute). Chaque panneau compte trois cibles :
 * son centre et ses deux bords. Seuls les portiques proches du tronçon comptent.
 */
function signSightlines(layout: RiverLayout, signs: readonly Anchor[][], zone: { from: number; to: number }) {
  const lines: { from: [number, number, number]; to: [number, number, number] }[] = [];
  layout.forks.forEach((fork, f) => {
    if (fork.gate < zone.from - 10 || fork.gate > zone.to + 130) return;
    const targets = signs[f].flatMap((sign) => {
      const rx = Math.cos(sign.yaw) * (SIGN_WIDTH / 2 - 0.3);
      const rz = -Math.sin(sign.yaw) * (SIGN_WIDTH / 2 - 0.3);
      return [[sign.x, sign.y, sign.z], [sign.x - rx, sign.y, sign.z - rz], [sign.x + rx, sign.y, sign.z + rz]] as [number, number, number][];
    });
    for (let s = fork.gate - 130; s <= fork.gate - 10; s += 6) {
      for (const d of LANE_CENTERS) {
        for (const [back, height] of [[8.2, 3.7], [11, 5.6]] as const) {
          const at = s - back;
          const limit = Math.max(0, layout.halfWidth(at) - 3);
          const eye = layout.toWorld(at, Math.max(-limit, Math.min(limit, d)));
          for (const target of targets) lines.push({ from: [eye.x, height, eye.z], to: target });
        }
      }
    }
  });
  return lines;
}

export function buildLandscape(layout: RiverLayout, progress: BuildProgress = () => undefined, options: LandscapeOptions = {}): Landscape {
  const rng = createSeeded(1123);
  const from = -70;
  const to = layout.length + 130;
  const chunks: LandscapeChunk[] = [];
  for (let s0 = from; s0 < to; s0 += CHUNK_LENGTH) {
    const s1 = Math.min(to, s0 + CHUNK_LENGTH);
    chunks.push({ s0, s1, terrain: buildTerrainChunk(layout, s0, s1), water: buildWaterChunk(layout, s0, s1), props: emptyParts() });
    progress(0.45 * (chunks.length * CHUNK_LENGTH) / (to - from));
  }
  const chunkAt = (s: number) => chunks[Math.min(chunks.length - 1, Math.max(0, Math.floor((s - from) / CHUNK_LENGTH)))].props;

  const trees = variants(8, rng, broadleafTree);
  const blossoms = variants(4, rng, blossomTree);
  const bamboos = variants(4, rng, bambooClump);
  const rocks = variants(6, rng, rock);
  const bushes = variants(8, rng, bush);
  const reedModels = variants(3, rng, reeds);
  const lotusModels = variants(4, rng, lotus);
  const houses = variants(5, rng, stiltHouse);
  const post = lanternPost();

  const at = (s: number, d: number, extra: Omit<Transform, "x" | "z"> = {}): Transform => {
    const { x, z } = layout.toWorld(s, d);
    const heading = layout.pointAt(s).heading;
    return { ...extra, x, z, yaw: heading + (extra.yaw ?? 0) };
  };
  const ground = (s: number, d: number) => terrainHeight(layout, s, d);
  const nearVillage = (s: number, side: number, margin = 0) => layout.villages.some((v) => v.side === side && s > v.start - margin && s < v.end + margin);
  const nearBridge = (s: number) => layout.bridges.some((b) => Math.abs(s - b) < 7);
  const nearGate = (s: number) => layout.forks.some((fork) => Math.abs(s - fork.gate) < 6);
  const zone = options.forest;
  const inForest = (s: number) => zone !== undefined && s >= zone.from && s < zone.to;

  // Végétation des berges et des collines.
  for (let s = from + 2; s < to - 2; s += 3) {
    for (const side of [-1, 1] as const) {
      if (rng() > 0.72) continue;
      const width = layout.halfWidth(s);
      const edge = 2.4 + Math.pow(rng(), 1.4) * 32;
      const d = side * (width + edge);
      if (Math.abs(d) > TERRAIN_HALF_WIDTH - 1) continue;
      if (nearVillage(s, side, 4) && edge < 13) continue;
      if ((nearBridge(s) || nearGate(s)) && edge < 8) continue;
      const pick = rng();
      const scale = 0.8 + rng() * 0.6;
      const y = ground(s, d) - 0.15;
      const isRock = pick >= 0.86;
      const model = pick < 0.5 ? trees[Math.floor(rng() * trees.length)] : pick < 0.66 ? bamboos[Math.floor(rng() * bamboos.length)] : !isRock ? blossoms[Math.floor(rng() * blossoms.length)] : rocks[Math.floor(rng() * rocks.length)];
      const yaw = rng() * 6.28;
      // Dans la forêt d'essai, les anciens arbres ne sont pas posés (le tirage, lui, est fait : le reste ne bouge pas).
      if (inForest(s) && (trees.includes(model) || blossoms.includes(model) || bamboos.includes(model))) continue;
      placeParts(chunkAt(s), model, { ...at(s, d, { yaw }), y, scale: isRock ? scale * 1.5 : scale });
    }
  }
  // Buissons fleuris le long des berges : la rive paraît habitée et touffue.
  for (let s = from + 3; s < to - 3; s += 1.7) {
    for (const side of [-1, 1] as const) {
      if (rng() > 0.62) continue;
      const width = layout.halfWidth(s);
      const edge = 1.6 + rng() * 6;
      const d = side * (width + edge);
      if (nearVillage(s, side, 2) && edge < 6) continue;
      if ((nearBridge(s) || nearGate(s)) && edge < 4) continue;
      const bushModel = bushes[Math.floor(rng() * bushes.length)];
      const bushTransform = { ...at(s, d, { yaw: rng() * 6.28 }), y: ground(s, d) - 0.1, scale: 0.8 + rng() * 0.6 };
      if (!inForest(s)) placeParts(chunkAt(s), bushModel, bushTransform);
    }
  }
  progress(0.6);

  // Bord de l'eau : rochers, roseaux et lotus.
  for (let s = from + 4; s < to - 4; s += 3.4) {
    const side = rng() > 0.5 ? 1 : -1;
    const width = layout.halfWidth(s);
    const kind = rng();
    if (nearGate(s) || nearBridge(s)) continue;
    if (kind < 0.25) {
      const d = side * (width + 0.2 + rng() * 0.6);
      placeParts(chunkAt(s), rocks[Math.floor(rng() * rocks.length)], { ...at(s, d, { yaw: rng() * 6.28 }), y: Math.max(-0.3, ground(s, d)) - 0.2, scale: 0.6 + rng() * 0.6 });
    } else if (kind < 0.55) {
      const d = side * (width + 0.1 + rng() * 1.2);
      placeParts(chunkAt(s), reedModels[Math.floor(rng() * reedModels.length)], { ...at(s, d), y: ground(s, d) - 0.1 });
    } else if (kind < 0.7 && !layout.forkAt(s) && !nearVillage(s, side, 6)) {
      const d = side * (width - 0.2 - rng() * 0.4);
      placeParts(chunkAt(s), lotusModels[Math.floor(rng() * lotusModels.length)], { ...at(s, d, { yaw: rng() * 6.28 }), y: 0.09, scale: 0.85 });
    }
  }

  // Îlots des embranchements : arbustes et rochers (dans la forêt d'essai, de jeunes arbres stylisés).
  const forest: Forest = { trees: [], undergrowth: [] };
  const islandRng = createSeeded(2207);
  for (const fork of layout.forks) {
    for (let s = fork.tip + 12; s < fork.islandEnd - 9; s += 4.5) {
      for (const side of [-1, 1]) {
        if (rng() > 0.7) continue;
        const d = side * ISLAND_CENTER + (rng() - 0.5) * 1.2;
        const model = rng() > 0.4 ? trees[Math.floor(rng() * trees.length)] : rocks[Math.floor(rng() * rocks.length)];
        const transform = { ...at(s, d, { yaw: rng() * 6.28 }), y: ground(s, d) - 0.15, scale: 0.45 + rng() * 0.25 };
        if (inForest(s) && trees.includes(model)) {
          forest.trees.push({
            x: transform.x as number,
            y: transform.y,
            z: transform.z as number,
            yaw: transform.yaw as number,
            leanX: (islandRng() - 0.5) * 0.08,
            leanZ: (islandRng() - 0.5) * 0.08,
            scale: 0.36 + islandRng() * 0.1,
            width: 0.9 + islandRng() * 0.2,
            palette: islandRng() < 0.5 ? 1 : 2,
            tint: [1, 1, 1],
            layer: "young",
            inland: 0,
          });
          continue;
        }
        placeParts(chunkAt(s), model, transform);
      }
    }
  }

  // Villages au bord de l'eau : maisons sur pilotis tournées vers la rivière, lanternes, pontons.
  for (const village of layout.villages) {
    let s = village.start;
    let index = 0;
    while (s < village.end) {
      const width = layout.halfWidth(s);
      const d = village.side * (width + 1.6 + rng() * 1.4);
      const house = houses[Math.floor(rng() * houses.length)];
      placeParts(chunkAt(s), house, { ...at(s, d, { yaw: village.side * (Math.PI / 2) }), y: Math.max(ground(s, d), 0.1) - 0.15 });
      const between = s + 5;
      const postD = village.side * (layout.halfWidth(between) + 0.7);
      placeParts(chunkAt(between), post, { ...at(between, postD, { yaw: -village.side * (Math.PI / 2) }), y: ground(between, postD) });
      if (index % 3 === 1) {
        placeParts(chunkAt(between), dock(4.2), { ...at(between, village.side * (layout.halfWidth(between) + 1.2), { yaw: -village.side * (Math.PI / 2) }), y: 0 });
      }
      s += 9 + rng() * 3;
      index += 1;
    }
  }

  // Pavillons sur les hauteurs, et ponts arqués au-dessus du chenal.
  const pavilionModel = pavilion();
  for (const s of [layout.forks[2].reachStart + 30, layout.forks[5].reachStart + 22, layout.length - 30]) {
    const side = s > layout.length - 40 ? 1 : -1;
    const d = side * (layout.halfWidth(s) + 11);
    placeParts(chunkAt(s), pavilionModel, { ...at(s, d), y: ground(s, d) - 0.3 });
  }
  for (const s of layout.bridges) {
    const span = 2 * (layout.halfWidth(s) + 2.2);
    placeParts(chunkAt(s), archedBridge(span, 5.2), { ...at(s, 0), y: 0 });
  }

  // Pontons du départ et de l'arrivée.
  placeParts(chunkAt(layout.start), dock(8.5), { ...at(layout.start, -(layout.halfWidth(layout.start) + 0.8), { yaw: Math.PI / 2 }), y: 0 });
  placeParts(chunkAt(layout.finish), dock(13), { ...at(layout.finish + 4, -(layout.halfWidth(layout.finish) + 0.8), { yaw: Math.PI / 2 }), y: 0 });

  // Portiques des embranchements, panneaux et barrages.
  const signs: Anchor[][] = [];
  const barriers: Anchor[][] = [];
  for (const fork of layout.forks) {
    const width = layout.halfWidth(fork.gate);
    const posts = [-(width - 0.4), -ISLAND_CENTER, ISLAND_CENTER, width - 0.4];
    const forkSigns: Anchor[] = [];
    const forkBarriers: Anchor[] = [];
    for (let lane = 0; lane < 3; lane += 1) {
      const left = posts[lane];
      const right = posts[lane + 1];
      const centre = (left + right) / 2;
      placeParts(chunkAt(fork.gate), laneGate(right - left, GATE_HEIGHT), { ...at(fork.gate, centre), y: 0 });
      const sign = at(fork.gate, centre);
      forkSigns.push({ x: sign.x as number, y: GATE_HEIGHT - 2.05, z: sign.z as number, yaw: sign.yaw as number });
      const barrier = at(fork.barrier, LANE_CENTERS[lane]);
      forkBarriers.push({ x: barrier.x as number, y: 0, z: barrier.z as number, yaw: barrier.yaw as number });
    }
    signs.push(forkSigns);
    barriers.push(forkBarriers);
  }
  if (zone) {
    const plainHeight = plainSampler(layout, from, to + 200);
    const reach = 72;
    const planted = plantForest(
      {
        edge(s, d) {
          const side = Math.sign(d);
          const edge = Math.abs(d) - layout.halfWidth(s);
          if (edge < 0.5 || Math.abs(d) > reach) return null;
          if (nearVillage(s, side, 4) && edge < 13) return null;
          if (nearBridge(s) && edge < 8) return null;
          // Au-delà du terrain, la plaine : on n'y plante que là où elle est bien à plat (pas dans sa jupe).
          if (Math.abs(d) > TERRAIN_HALF_WIDTH - 1 && plainHeight(layout.toWorld(s, d).x, layout.toWorld(s, d).z) < 0.8) return null;
          return edge;
        },
        toWorld: (s, d) => layout.toWorld(s, d),
        ground(s, d) {
          if (Math.abs(d) <= TERRAIN_HALF_WIDTH - 1) return ground(s, d);
          const { x, z } = layout.toWorld(s, d);
          return plainHeight(x, z);
        },
        heading: (s) => layout.pointAt(s).heading,
        halfWidth: (s) => layout.halfWidth(s),
        gates: layout.forks.map((fork) => fork.gate),
        sightlines: signSightlines(layout, signs, zone),
      },
      createSeeded(4409),
      { from: zone.from, to: zone.to, reach },
    );
    forest.trees.push(...planted.trees);
    forest.undergrowth.push(...planted.undergrowth);
    // Sous la canopée, le sol de sous-bois remplace la pelouse.
    for (const chunk of chunks) if (chunk.s1 > zone.from - 10 && chunk.s0 < zone.to + 10) shadeForestFloor(chunk.terrain, forest.trees);
  }
  progress(0.75);

  // Pitons calcaires tout autour de la vallée, plus hauts et plus brumeux au loin.
  const path = coarsePath(layout, from, to + 200, 8);
  const mountainGroups = [emptyParts(), emptyParts(), emptyParts(), emptyParts()];
  const groupOf = (s: number) => mountainGroups[Math.min(3, Math.max(0, Math.floor(((s - from) / (to + 400 - from)) * 4)))];
  for (let s = from - 80; s < to + 400; s += 22) {
    for (const side of [-1, 1]) {
      if (rng() > 0.85) continue;
      const distance = 56 + Math.pow(rng(), 1.1) * 380;
      const d = side * distance;
      const { x, z } = layout.toWorld(s, d);
      if (distanceToPath(path, x, z) < 54) continue;
      const height = 34 + rng() * 42 + distance * 0.1;
      const radius = 11 + rng() * 10 + distance * 0.03;
      placeParts(groupOf(s), karstTower(rng, height, radius), { x, z, y: 0, yaw: rng() * 6.28 });
    }
  }
  progress(0.9);

  const plain = buildPlain(layout, from, to + 200);
  shadeForestFloor(plain, forest.trees);
  progress(1);

  const finishPoint = layout.toWorld(layout.finish + 18, 0);
  return {
    chunks,
    plain,
    mountains: mountainGroups,
    signs,
    barriers,
    barrierModel: bambooBarrier(10),
    celebration: { x: finishPoint.x, y: 1, z: finishPoint.z, yaw: layout.pointAt(layout.finish).heading },
    from,
    to,
    forest,
  };
}
