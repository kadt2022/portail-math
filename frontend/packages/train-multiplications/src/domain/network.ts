import { branchTrack, buildTrack, type Track } from "./track";

// Le réseau ferroviaire de la première carte, d'un heurtoir à l'autre :
//
//   gare de départ → grande courbe → grand viaduc de pierre sur la vallée (en courbe, à deux étages d'arches) →
//   rampe → tunnel du mont Kibo (long, en courbe et en rampe) → au sortir de la montagne, pont métallique sur la
//   gorge → tunnel de la Dent, dans la montagne d'en face (en courbe et en pente) → halte du col → descente →
//   passage souterrain en courbe → aiguillage → gare du village, voie 1 ou voie 2.
//
// Chaque « itinéraire » est une voie complète, du heurtoir de départ au heurtoir d'arrivée : les deux itinéraires sont
// identiques jusqu'à l'aiguillage. Les ouvrages (gares, ponts, tunnels, signaux) sont des données repérées par leurs
// abscisses ; le relief et la géométrie s'en déduisent. Le décor naturel n'est pas décrit ici : il viendra s'ajouter
// autour sans rien changer au réseau.
//
// Écrit pour Yamba.

export type RouteId = "main" | "branch";

export interface StationStop {
  id: string;
  /** Nom affiché sur les panneaux. */
  name: string;
  route: RouteId | "both";
  /** Quai : de `from` à `to` (abscisses), à gauche ou à droite de la voie. */
  from: number;
  to: number;
  side: "left" | "right";
  /** Repère d'arrêt : l'avant de la locomotive doit s'arrêter ici. */
  stop: number;
  /** Bâtiment voyageurs : grande gare, petite gare, ou simple abri. */
  building: "terminal" | "village" | "shelter" | "none";
}

export interface Structure {
  kind: StructureKind;
  name: string;
  from: number;
  to: number;
  /** Ponts : profondeur de la vallée sous le tablier (m). Tunnels : hauteur de la montagne au-dessus de la voûte. */
  depth?: number;
}

export type StructureKind = "stone-viaduct" | "truss-bridge" | "rock-tunnel" | "gallery";

/** Un pont (on circule au grand air, au-dessus du vide) ? */
export const isBridge = (kind: StructureKind) => kind === "stone-viaduct" || kind === "truss-bridge";

export interface SignalPost {
  id: string;
  s: number;
  route: RouteId | "both";
  side: "left" | "right";
  /** Ce que le signal annonce : la voie libre, l'itinéraire de l'aiguillage, ou le départ de la gare. */
  role: "block" | "route" | "departure";
}

export interface Network {
  routes: Record<RouteId, Track>;
  /** Abscisse de la pointe de l'aiguillage, et longueur de la partie déviée (jusqu'au parallélisme). */
  switchAt: number;
  switchLength: number;
  /** Écart entre les voies 1 et 2 à la gare du village (m). */
  trackSpacing: number;
  stations: StationStop[];
  structures: Structure[];
  signals: SignalPost[];
  /** Hauteur des rails au-dessus de la plateforme (traverses et ballast compris). */
  railHeight: number;
}

const R = (radius: number) => 1 / radius;

export function createNetwork(): Network {
  const main = buildTrack(
    { x: 0, y: 0, z: 0, heading: 0 },
    [
      { length: 180, curvature: 0 }, // gare de départ
      { length: 150, curvature: R(260), ramp: 40 },
      { length: 110, curvature: 0, ramp: 40 }, // remblai d'approche
      { length: 480, curvature: -R(900), ramp: 40 }, // grand viaduc, en courbe
      { length: 60, curvature: 0, ramp: 40 },
      { length: 160, curvature: R(220), ramp: 45 }, // rampe au pied du mont Kibo
      { length: 60, curvature: 0, ramp: 40 }, // tranchée d'accès
      { length: 400, curvature: -R(350), ramp: 40 }, // tunnel du mont Kibo, en courbe
      { length: 200, curvature: 0 }, // pont de la gorge
      { length: 280, curvature: R(300), ramp: 40 }, // tunnel de la Dent, en courbe
      { length: 150, curvature: 0, ramp: 40 }, // halte du col
      { length: 140, curvature: -R(240), ramp: 40 },
      { length: 170, curvature: R(380), ramp: 40 }, // passage souterrain, en courbe
      { length: 65, curvature: 0, ramp: 40 },
      { length: 215, curvature: 0 }, // aiguillage et gare du village, voie 1
    ],
    [
      { length: 960, grade: 0 }, // gare, approche et viaduc de niveau
      { length: 240, grade: 0.025, ramp: 60 }, // rampe d'accès
      { length: 400, grade: 0.01, ramp: 50 }, // tunnel du mont Kibo : rampe jusqu'au point haut
      { length: 200, grade: 0, ramp: 40 }, // pont de la gorge, de niveau
      { length: 260, grade: -0.012, ramp: 40 }, // tunnel de la Dent : pente
      { length: 180, grade: 0, ramp: 40 }, // col
      { length: 320, grade: -0.018, ramp: 60 }, // descente, passage souterrain
      { length: 260, grade: 0, ramp: 50 },
    ],
  );
  const switchAt = 2610;
  const turnout = 42;
  const radius = 190;
  // Branche déviée : courbe vers la droite puis contre-courbe, sans raccordement (comme un vrai aiguillage), puis
  // alignement parallèle à la voie 1, jusqu'au heurtoir.
  const branch = branchTrack(
    main,
    switchAt,
    [
      { length: turnout, curvature: R(radius) },
      { length: turnout, curvature: -R(radius) },
      { length: main.length - switchAt - 2 * turnout, curvature: 0 },
    ],
    [{ length: 400, grade: 0 }],
  );
  const spacing = (turnout * turnout) / radius;
  return {
    routes: { main, branch },
    switchAt,
    switchLength: 2 * turnout,
    trackSpacing: spacing,
    railHeight: 0.62,
    stations: [
      // Départ et halte du col sont avant l'aiguillage : elles sont sur les deux itinéraires.
      { id: "depart", name: "Gare de départ", route: "both", from: 36, to: 122, side: "left", stop: 116, building: "terminal" },
      { id: "col", name: "Halte du col", route: "both", from: 2134, to: 2214, side: "right", stop: 2208, building: "shelter" },
      { id: "village-1", name: "Gare du village", route: "main", from: 2712, to: 2800, side: "left", stop: 2794, building: "village" },
      { id: "village-2", name: "Gare du village", route: "branch", from: 2712, to: 2800, side: "left", stop: 2794, building: "none" },
    ],
    structures: [
      { kind: "stone-viaduct", name: "Grand viaduc de la vallée", from: 462, to: 898, depth: 34 },
      { kind: "rock-tunnel", name: "Tunnel du mont Kibo", from: 1212, to: 1598, depth: 60 },
      { kind: "truss-bridge", name: "Pont de la gorge", from: 1606, to: 1792, depth: 44 },
      { kind: "rock-tunnel", name: "Tunnel de la Dent", from: 1800, to: 2052, depth: 48 },
      { kind: "gallery", name: "Passage souterrain", from: 2392, to: 2534 },
    ],
    signals: [
      { id: "depart", s: 128, route: "main", side: "right", role: "departure" },
      { id: "viaduc", s: 440, route: "main", side: "right", role: "block" },
      { id: "tunnel-kibo", s: 1188, route: "main", side: "right", role: "block" },
      { id: "col", s: 2222, route: "main", side: "right", role: "block" },
      { id: "souterrain", s: 2376, route: "main", side: "right", role: "block" },
      { id: "aiguillage", s: 2590, route: "main", side: "right", role: "route" },
    ],
  };
}

/** Ouvrage couvrant l'abscisse s (tunnel, galerie, viaduc), s'il y en a un. */
export function structureAt(network: Network, s: number): Structure | undefined {
  return network.structures.find((structure) => s >= structure.from && s <= structure.to);
}

/** L'abscisse s est-elle sous terre (tunnel ou galerie) ? `margin` étend la zone au-delà des portails. */
export function isUnderground(network: Network, s: number, margin = 0): boolean {
  return network.structures.some((structure) => !isBridge(structure.kind) && s >= structure.from - margin && s <= structure.to + margin);
}

/** Quais desservis par un itinéraire. */
export function stationsOn(network: Network, route: RouteId): StationStop[] {
  return network.stations.filter((station) => station.route === route || station.route === "both");
}
