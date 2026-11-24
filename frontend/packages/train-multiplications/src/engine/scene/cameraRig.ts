import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { VehiclePose } from "../../domain/consist";
import { isBridge, type Network, type StationStop } from "../../domain/network";
import { trackFrame, type Track } from "../../domain/track";
import { PLATFORM } from "../geometry/stations";
import { TUNNEL } from "../geometry/structures";
import { resolveEye, type Obstacles } from "./clearance";

// Les caméras du train. Chaque vue calcule à chaque image sa position et son point de visée à partir du train et de la
// voie : derrière le train, dans la cabine, latérale (et, sur les ponts, un plan large pris d'en bas, depuis la
// vallée), panoramique (en orbite lente au-dessus du train), chargement des marchandises. Un bras à ressort empêche
// l'œil de traverser le relief, la roche, les poutres des ponts ou les bâtiments : il se rapproche du train. Changer de vue fait
// glisser la caméra de l'ancienne pose à la nouvelle en une seconde, adoucie aux deux bouts, même en pleine vitesse
// (les deux poses sont recalculées pendant le fondu). Sous terre, les vues extérieures descendent dans le tube : elles
// suivent le train à l'intérieur du tunnel au lieu de rester dans la roche.
//
// Écrit pour Yamba.

export type CameraMode = "behind" | "cab" | "side" | "loading" | "panorama";
export const CAMERA_MODES: readonly CameraMode[] = ["behind", "cab", "side", "loading", "panorama"];

export interface CameraPose {
  eye: Vector3;
  target: Vector3;
  fov: number;
  /** Plan de la vue (par exemple « dans le tube », « au portail ») : un changement de plan est fondu comme un changement de vue. */
  key?: string;
}

export interface RigInput {
  track: Track;
  network: Network;
  head: number;
  poses: readonly VehiclePose[];
  /** Œil et visée du conducteur, déjà dans le monde. */
  cab: { eye: Vector3; target: Vector3 };
  ground: (x: number, z: number) => number;
  /** Gare dont le quai longe le train, s'il y en a une. */
  station: StationStop | null;
  /** Écran en hauteur (téléphone en portrait) : on recule un peu et on élargit. */
  portrait: boolean;
  /** Volumes que l'œil ne doit pas traverser (relief, roche, poutres, bâtiments). */
  obstacles?: Obstacles;
  /** Horloge (s), pour la lente rotation de la vue panoramique. */
  clock?: number;
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Profondeur (m) à l'intérieur d'un tunnel ou d'une galerie : négative avant le portail, positive dedans. */
export function depthInside(network: Network, s: number): number {
  let best = -Infinity;
  for (const st of network.structures) {
    if (isBridge(st.kind)) continue;
    best = Math.max(best, Math.min(s - st.from, st.to - s));
  }
  return best;
}

/** Profondeur (m) sous le contreventement d'un pont métallique : négative avant le portique, positive dessous. */
export function depthUnderTruss(network: Network, s: number): number {
  let best = -Infinity;
  for (const st of network.structures) if (st.kind === "truss-bridge") best = Math.max(best, Math.min(s - st.from, st.to - s));
  return best;
}

function trackPoint(track: Track, s: number, lateral: number, height: number): Vector3 {
  const p = track.pointAt(s);
  const { right } = trackFrame({ ...p, cant: 0 });
  return new Vector3(p.x + right[0] * lateral, p.y + height, p.z + right[2] * lateral);
}

/** Le relief cache-t-il la cible depuis l'œil ? (échantillons le long du segment, au-dessus du sol). */
function blocked(eye: Vector3, target: Vector3, ground: (x: number, z: number) => number): boolean {
  for (let i = 1; i < 10; i += 1) {
    const t = i / 10;
    const x = eye.x + (target.x - eye.x) * t;
    const y = eye.y + (target.y - eye.y) * t;
    const z = eye.z + (target.z - eye.z) * t;
    if (ground(x, z) > y - 0.6) return true;
  }
  return false;
}

export function desiredPose(mode: CameraMode, input: RigInput, side: number): CameraPose {
  const { track, network, head, poses } = input;
  const tail = poses[poses.length - 1];
  const mid = poses[Math.min(poses.length - 1, 3)];
  const fovBoost = input.portrait ? 0.32 : 0;
  if (mode === "cab") return { eye: input.cab.eye.clone(), target: input.cab.target.clone(), fov: 1.18 + fovBoost };
  if (mode === "behind") {
    const s = head - (input.portrait ? 34 : 28);
    // Sous une voûte ou sous le contreventement du pont métallique : près de l'axe, sous le plafond, avant d'y entrer.
    // La voûte du tunnel (clé à 6,8 m) laisse la caméra à 5 m, un peu décalée : on voit le train et le passage de
    // service ; sous le pont métallique, elle descend sous le contreventement.
    const tunnel = smooth((depthInside(network, s) + 14) / 12);
    const truss = smooth((depthUnderTruss(network, s) + 14) / 12);
    const inside = Math.max(tunnel, truss);
    const low = truss > tunnel ? 3.9 : 5.0;
    const eye = trackPoint(track, s, 2.4 - (2.4 - (truss > tunnel ? 0 : 0.9)) * inside, 7.6 - (7.6 - low) * inside);
    if (inside < 0.5) eye.y = Math.max(eye.y, input.ground(eye.x, eye.z) + 2.2);
    const target = trackPoint(track, head + 10, 0, 2.3);
    return { eye, target, fov: 0.85 + fovBoost };
  }
  if (mode === "side") {
    const length = head - tail.s;
    const crossing = network.structures.find((st) => !isBridge(st.kind) && head > st.from - 2 && head - length * 1.15 < st.to + 2);
    if (crossing) {
      const fullyInside = head < crossing.to - 1 && head - length * 1.15 > crossing.from + 1;
      if (fullyInside) {
        // Tout le train est sous terre : la caméra se tient sur le passage de service, à hauteur d'homme, et le
        // regarde passer.
        const eye = trackPoint(track, head + 11, (TUNNEL.halfWidth - 0.8) * side, TUNNEL.walkwayHeight + 1.75);
        return { eye, target: trackPoint(track, head - 6, 0, 2.2), fov: 0.82 + fovBoost, key: "tube" };
      }
      // Le train franchit un portail : la caméra attend dehors, dans la tranchée, et le regarde entrer ou sortir.
      const exiting = head > crossing.to - 1;
      const portal = exiting ? crossing.to : crossing.from;
      const outward = exiting ? 1 : -1;
      const eye = trackPoint(track, portal + outward * 20, 2.4 * side, 4.6);
      eye.y = Math.max(eye.y, input.ground(eye.x, eye.z) + 1.8);
      return { eye, target: trackPoint(track, portal - outward * 2, 0, 2.6), fov: 0.85 + fovBoost, key: `portal-${crossing.kind}-${exiting ? "out" : "in"}` };
    }
    const s = (head + tail.s) / 2;
    // Sur un pont : plan large pris d'en bas, depuis le flanc de la vallée ; on voit le train passer au-dessus du vide.
    const bridge = network.structures.find((st) => isBridge(st.kind) && s > st.from + 10 && s < st.to - 10);
    if (bridge) {
      const deck = track.pointAt(s).y;
      const drop = Math.min(18, (bridge.depth ?? 30) * 0.45);
      const eye = trackPoint(track, s - 30, side * (bridge.kind === "truss-bridge" ? 46 : 58), -drop);
      eye.y = Math.max(eye.y, input.ground(eye.x, eye.z) + 3, deck - drop);
      return { eye, target: new Vector3(mid.position[0], mid.position[1] + 1, mid.position[2]), fov: 0.9 + fovBoost, key: `bridge-${bridge.from}` };
    }
    // Vue au large du train, rapprochée tant que le relief (talus, flanc de montagne) cache le train.
    const aim = new Vector3(mid.position[0], mid.position[1] + 1.8, mid.position[2]);
    let eye = trackPoint(track, s - 6, side * 24, 5.5);
    for (const lateral of [24, 17, 11, 7, 4.5]) {
      eye = trackPoint(track, s - 6, side * lateral, 3 + lateral * 0.12);
      eye.y = Math.max(eye.y, input.ground(eye.x, eye.z) + 2.5);
      if (!blocked(eye, aim, input.ground)) break;
    }
    return { eye, target: aim, fov: 0.78 + fovBoost, key: "open" };
  }
  if (mode === "panorama") {
    // Orbite lente, haute et large, autour du milieu du train ; sous terre, on redescend derrière le train, dans le tube.
    const center = new Vector3(mid.position[0], mid.position[1] + 1.5, mid.position[2]);
    const depth = depthInside(network, mid.s);
    if (depth > 6) {
      const eye = trackPoint(track, head - 24, 1.2, 5.2);
      return { eye, target: trackPoint(track, head + 10, 0, 2.2), fov: 0.85 + fovBoost, key: "tube" };
    }
    const angle = (input.clock ?? 0) * 0.07 + 0.8;
    const radius = input.portrait ? 95 : 78;
    const eye = center.add(new Vector3(Math.sin(angle) * radius, 34, Math.cos(angle) * radius));
    eye.y = Math.max(eye.y, input.ground(eye.x, eye.z) + 8);
    return { eye, target: center, fov: 0.8 + fovBoost, key: "orbit" };
  }
  // Chargement : depuis le quai, en surplomb des wagons ; hors gare, en vue plongeante sur les wagons.
  const wagons = poses.slice(2);
  const center = wagons.reduce((acc, p) => acc.addInPlaceFromFloats(p.position[0], p.position[1], p.position[2]), new Vector3()).scaleInPlace(1 / Math.max(1, wagons.length));
  const s = wagons.length ? (wagons[0].s + wagons[wagons.length - 1].s) / 2 : head - 20;
  const target = center.add(new Vector3(0, 1.4, 0));
  if (input.station && depthInside(network, s) < -4) {
    // Au bord du quai, entre le train et la marquise, en surplomb des wagons ouverts.
    const lateral = (input.station.side === "right" ? 1 : -1) * (PLATFORM.edge + 0.35);
    const eye = trackPoint(track, s - 11, lateral, 7.6);
    return { eye, target, fov: 0.95 + fovBoost };
  }
  const inside = smooth((depthInside(network, s) + 10) / 14);
  const eye = Vector3.Lerp(trackPoint(track, s - 9, 4.5 * side, 12), trackPoint(track, s - 10, 0.8 * side, 4.4), inside);
  return { eye, target, fov: 0.9 + fovBoost };
}

export interface CameraRig {
  readonly mode: CameraMode;
  setMode(mode: CameraMode, now: number): void;
  /** Pose à afficher à l'instant `now` (secondes), avec le fondu éventuel entre deux vues. */
  update(input: RigInput, now: number, dt: number): CameraPose;
}

export const TRANSITION_SECONDS = 1.0;

export function createCameraRig(initial: CameraMode = "behind"): CameraRig {
  let mode = initial;
  let previous: CameraMode | null = null;
  let since = 0;
  let side = 1;
  let sideCheck = -Infinity;
  let last: CameraPose | null = null;
  let lastKey: string | undefined;
  let planFrom: CameraPose | null = null;
  let planSince = 0;
  return {
    get mode() {
      return mode;
    },
    setMode(next, now) {
      if (next === mode) return;
      previous = mode;
      mode = next;
      since = now;
    },
    update(input, now, dt) {
      // Côté de la vue latérale : celui où le terrain est le plus bas (on voit le train, pas le talus), revu tous les 40 m.
      if (Math.abs(input.head - sideCheck) > 40) {
        sideCheck = input.head;
        const left = trackPoint(input.track, input.head - 10, -24, 0);
        const right = trackPoint(input.track, input.head - 10, 24, 0);
        side = input.ground(left.x, left.z) + 1 < input.ground(right.x, right.z) ? -1 : 1;
        // En gare, la vue latérale se place du côté opposé au quai (le bâtiment ne cache pas le train).
        if (input.station) side = input.station.side === "right" ? -1 : 1;
      }
      let pose = desiredPose(mode, input, side);
      // Changement de plan dans une même vue (entrée dans un tunnel…) : fondu depuis la dernière pose affichée.
      if (last && pose.key !== lastKey && !previous && mode !== "cab") {
        planFrom = last;
        planSince = now;
      }
      lastKey = pose.key;
      if (planFrom) {
        const t = (now - planSince) / TRANSITION_SECONDS;
        if (t >= 1) planFrom = null;
        else {
          const k = smooth(t);
          pose = { ...pose, eye: Vector3.Lerp(planFrom.eye, pose.eye, k), target: Vector3.Lerp(planFrom.target, pose.target, k) };
        }
      }
      if (previous) {
        const t = (now - since) / TRANSITION_SECONDS;
        if (t >= 1) previous = null;
        else {
          const from = desiredPose(previous, input, side);
          const k = smooth(t);
          pose = { eye: Vector3.Lerp(from.eye, pose.eye, k), target: Vector3.Lerp(from.target, pose.target, k), fov: from.fov + (pose.fov - from.fov) * k };
        }
      }
      // Bras à ressort : jamais d'œil dans la roche, les poutres ou un bâtiment (sauf en cabine, où l'on est assis).
      if (input.obstacles && (mode !== "cab" || previous)) pose = { ...pose, eye: resolveEye(pose.eye, pose.target, input.obstacles) };
      // Hors cabine, un léger amorti adoucit les courbes et les cahots ; la cabine reste rigide (on y est assis).
      if (last && mode !== "cab" && !previous && !planFrom) {
        const k = 1 - Math.exp(-dt / 0.12);
        pose = { eye: Vector3.Lerp(last.eye, pose.eye, k), target: Vector3.Lerp(last.target, pose.target, k), fov: pose.fov };
      }
      last = pose;
      return pose;
    },
  };
}
