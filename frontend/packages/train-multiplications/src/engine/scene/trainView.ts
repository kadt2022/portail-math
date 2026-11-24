import "@babylonjs/core/Meshes/thinInstanceMesh";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

import type { Consist, VehiclePose } from "../../domain/consist";
import {
  axle,
  connectingRod,
  CONNECTING_ROD,
  coupler,
  couplingRod,
  CRANK,
  cratePlaces,
  crosshead,
  CYLINDER_Y,
  locomotiveBody,
  MAIN_AXLE,
  mangoCrate,
  mangoCrateFar,
  spokedWheel,
  wheelFar,
  tenderBody,
  vehicleExtent,
  wagonBody,
  WHEEL_TRACK,
} from "../geometry/rollingStock";
import { emptyMesh, merge, type MeshData } from "../geometry/kit";
import { PALETTE } from "../geometry/palette";
import type { MaterialSet } from "./materials";
import { makeMesh } from "./meshes";

// Le train à l'écran. Chaque véhicule est un nœud posé à chaque image par la physique (position et orientation venues
// de ses deux appuis sur la voie). Ses pièces mobiles sont animées depuis la distance parcourue : les roues tournent
// d'un angle égal à distance / rayon (roulement sans glissement), les manivelles des deux côtés sont décalées d'un
// quart de tour, la bielle d'accouplement suit les manivelles, la bielle motrice relie la manivelle à la crosse, qui
// coulisse entre ses glissières.
//
// Chaque véhicule a son propre jeu de matériaux PBR (acier, peinture, laiton, bois…) : dans un tunnel, il s'assombrit
// progressivement, indépendamment des autres.
// Ses roues, ses bielles et ses caisses sont des instances légères ; roues et caisses ont une version lointaine
// (au-delà de 35 m et de 30 m) dix fois plus légère. Seules les caisses des véhicules projettent une ombre.
//
// Écrit pour Yamba.

interface VehicleParts {
  node: TransformNode;
  meshes: Mesh[];
  /** Caisse du véhicule (projette une ombre). */
  body?: Mesh;
  /** Roues : maillages (proche et lointain), essieux (z, rayon), tampon de matrices partagé. */
  wheels: { meshes: Mesh[]; axles: { z: number; radius: number }[]; buffer: Float32Array }[];
  material: MaterialSet;
  crates?: Mesh[];
}

export interface TrainView {
  readonly locomotive: TransformNode;
  /** Tous les maillages du train. */
  meshes(): Mesh[];
  /** Les caisses des véhicules (les seuls maillages du train qui projettent une ombre). */
  casters(): Mesh[];
  /**
   * Pose les véhicules, anime roues et bielles. `light` : éclairement de chaque véhicule, de 1 (grand air) à environ
   * 0,2 (au fond d'un tunnel), appliqué progressivement.
   */
  update(poses: readonly VehiclePose[], distance: number, light: readonly number[]): void;
  /** Nombre de caisses dans un wagon (indice dans la composition). */
  setCrates(vehicle: number, count: number): void;
  dispose(): void;
}

const tmp = new Matrix();
const spin = new Matrix();
const flip = Matrix.RotationY(Math.PI);

const basis = new Matrix();
/** Orientation depuis les trois axes du véhicule (lignes de la matrice de Babylon : droite, haut, avant). */
export function orient(right: readonly number[], up: readonly number[], forward: readonly number[], out: Quaternion): void {
  Matrix.FromValuesToRef(right[0], right[1], right[2], 0, up[0], up[1], up[2], 0, forward[0], forward[1], forward[2], 0, 0, 0, 0, 1, basis);
  Quaternion.FromRotationMatrixToRef(basis, out);
}

/** Matrice d'une roue : rotation sur son axe, retournement pour le côté droit, puis position dans le véhicule. */
function wheelMatrix(out: Float32Array, offset: number, side: -1 | 1, z: number, radius: number, angle: number): void {
  Matrix.RotationXToRef(side < 0 ? angle : -angle, spin);
  if (side > 0) spin.multiplyToRef(flip, spin);
  spin.setTranslationFromFloats(side * WHEEL_TRACK, radius, z);
  spin.copyToArray(out, offset);
}

export function createTrainView(scene: Scene, material: MaterialSet, consist: Consist): TrainView {
  const parts: VehicleParts[] = [];
  const templates = new Map<string, MeshData>();
  const template = (key: string, build: () => MeshData) => {
    if (!templates.has(key)) templates.set(key, build());
    return templates.get(key)!;
  };
  const add = (vehicle: VehicleParts, name: string, data: MeshData) => {
    const mesh = makeMesh(scene, name, data, vehicle.material);
    mesh.parent = vehicle.node;
    vehicle.meshes.push(mesh);
    return mesh;
  };
  /** Modèle et sa version lointaine, au-delà de `distance` mètres. */
  const addWithFar = (vehicle: VehicleParts, name: string, near: MeshData, far: MeshData, distance: number) => {
    const mesh = add(vehicle, name, near);
    const lod = add(vehicle, `${name}-far`, far);
    mesh.addLODLevel(distance, lod);
    return [mesh, lod];
  };
  const wheelSet = (vehicle: VehicleParts, name: string, data: MeshData, far: MeshData, axles: { z: number; radius: number }[]) => {
    const meshes = addWithFar(vehicle, name, data, far, 35);
    const buffer = new Float32Array(axles.length * 2 * 16);
    for (const mesh of meshes) mesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
    vehicle.wheels.push({ meshes, axles, buffer });
    // Les essieux eux-mêmes, immobiles en apparence (ronds), dans le même véhicule.
    const shafts = emptyMesh();
    for (const a of axles) {
      const shaft = axle(a.radius);
      for (let i = 0; i < shaft.positions.length; i += 3) {
        shaft.positions[i + 1] += a.radius;
        shaft.positions[i + 2] += a.z;
      }
      merge(shafts, shaft);
    }
    add(vehicle, `${name}-axles`, shafts);
  };

  consist.vehicles.forEach((vehicle, index) => {
    const node = new TransformNode(`vehicle-${index}`, scene);
    node.rotationQuaternion = Quaternion.Identity();
    const own = material.clone(`vehicle-${index}-material`);
    const v: VehicleParts = { node, meshes: [], wheels: [], material: own };
    parts.push(v);
    const kind = vehicle.spec.kind;
    const extent = vehicleExtent(kind);
    if (kind === "locomotive") {
      v.body = add(v, "locomotive", template("loco", locomotiveBody));
      wheelSet(v, "loco-pony", template("pony", () => spokedWheel(0.42, 8, PALETTE.red)), template("pony-far", () => wheelFar(0.42, PALETTE.red)), extent.axles.slice(0, 1));
      wheelSet(v, "loco-drivers", template("driver", () => spokedWheel(0.78, 14, PALETTE.red, true)), template("driver-far", () => wheelFar(0.78, PALETTE.red, true)), extent.axles.slice(1));
    } else if (kind === "tender") {
      v.body = add(v, "tender", template("tender", tenderBody));
      wheelSet(v, "tender-wheels", template("small", () => spokedWheel(0.46, 10, PALETTE.red)), template("small-far", () => wheelFar(0.46, PALETTE.red)), extent.axles);
    } else {
      const tone = [0, 0.35, -0.3, 0.18][index % 4];
      v.body = add(v, `wagon-${index}`, template(`wagon-${tone}`, () => wagonBody(tone)));
      wheelSet(v, `wagon-${index}-wheels`, template("small-black", () => spokedWheel(0.46, 10, PALETTE.black)), template("small-black-far", () => wheelFar(0.46, PALETTE.black)), extent.axles);
      v.crates = addWithFar(v, `wagon-${index}-crates`, template("crate", () => mangoCrate(1)), template("crate-far", () => mangoCrateFar(1)), 30);
    }
  });

  // Bielles et crosses : deux instances (gauche, droite) de chaque pièce, attachées à la locomotive.
  const loco = parts[0];
  const rods = add(loco, "coupling-rods", couplingRod());
  const mains = add(loco, "connecting-rods", connectingRod());
  const heads = add(loco, "crossheads", crosshead());
  const rodBuffers = { rods: new Float32Array(32), mains: new Float32Array(32), heads: new Float32Array(32) };
  rods.thinInstanceSetBuffer("matrix", rodBuffers.rods, 16, false);
  mains.thinInstanceSetBuffer("matrix", rodBuffers.mains, 16, false);
  heads.thinInstanceSetBuffer("matrix", rodBuffers.heads, 16, false);

  // Attelages entre véhicules, posés dans le monde à chaque image.
  const couplers = consist.vehicles.slice(1).map((_, i) => {
    const mesh = makeMesh(scene, `coupler-${i}`, template("coupler", coupler), parts[i].material);
    mesh.rotationQuaternion = Quaternion.Identity();
    return mesh;
  });

  const setCrates = (vehicle: number, count: number) => {
    const crates = parts[vehicle]?.crates;
    if (!crates) return;
    const places = cratePlaces(count);
    const buffer = new Float32Array(Math.max(1, places.length) * 16);
    places.forEach((p, i) => {
      Matrix.RotationY(i % 3 === 1 ? Math.PI : 0).multiplyToRef(Matrix.Translation(p[0], p[1], p[2]), tmp);
      tmp.copyToArray(buffer, i * 16);
    });
    for (const mesh of crates) {
      mesh.thinInstanceSetBuffer("matrix", buffer, 16, true);
      mesh.thinInstanceCount = places.length;
      mesh.isVisible = places.length > 0;
    }
  };
  consist.vehicles.forEach((vehicle, i) => setCrates(i, vehicle.crates));

  const locoExtent = vehicleExtent("locomotive");
  const drivers = locoExtent.axles.slice(1);
  const rest = new Vector3();
  const pin = new Vector3();
  const look = new Vector3();
  const up = new Vector3();

  return {
    locomotive: loco.node,
    meshes: () => [...parts.flatMap((p) => p.meshes), ...couplers],
    casters: () => parts.flatMap((p) => (p.body ? [p.body] : [])),
    update(poses, distance, light) {
      poses.forEach((pose, i) => {
        const vehicle = parts[i];
        vehicle.node.position.set(pose.position[0], pose.position[1], pose.position[2]);
        orient(pose.right, pose.up, pose.forward, vehicle.node.rotationQuaternion!);
        for (const set of vehicle.wheels) {
          set.axles.forEach((a, k) => {
            const angle = distance / a.radius;
            wheelMatrix(set.buffer, k * 32, -1, a.z, a.radius, angle);
            // Côté droit : manivelles en avance d'un quart de tour.
            wheelMatrix(set.buffer, k * 32 + 16, 1, a.z, a.radius, angle + (vehicle === loco ? Math.PI / 2 : 0));
          });
          for (const mesh of set.meshes) mesh.thinInstanceBufferUpdated("matrix");
        }
        // Éclairement : l'albédo et le reflet du ciel du jeu de matériaux du véhicule.
        vehicle.material.setLight(light[i] ?? 1);
      });
      // Bielles de la locomotive : position de la manivelle de chaque côté, calculée avec la matrice même de la roue.
      const wheel = new Float32Array(16);
      for (const [k, side] of [[0, -1], [1, 1]] as const) {
        const main = drivers[MAIN_AXLE - 1];
        const angle = distance / main.radius + (side > 0 ? Math.PI / 2 : 0);
        wheelMatrix(wheel, 0, side, main.z, main.radius, angle);
        Matrix.FromArrayToRef(wheel, 0, tmp);
        Vector3.TransformCoordinatesFromFloatsToRef(0, 0, CRANK, tmp, pin);
        // Bielle d'accouplement : translation (les manivelles tournent ensemble, la bielle reste horizontale).
        rest.set(side * WHEEL_TRACK, main.radius, main.z + CRANK);
        Matrix.TranslationToRef(pin.x - rest.x + side * (WHEEL_TRACK + 0.13), pin.y - rest.y, pin.z - rest.z, tmp);
        tmp.copyToArray(rodBuffers.rods, k * 16);
        // Bielle motrice et crosse : la crosse reste sur l'axe du cylindre, à la distance de la bielle.
        const dy = CYLINDER_Y - pin.y;
        const dz = Math.sqrt(Math.max(0, CONNECTING_ROD * CONNECTING_ROD - dy * dy));
        const x = side * (WHEEL_TRACK + 0.24);
        Matrix.RotationXToRef(Math.atan2(-dy, dz), spin);
        spin.setTranslationFromFloats(x, pin.y, pin.z);
        spin.copyToArray(rodBuffers.mains, k * 16);
        Matrix.TranslationToRef(side * 1.02, CYLINDER_Y, pin.z + dz, tmp);
        tmp.copyToArray(rodBuffers.heads, k * 16);
      }
      rods.thinInstanceBufferUpdated("matrix");
      mains.thinInstanceBufferUpdated("matrix");
      heads.thinInstanceBufferUpdated("matrix");
      // Attelages : du tampon arrière d'un véhicule au tampon avant du suivant.
      couplers.forEach((mesh, i) => {
        const a = poses[i];
        const b = poses[i + 1];
        const ra = vehicleExtent(consist.vehicles[i].spec.kind).rear;
        const fb = vehicleExtent(consist.vehicles[i + 1].spec.kind).front;
        const pa = new Vector3(a.position[0] + a.forward[0] * ra + a.up[0], a.position[1] + a.forward[1] * ra + a.up[1], a.position[2] + a.forward[2] * ra + a.up[2]);
        const pb = new Vector3(b.position[0] + b.forward[0] * fb + b.up[0], b.position[1] + b.forward[1] * fb + b.up[1], b.position[2] + b.forward[2] * fb + b.up[2]);
        mesh.position.copyFrom(pa).addInPlace(pb).scaleInPlace(0.5);
        look.copyFrom(pa).subtractInPlace(pb);
        if (look.lengthSquared() < 1e-6) look.set(a.forward[0], a.forward[1], a.forward[2]);
        look.normalize();
        up.set(a.up[0], a.up[1], a.up[2]);
        const right = Vector3.Cross(up, look).normalize();
        orient([right.x, right.y, right.z], [up.x, up.y, up.z], [look.x, look.y, look.z], mesh.rotationQuaternion!);
      });
    },
    setCrates,
    dispose() {
      for (const p of parts) {
        p.node.dispose(false, false);
        p.material.dispose();
      }
      for (const c of couplers) c.dispose(false, false);
    },
  };
}
