import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

import { motorBoat, type BoatMesh } from "../geometry/boat";
import { initialMotion, stepMotion, type BoatMotion } from "../navigation/boatMotion";
import { BOAT_FRAGMENT, BOAT_VERTEX } from "./boatShaders";

// Le bateau à moteur du joueur dans la scène : trois maillages et un seul matériau. La coque et tout ce qui est fixé
// dessus forment un maillage ; le moteur hors-bord pivote sur son axe ; l'hélice tourne sur son moyeu. Le bateau est
// posé sur l'eau à chaque image, puis animé par `stepMotion` (TypeScript pur, testé à part).

export interface BoatLighting {
  sunDirection: Vector3;
  sunColor: Vector3;
  skyLight: Vector3;
  groundLight: Vector3;
  skyZenith: Vector3;
  skyHorizon: Vector3;
  fogColor: Vector3;
  fogDensity: number;
}

export interface PlayerBoatFrame {
  /** Position (monde) et cap (rad) donnés par la navigation. */
  x: number;
  z: number;
  heading: number;
  speed: number;
  lateral: number;
  steer: number;
  moored: boolean;
  dt: number;
  time: number;
  /** Hauteur de l'eau en un point du monde. */
  waterAt: (x: number, z: number) => number;
}

export interface PlayerBoat {
  readonly root: TransformNode;
  readonly material: ShaderMaterial;
  readonly length: number;
  readonly beam: number;
  /** Pose le bateau sur l'eau et l'anime pour cette image. */
  update(frame: PlayerBoatFrame): void;
  /** Remet l'animation au repos (nouvelle traversée). */
  reset(): void;
  /** État de l'animation (mesures et tests). */
  getMotion(): BoatMotion;
}

const BOAT_UNIFORMS = ["world", "viewProjection", "eyePosition", "sunDirection", "fillDirection", "sunColor", "skyLight", "groundLight", "skyZenith", "skyHorizon", "fogColor", "fogDensity", "pulse", "grading"];

function toVertexData(mesh: BoatMesh): VertexData {
  const data = new VertexData();
  const count = mesh.positions.length / 3;
  const uvs = new Float32Array(count * 2);
  const uvs2 = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    uvs[i * 2] = mesh.paint[i * 4];
    uvs[i * 2 + 1] = mesh.paint[i * 4 + 1];
    uvs2[i * 2] = mesh.paint[i * 4 + 2];
    uvs2[i * 2 + 1] = mesh.paint[i * 4 + 3];
  }
  data.positions = new Float32Array(mesh.positions);
  data.normals = new Float32Array(mesh.normals);
  data.colors = new Float32Array(mesh.colors);
  data.uvs = uvs;
  data.uvs2 = uvs2;
  data.indices = count > 65535 ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices);
  return data;
}

/** Matériau du bateau : finitions par sommet (peinture, chrome, tissu, lumières) et décoration de la coque. */
export function createBoatMaterial(scene: Scene, lighting: BoatLighting, grading: Vector3 = new Vector3(1, 0, 1)): ShaderMaterial {
  const material = new ShaderMaterial("player-boat", scene, { vertexSource: BOAT_VERTEX, fragmentSource: BOAT_FRAGMENT }, { attributes: ["position", "normal", "color", "uv", "uv2"], uniforms: BOAT_UNIFORMS });
  material.setVector3("grading", grading);
  material.backFaceCulling = false;
  material.setVector3("sunDirection", lighting.sunDirection);
  // Lumière d'appoint opposée au soleil, un peu plongeante : les flancs à l'ombre restent lisibles.
  material.setVector3("fillDirection", new Vector3(-lighting.sunDirection.x, 0.35, -lighting.sunDirection.z).normalize());
  material.setVector3("sunColor", lighting.sunColor);
  material.setVector3("skyLight", lighting.skyLight);
  material.setVector3("groundLight", lighting.groundLight);
  material.setVector3("skyZenith", lighting.skyZenith);
  material.setVector3("skyHorizon", lighting.skyHorizon);
  material.setVector3("fogColor", lighting.fogColor);
  material.setFloat("fogDensity", lighting.fogDensity);
  material.setFloat("pulse", 1);
  return material;
}

/** Demi-longueur et demi-largeur des points où l'on mesure l'eau sous le bateau. */
const SAMPLE_HALF_LENGTH = 2.1;
const SAMPLE_HALF_BEAM = 0.8;

export function createPlayerBoat(scene: Scene, lighting: BoatLighting, shadowMaterial: ShaderMaterial, grading?: Vector3): PlayerBoat {
  const model = motorBoat();
  const material = createBoatMaterial(scene, lighting, grading);
  const root = new TransformNode("player", scene);
  const make = (name: string, data: BoatMesh, parent: TransformNode) => {
    const mesh = new Mesh(name, scene);
    toVertexData(data).applyToMesh(mesh, false);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.parent = parent;
    return mesh;
  };
  make("player-body", model.body, root);
  const pivot = new TransformNode("player-outboard", scene);
  pivot.parent = root;
  pivot.position.set(...model.outboardPivot);
  make("player-outboard-body", model.outboard, pivot);
  const propeller = make("player-propeller", model.propeller, pivot);
  propeller.position.set(...model.propellerHub);

  const shadow = new Mesh("player-shadow", scene);
  const quad = new VertexData();
  quad.positions = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
  quad.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  quad.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
  quad.indices = [0, 1, 2, 0, 2, 3];
  quad.applyToMesh(shadow, false);
  shadow.material = shadowMaterial;
  shadow.isPickable = false;
  shadow.rotation.x = Math.PI / 2;
  shadow.scaling.set(model.beam * 1.45, model.length * 1.12, 1);

  let motion = initialMotion();

  return {
    root,
    material,
    length: model.length,
    beam: model.beam,
    update(frame) {
      const fx = Math.sin(frame.heading);
      const fz = Math.cos(frame.heading);
      const front = frame.waterAt(frame.x + fx * SAMPLE_HALF_LENGTH, frame.z + fz * SAMPLE_HALF_LENGTH);
      const rear = frame.waterAt(frame.x - fx * SAMPLE_HALF_LENGTH, frame.z - fz * SAMPLE_HALF_LENGTH);
      const starboard = frame.waterAt(frame.x + fz * SAMPLE_HALF_BEAM, frame.z - fx * SAMPLE_HALF_BEAM);
      const port = frame.waterAt(frame.x - fz * SAMPLE_HALF_BEAM, frame.z + fx * SAMPLE_HALF_BEAM);
      motion = stepMotion(motion, {
        dt: frame.dt,
        time: frame.time,
        speed: frame.speed,
        lateral: frame.lateral,
        steer: frame.steer,
        moored: frame.moored,
        wavePitch: -Math.atan2(front - rear, SAMPLE_HALF_LENGTH * 2) * 0.8,
        waveRoll: Math.atan2(starboard - port, SAMPLE_HALF_BEAM * 2) * 0.6,
      });
      root.position.set(frame.x, (front + rear + starboard + port) / 4 + motion.heave - 0.02, frame.z);
      root.rotation.set(motion.pitch, frame.heading, motion.roll);
      pivot.rotation.y = motion.outboardYaw;
      propeller.rotation.z = motion.propeller;
      shadow.position.set(frame.x - fx * 0.25, 0.03, frame.z - fz * 0.25);
      shadow.rotation.y = frame.heading;
      // Gyrophare : un éclat bref toutes les secondes.
      material.setFloat("pulse", Math.pow(0.5 + 0.5 * Math.sin(frame.time * 6.2), 4));
    },
    reset() {
      motion = initialMotion();
    },
    getMotion() {
      return motion;
    },
  };
}
