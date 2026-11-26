import { trackFrame, type Track } from "./track";

// La composition du train : une locomotive à vapeur, son tender, puis des wagons. Chaque véhicule est posé sur la voie
// par ses deux points d'appui (bissel et dernier essieu moteur pour la locomotive, essieux pour les wagons) : chacun de
// ces points est placé exactement sur la voie, à sa propre abscisse. L'orientation du véhicule est la droite qui joint
// ses deux appuis ; sa position, le milieu de cette droite. Dans une courbe, chaque wagon prend donc sa propre
// direction (la corde de la courbe entre ses essieux), au lieu de copier celle de la locomotive, et le milieu de la
// caisse se déporte vers l'intérieur, comme un vrai wagon.
//
// Écrit pour Yamba.

export type VehicleKind = "locomotive" | "tender" | "wagon";

export interface VehicleSpec {
  kind: VehicleKind;
  /** Longueur hors tampons (m). */
  length: number;
  /** Masse à vide (kg). */
  mass: number;
  /** Distances depuis l'avant du véhicule (tampons) des deux points d'appui (m). */
  pivots: [number, number];
  /** Essieux : distance depuis l'avant (m) et rayon de roue (m). */
  axles: { at: number; radius: number }[];
}

/** Caisse de fruits : masse d'une caisse pleine (kg). */
export const CRATE_MASS = 320;

export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  locomotive: {
    kind: "locomotive",
    length: 9.4,
    mass: 48000,
    pivots: [2.15, 7.9],
    axles: [
      { at: 2.15, radius: 0.42 },
      { at: 4.6, radius: 0.78 },
      { at: 6.25, radius: 0.78 },
      { at: 7.9, radius: 0.78 },
    ],
  },
  tender: {
    kind: "tender",
    length: 6.4,
    mass: 22000,
    pivots: [1.45, 4.95],
    axles: [
      { at: 1.45, radius: 0.46 },
      { at: 3.2, radius: 0.46 },
      { at: 4.95, radius: 0.46 },
    ],
  },
  wagon: {
    kind: "wagon",
    length: 7.6,
    mass: 9000,
    pivots: [1.75, 5.85],
    axles: [
      { at: 1.75, radius: 0.46 },
      { at: 5.85, radius: 0.46 },
    ],
  },
};

export interface ConsistVehicle {
  spec: VehicleSpec;
  /** Caisses chargées (wagons seulement). */
  crates: number;
}

export interface Consist {
  vehicles: ConsistVehicle[];
}

/** Une locomotive, son tender, et `wagons` wagons portant chacun `cratesPerWagon` caisses. */
export function createConsist(wagons: number, cratesPerWagon: number): Consist {
  return {
    vehicles: [
      { spec: VEHICLES.locomotive, crates: 0 },
      { spec: VEHICLES.tender, crates: 0 },
      ...Array.from({ length: wagons }, () => ({ spec: VEHICLES.wagon, crates: cratesPerWagon })),
    ],
  };
}

export function vehicleMass(vehicle: ConsistVehicle): number {
  return vehicle.spec.mass + vehicle.crates * CRATE_MASS;
}

export function consistMass(consist: Consist): number {
  return consist.vehicles.reduce((sum, vehicle) => sum + vehicleMass(vehicle), 0);
}

export function consistLength(consist: Consist): number {
  return consist.vehicles.reduce((sum, vehicle) => sum + vehicle.spec.length, 0);
}

/** Abscisse de l'avant de chaque véhicule, quand l'avant de la locomotive est en `head`. */
export function vehicleFronts(consist: Consist, head: number): number[] {
  const fronts: number[] = [];
  let at = head;
  for (const vehicle of consist.vehicles) {
    fronts.push(at);
    at -= vehicle.spec.length;
  }
  return fronts;
}

export interface VehiclePose {
  /** Milieu des deux appuis, à hauteur du rail. */
  position: [number, number, number];
  /** Vecteurs unitaires du véhicule : vers l'avant, vers la droite, vers le haut. */
  forward: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  /** Abscisse du milieu du véhicule (pour savoir s'il est sous terre, en gare…). */
  s: number;
}

const sub = (a: readonly number[], b: readonly number[]): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const normalize = (v: readonly number[]): [number, number, number] => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Pose d'un véhicule dont l'avant est à l'abscisse `front` : ses deux appuis sur la voie, la corde entre eux pour
 * direction, le dévers moyen des deux appuis pour inclinaison.
 */
export function poseVehicle(track: Track, spec: VehicleSpec, front: number): VehiclePose {
  const a = track.pointAt(front - spec.pivots[0]);
  const b = track.pointAt(front - spec.pivots[1]);
  const forward = normalize(sub([a.x, a.y, a.z], [b.x, b.y, b.z]));
  // Le haut : la moyenne des hauts de la voie aux deux appuis (dévers), rendue perpendiculaire à la direction.
  const ua = trackFrame(a).up;
  const ub = trackFrame(b).up;
  const mean = [(ua[0] + ub[0]) / 2, (ua[1] + ub[1]) / 2, (ua[2] + ub[2]) / 2];
  const dot = mean[0] * forward[0] + mean[1] * forward[1] + mean[2] * forward[2];
  const up = normalize([mean[0] - forward[0] * dot, mean[1] - forward[1] * dot, mean[2] - forward[2] * dot]);
  // Repère main gauche (Babylon) : droite = haut × avant.
  const right = normalize(cross(up, forward));
  return {
    position: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2],
    forward,
    right,
    up,
    s: front - spec.length / 2,
  };
}
