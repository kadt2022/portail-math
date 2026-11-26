import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { Network } from "../../domain/network";
import type { Track } from "../../domain/track";
import { GALLERY, TRUSS, TUNNEL, tunnelCeiling } from "../geometry/structures";
import type { Relief } from "../geometry/terrain";
import { FORMATION_DEPTH } from "../geometry/trackGeometry";

// Les volumes que la caméra ne doit jamais traverser. Deux familles :
//
// - les volumes opaques (le relief et la roche, hors du tube des tunnels) : ils cachent la vue, la caméra se rapproche
//   du train jusqu'à le voir ;
// - les volumes minces (poutres et contreventement du pont métallique, maçonnerie des viaducs, bâtiments des gares) :
//   on peut voir à travers ou par-dessus, mais l'œil ne doit jamais s'y trouver.
//
// Tout est calculé à partir du réseau et du relief, en mathématiques pures (pas de lancer de rayons sur les
// maillages) : le test coûte quelques microsecondes et ne dépend pas de l'habillage graphique.
//
// Écrit pour Yamba.

/** Boîte orientée selon un cap (rotation autour de la verticale). */
export interface Box {
  x: number;
  y: number;
  z: number;
  heading: number;
  half: [number, number, number];
}

export interface Obstacles {
  opaque(p: Vector3): boolean;
  thin(p: Vector3): boolean;
}

export function createObstacles(network: Network, relief: Relief, boxes: readonly Box[] = []): Obstacles {
  const main: Track = network.routes.main;
  const bores = network.structures.filter((st) => st.kind === "rock-tunnel" || st.kind === "gallery");
  const trusses = network.structures.filter((st) => st.kind === "truss-bridge");
  const viaducts = network.structures.filter((st) => st.kind === "stone-viaduct");

  /** Position du point dans le repère de la voie principale (abscisse, écart latéral signé, hauteur au-dessus du rail). */
  const local = (p: Vector3) => {
    const near = relief.nearestTrack(p.x, p.z, 12);
    if (!near || near.route !== "main") return null;
    const right = [Math.cos(near.heading), -Math.sin(near.heading)];
    const lateral = (p.x - near.x) * right[0] + (p.z - near.z) * right[1];
    return { s: near.s, lateral, height: p.y - main.pointAt(near.s).y };
  };

  const inTube = (p: Vector3) => {
    const l = local(p);
    if (!l) return false;
    for (const bore of bores) {
      if (l.s < bore.from - 0.5 || l.s > bore.to + 0.5) continue;
      const rock = bore.kind === "rock-tunnel";
      const half = (rock ? TUNNEL.halfWidth : GALLERY.halfWidth) - 0.35;
      const crown = tunnelCeiling(l.lateral, rock ? "rock" : "gallery") - 0.35;
      if (Math.abs(l.lateral) < half && l.height < crown && l.height > -FORMATION_DEPTH) return true;
    }
    return false;
  };

  const inBox = (p: Vector3, b: Box) => {
    const dx = p.x - b.x;
    const dz = p.z - b.z;
    const c = Math.cos(b.heading);
    const s = Math.sin(b.heading);
    const across = dx * c - dz * s;
    const along = dx * s + dz * c;
    return Math.abs(across) < b.half[0] && Math.abs(p.y - b.y) < b.half[1] && Math.abs(along) < b.half[2];
  };

  return {
    opaque(p) {
      if (p.y >= relief.height(p.x, p.z) + 0.4) return false;
      return !inTube(p);
    },
    thin(p) {
      for (const b of boxes) if (inBox(p, b)) return true;
      if (!trusses.length && !viaducts.length) return false;
      const l = local(p);
      if (!l) return false;
      for (const st of trusses) {
        if (l.s < st.from - 1 || l.s > st.to + 1) continue;
        const length = (st.to - st.from) / TRUSS.spans;
        const t = ((l.s - st.from) % length) / length;
        const top = -FORMATION_DEPTH - 0.55 + TRUSS.endHeight + (TRUSS.midHeight - TRUSS.endHeight) * Math.sin(Math.PI * t);
        const a = Math.abs(l.lateral);
        // Contreventement haut, et les deux poutres latérales (avec une marge).
        if (a < TRUSS.half + 0.6 && l.height > top - 0.9 && l.height < top + 0.8) return true;
        if (a > TRUSS.half - 0.7 && a < TRUSS.half + 0.7 && l.height > -3 && l.height < top + 0.8) return true;
      }
      for (const st of viaducts) {
        if (l.s < st.from - 10 || l.s > st.to + 10) continue;
        // Toute la maçonnerie sous le tablier, et les parapets.
        if (Math.abs(l.lateral) < 4.4 && l.height < -FORMATION_DEPTH + 0.2) return true;
        if (Math.abs(l.lateral) > 2.6 && Math.abs(l.lateral) < 4 && l.height < 1.4) return true;
      }
      return false;
    },
  };
}

/**
 * Bras à ressort : l'œil voulu est ramené vers la cible tant que le relief s'interpose (volumes opaques), puis tant
 * qu'il se trouve dans un volume mince. Renvoie l'œil corrigé (un nouveau vecteur seulement s'il a bougé).
 */
export function resolveEye(eye: Vector3, target: Vector3, obstacles: Obstacles): Vector3 {
  const steps = 24;
  let t = 1;
  for (let i = 1; i <= steps; i += 1) {
    const k = i / steps;
    if (obstacles.opaque(target.add(eye.subtract(target).scale(k)))) {
      t = (i - 1) / steps;
      break;
    }
  }
  let p = t < 1 ? target.add(eye.subtract(target).scale(t)) : eye;
  for (let i = 0; i < steps && obstacles.thin(p); i += 1) {
    t = Math.max(0, t - 1 / steps);
    p = target.add(eye.subtract(target).scale(t));
  }
  return p;
}
