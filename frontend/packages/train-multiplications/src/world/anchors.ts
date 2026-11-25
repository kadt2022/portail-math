import type { Network } from "../domain/network";
import { trackFrame } from "../domain/track";
import { PLATFORM, stationPlacement } from "../engine/geometry/stations";
import type { Relief } from "../engine/geometry/terrain";

// Points de placement du futur habillage (magasin de ressources de Yamba Studio). Le jeu ne pose ici aucun arbre,
// aucune rivière, aucune maison : il dit seulement où ces ressources pourront venir, et quelle place elles y ont, sans
// jamais empiéter sur le gabarit ferroviaire. Tout se déduit du réseau et du relief, en TypeScript pur : changer le
// tracé déplace les points d'eux-mêmes.
//
// Écrit pour Yamba.

export type AnchorKind =
  /** Fond d'une vallée franchie par un pont : lit d'une future rivière (suivre `heading`). */
  | "river-bed"
  /** Paroi d'une gorge : départ d'une future cascade (le point est en haut de la paroi, `heading` vers le vide). */
  | "waterfall"
  /** Sommet ou épaule d'un massif percé par un tunnel. */
  | "mountain-top"
  | "mountain-slope"
  /** Abords d'une gare, côté opposé aux voies : parvis, rues, place du village. */
  | "station-forecourt"
  /** Terrain libre le long de la voie, hors gabarit (bosquets, clôtures, poteaux télégraphiques…). */
  | "trackside";

export interface DecorAnchor {
  id: string;
  kind: AnchorKind;
  x: number;
  y: number;
  z: number;
  /** Orientation conseillée (radians, comme les caps de la voie : 0 = +z). */
  heading: number;
  /** Rayon de la place disponible (m). */
  radius: number;
  /** Ouvrage ou gare de rattachement. */
  near?: string;
}

/** Distance minimale (m) entre l'axe d'une voie et le moindre objet du décor. */
export const RAILWAY_CLEARANCE = 6;

/**
 * Le point (x, z) est-il dans le gabarit ferroviaire (trop près d'une voie pour y poser du décor) ? Avec une altitude
 * `y`, un point très au-dessus ou au-dessous du rail (sommet d'une montagne percée, fond d'une vallée) reste libre.
 */
export function inRailwayClearance(relief: Relief, x: number, z: number, margin = RAILWAY_CLEARANCE, y?: number): boolean {
  const near = relief.nearestTrack(x, z, margin);
  if (near === null || near.distance >= margin) return false;
  return y === undefined || (y > near.y - 3 && y < near.y + 8);
}

export function decorAnchors(network: Network, relief: Relief): DecorAnchor[] {
  const anchors: DecorAnchor[] = [];
  const main = network.routes.main;
  const push = (anchor: Omit<DecorAnchor, "y"> & { y?: number }) => {
    const y = anchor.y ?? relief.height(anchor.x, anchor.z);
    if (inRailwayClearance(relief, anchor.x, anchor.z, 8, y)) return;
    anchors.push({ ...anchor, y });
  };
  // Lits de rivière : le long de l'axe de chaque vallée, de part et d'autre du pont.
  for (const valley of relief.valleys) {
    const heading = Math.atan2(valley.axis[0], valley.axis[1]);
    for (let d = -400; d <= 400; d += 40) {
      push({ id: `river-${valley.structure}-${d}`, kind: "river-bed", x: valley.x + valley.axis[0] * d, z: valley.z + valley.axis[1] * d, heading, radius: valley.halfWidth * 0.18, near: valley.structure });
    }
  }
  // Cascades : en haut des parois de la gorge, de part et d'autre du pont métallique.
  for (const st of network.structures.filter((s) => s.kind === "truss-bridge")) {
    const valley = relief.valleys.find((v) => v.structure === st.name);
    if (!valley) continue;
    const across: [number, number] = [valley.axis[1], -valley.axis[0]];
    for (const wall of [-1, 1]) {
      for (const d of [-70, 70]) {
        const r = valley.halfWidth * 0.85 * wall;
        const x = valley.x + across[0] * r + valley.axis[0] * d;
        const z = valley.z + across[1] * r + valley.axis[1] * d;
        push({ id: `waterfall-${st.name}-${wall}-${d}`, kind: "waterfall", x, z, heading: Math.atan2(-across[0] * wall, -across[1] * wall), radius: 12, near: st.name });
      }
    }
  }
  // Massifs des tunnels : le sommet au-dessus du milieu, deux épaules de part et d'autre.
  for (const st of network.structures.filter((s) => s.kind === "rock-tunnel")) {
    const mid = main.pointAt((st.from + st.to) / 2);
    const { right } = trackFrame({ ...mid, cant: 0 });
    push({ id: `summit-${st.name}`, kind: "mountain-top", x: mid.x, z: mid.z, heading: mid.heading, radius: 40, near: st.name });
    for (const side of [-1, 1]) push({ id: `slope-${st.name}-${side}`, kind: "mountain-slope", x: mid.x + right[0] * side * 90, z: mid.z + right[2] * side * 90, heading: mid.heading, radius: 60, near: st.name });
  }
  // Abords des gares, du côté du bâtiment voyageurs (au-delà).
  for (const station of network.stations.filter((s) => s.building !== "none")) {
    const at = stationPlacement(main, station);
    const side = station.side === "right" ? 1 : -1;
    const right = [Math.cos(at.heading), -Math.sin(at.heading)];
    const out = side * (PLATFORM.edge + 30);
    push({ id: `forecourt-${station.id}`, kind: "station-forecourt", x: at.x + right[0] * out, z: at.z + right[1] * out, heading: at.heading, radius: 22, near: station.id });
  }
  // Abords de la voie, tous les 60 m, alternés, hors ponts et tunnels.
  for (let s = 40, i = 0; s < main.length - 20; s += 60, i += 1) {
    if (network.structures.some((st) => s > st.from - 15 && s < st.to + 15)) continue;
    const p = main.pointAt(s);
    const { right } = trackFrame({ ...p, cant: 0 });
    const side = i % 2 === 0 ? -1 : 1;
    push({ id: `trackside-${s}`, kind: "trackside", x: p.x + right[0] * side * 14, z: p.z + right[2] * side * 14, heading: p.heading, radius: 6 });
  }
  return anchors;
}
