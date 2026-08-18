// Scène 3D Babylon.js du Niveau 1 de Flux Forge. Suit le pont imperatif déjà
// utilisé par Turbo Pulse (voir TurboPulseGame.ts) : mountFluxForgeGame(host,
// callbacks) monte le moteur dans un simple <div> hôte et rend un contrôleur
// que la page React pilote (syncState) sans jamais manipuler Babylon
// directement. Imports strictement modulaires (jamais le barrel
// "@babylonjs/core") pour ne pas embarquer PBR/GLTF/physique inutilisés ici —
// convention reprise du spike spike/babylon-barrage.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";
// Import à effet de bord : Babylon expose Ray sous une forme "pure" et
// arborescente (tree-shakeable) par défaut, dont les méthodes d'intersection
// (intersectsMesh, utilisée par scene.pick/ActionManager.OnPickTrigger pour
// la sélection clic/touch) ne sont que des bouchons muets tant que ce module
// n'est pas importé pour les enregistrer réellement. Sans cette ligne, le
// clic/tap sur un mur/porte/toit fantôme ne sélectionne jamais rien.
import "@babylonjs/core/Culling/ray";

import {
  PART_ORDER,
  type Exercise,
  type HouseIndex,
  type HousePart,
  type LevelState,
  type ResolvedExercises,
} from "./flux-forge-engine";

export interface FluxForgeCallbacks {
  /** L'enfant a touché/cliqué l'élément actif (ghost ou bloc déjà construit pour l'étape conversion). */
  onPartSelected: (houseIndex: HouseIndex, part: HousePart) => void;
}

export interface FluxForgeController {
  destroy(): void;
  refreshLayout(): void;
  /** Reflète l'état du niveau dans la scène 3D : construit/déverrouille/anime les éléments concernés. */
  syncState(state: LevelState, exercises: ResolvedExercises): void;
  /**
   * Déclenche la même logique de sélection que le clic sur l'élément actif,
   * utilisé par le pont drag & drop (palette DOM déposée sur le canevas) —
   * clic et drag aboutissent ainsi exactement au même point d'entrée.
   */
  activateCurrentPart(): boolean;
}

const HOUSE_SPACING = 9;
const BLOCK_OFFSET_X = 3.4;
const BLOCK_OFFSET_Z = -3.2;

const WALL_COLOR = new Color3(0.62, 0.45, 0.28);
const DOOR_COLOR = new Color3(0.32, 0.2, 0.11);
const ROOF_COLOR = new Color3(0.72, 0.32, 0.22);
const BLOCK_COLOR = new Color3(0.86, 0.56, 0.16);
const AXIS_COLORS: Record<"length" | "width" | "height", Color3> = {
  length: new Color3(0.93, 0.35, 0.35),
  width: new Color3(0.32, 0.65, 0.95),
  height: new Color3(0.35, 0.85, 0.5),
};

interface HouseMeshes {
  wall: Mesh | null;
  door: Mesh | null;
  roof: Mesh | null;
  block: Mesh | null;
}

interface MeasurementHandles {
  lines: Mesh[];
  labels: Mesh[];
}

function partColor(part: HousePart): Color3 {
  if (part === "wall") return WALL_COLOR;
  if (part === "door") return DOOR_COLOR;
  if (part === "roof") return ROOF_COLOR;
  return BLOCK_COLOR;
}

class FluxForgeScene {
  readonly engine: Engine;
  readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly callbacks: FluxForgeCallbacks;
  private readonly houseMeshes: [HouseMeshes, HouseMeshes, HouseMeshes] = [
    { wall: null, door: null, roof: null, block: null },
    { wall: null, door: null, roof: null, block: null },
    { wall: null, door: null, roof: null, block: null },
  ];
  private readonly ghostMaterials = new Map<string, StandardMaterial>();
  private readonly solidMaterials = new Map<string, StandardMaterial>();
  private measurement: MeasurementHandles = { lines: [], labels: [] };
  private activeMesh: Mesh | null = null;
  private lastState: LevelState | null = null;
  private pulseTime = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: FluxForgeCallbacks) {
    this.callbacks = callbacks;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.62, 0.82, 0.96, 1);

    this.camera = new ArcRotateCamera("camera", -Math.PI / 2, 1.05, 17, new Vector3(0, 1.4, 0), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerAlphaLimit = -Math.PI / 2 - 0.4;
    this.camera.upperAlphaLimit = -Math.PI / 2 + 0.4;
    this.camera.lowerBetaLimit = 0.75;
    this.camera.upperBetaLimit = 1.3;
    this.camera.lowerRadiusLimit = 9;
    this.camera.upperRadiusLimit = 24;
    this.camera.panningSensibility = 0;
    this.camera.wheelPrecision = 40;
    this.camera.pinchPrecision = 80;

    const sun = new HemisphericLight("sun", new Vector3(0.3, 1, 0.2), this.scene);
    sun.intensity = 0.95;
    sun.groundColor = new Color3(0.35, 0.4, 0.3);

    this.createGround();
    this.createHousePads();

    this.scene.onBeforeRenderObservable.add(() => this.tick());
  }

  private createGround() {
    const ground = MeshBuilder.CreateGround("ground", { width: 44, height: 26 }, this.scene);
    const mat = new StandardMaterial("ground-mat", this.scene);
    mat.diffuseColor = new Color3(0.55, 0.72, 0.42);
    mat.specularColor = Color3.Black();
    ground.material = mat;
    ground.isPickable = false;
  }

  private createHousePads() {
    for (let houseIndex = 0 as HouseIndex; houseIndex < 3; houseIndex++) {
      const pad = MeshBuilder.CreateGround(`house-${houseIndex}-pad`, { width: 6.4, height: 6.4 }, this.scene);
      const mat = new StandardMaterial(`house-${houseIndex}-pad-mat`, this.scene);
      mat.diffuseColor = new Color3(0.76, 0.66, 0.48);
      mat.specularColor = Color3.Black();
      pad.material = mat;
      pad.position.set(this.houseX(houseIndex), 0.01, 0);
      pad.isPickable = false;
    }
  }

  private houseX(houseIndex: HouseIndex): number {
    return (houseIndex - 1) * HOUSE_SPACING;
  }

  private getGhostMaterial(part: HousePart): StandardMaterial {
    const key = `ghost-${part}`;
    let mat = this.ghostMaterials.get(key);
    if (!mat) {
      mat = new StandardMaterial(key, this.scene);
      const color = partColor(part);
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.5);
      mat.alpha = 0.35;
      mat.backFaceCulling = false;
      this.ghostMaterials.set(key, mat);
    }
    return mat;
  }

  private getSolidMaterial(part: HousePart): StandardMaterial {
    const key = `solid-${part}`;
    let mat = this.solidMaterials.get(key);
    if (!mat) {
      mat = new StandardMaterial(key, this.scene);
      mat.diffuseColor = partColor(part);
      mat.specularColor = new Color3(0.12, 0.12, 0.12);
      this.solidMaterials.set(key, mat);
    }
    return mat;
  }

  private wireInteraction(mesh: Mesh, houseIndex: HouseIndex, part: HousePart) {
    mesh.actionManager = new ActionManager(this.scene);
    mesh.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.callbacks.onPartSelected(houseIndex, part);
      }),
    );
  }

  private ensureWall(houseIndex: HouseIndex, exercise: Exercise): Mesh {
    const meshes = this.houseMeshes[houseIndex];
    if (meshes.wall) return meshes.wall;
    const length = exercise.dimensions.length ?? 4;
    const height = exercise.dimensions.height ?? 2;
    const wall = MeshBuilder.CreateBox(`house-${houseIndex}-wall`, { width: length, height, depth: 0.32 }, this.scene);
    wall.position.set(this.houseX(houseIndex), height / 2, 0);
    this.wireInteraction(wall, houseIndex, "wall");
    meshes.wall = wall;
    return wall;
  }

  private ensureDoor(houseIndex: HouseIndex, exercise: Exercise): Mesh {
    const meshes = this.houseMeshes[houseIndex];
    if (meshes.door) return meshes.door;
    const width = exercise.dimensions.width ?? 1;
    const height = exercise.dimensions.height ?? 2;
    const door = MeshBuilder.CreateBox(`house-${houseIndex}-door`, { width, height, depth: 0.4 }, this.scene);
    door.position.set(this.houseX(houseIndex), height / 2, 0);
    this.wireInteraction(door, houseIndex, "door");
    meshes.door = door;
    return door;
  }

  private ensureRoof(houseIndex: HouseIndex, exercise: Exercise, wallHeight: number): Mesh {
    const meshes = this.houseMeshes[houseIndex];
    if (meshes.roof) return meshes.roof;
    const length = exercise.dimensions.length ?? 5;
    const width = exercise.dimensions.width ?? 3;
    const roof = MeshBuilder.CreateCylinder(`house-${houseIndex}-roof`, { height: length, diameter: width, tessellation: 3 }, this.scene);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(this.houseX(houseIndex), wallHeight + width * 0.32, 0);
    this.wireInteraction(roof, houseIndex, "roof");
    meshes.roof = roof;
    return roof;
  }

  private ensureBlock(houseIndex: HouseIndex, exercise: Exercise): Mesh {
    const meshes = this.houseMeshes[houseIndex];
    if (meshes.block) return meshes.block;
    const { length = 2, width = 2, height = 1 } = exercise.dimensions;
    const block = MeshBuilder.CreateBox(`house-${houseIndex}-block`, { width: length, height, depth: width }, this.scene);
    block.position.set(this.houseX(houseIndex) + BLOCK_OFFSET_X, height / 2, BLOCK_OFFSET_Z);
    meshes.block = block;
    return block;
  }

  private meshForPart(houseIndex: HouseIndex, part: HousePart, exercise: Exercise, wallHeightHint: number): Mesh {
    if (part === "wall") return this.ensureWall(houseIndex, exercise);
    if (part === "door") return this.ensureDoor(houseIndex, exercise);
    if (part === "roof") return this.ensureRoof(houseIndex, exercise, wallHeightHint);
    return this.ensureBlock(houseIndex, exercise);
  }

  private clearMeasurement() {
    this.measurement.lines.forEach((mesh) => mesh.dispose());
    this.measurement.labels.forEach((mesh) => mesh.dispose());
    this.measurement = { lines: [], labels: [] };
  }

  private addMeasurementLine(from: Vector3, to: Vector3, axis: "length" | "width" | "height", text: string) {
    const line = MeshBuilder.CreateDashedLines(`measure-line-${this.measurement.lines.length}`, { points: [from, to], dashSize: 3, gapSize: 2, dashNb: 40 }, this.scene);
    line.color = AXIS_COLORS[axis];
    line.isPickable = false;
    this.measurement.lines.push(line);

    const mid = Vector3.Center(from, to);
    const label = this.createLabel(text, mid, AXIS_COLORS[axis]);
    this.measurement.labels.push(label);
  }

  private createLabel(text: string, position: Vector3, color: Color3): Mesh {
    const plane = MeshBuilder.CreatePlane(`label-${text}-${position.x}-${position.y}-${position.z}`, { width: 1.6, height: 0.7 }, this.scene);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.position = position.clone();
    plane.isPickable = false;

    const texture = new DynamicTexture(`label-tex-${text}`, { width: 256, height: 128 }, this.scene, true);
    // getContext() renvoie le type minimal ICanvasRenderingContext de Babylon
    // (sans textAlign/textBaseline) : le contexte réel est bien un
    // CanvasRenderingContext2D complet en environnement navigateur.
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffffee";
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = "#17324a";
    ctx.font = "bold 56px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 68);
    texture.update();

    const mat = new StandardMaterial(`label-mat-${text}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = Color3.White();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    plane.material = mat;
    return plane;
  }

  private showMeasurementsFor(houseIndex: HouseIndex, part: HousePart, mesh: Mesh, exercise: Exercise) {
    this.clearMeasurement();
    const { length, width, height } = exercise.dimensions;
    const houseX = this.houseX(houseIndex);
    const base = mesh.position;

    if (part === "wall" || part === "door") {
      if (length !== undefined) {
        const y = base.y - (height ?? 2) / 2 - 0.35;
        this.addMeasurementLine(new Vector3(houseX - length / 2, y, base.z), new Vector3(houseX + length / 2, y, base.z), "length", `${length} m`);
      }
      if (width !== undefined) {
        const y = base.y - height! / 2 - 0.35;
        this.addMeasurementLine(new Vector3(houseX - width / 2, y, base.z), new Vector3(houseX + width / 2, y, base.z), "width", `${width} m`);
      }
      if (height !== undefined) {
        const x = houseX + (length ?? width ?? 1) / 2 + 0.5;
        this.addMeasurementLine(new Vector3(x, base.y - height / 2, base.z), new Vector3(x, base.y + height / 2, base.z), "height", `${height} m`);
      }
    } else if (part === "roof") {
      if (length !== undefined) {
        const y = base.y + 1.1;
        this.addMeasurementLine(new Vector3(houseX - length / 2, y, base.z), new Vector3(houseX + length / 2, y, base.z), "length", `${length} m`);
      }
      if (width !== undefined) {
        const y = base.y + 1.6;
        this.addMeasurementLine(new Vector3(houseX, y, base.z - width / 2), new Vector3(houseX, y, base.z + width / 2), "width", `${width} m`);
      }
    } else {
      const l = length ?? 2;
      const w = width ?? 2;
      const h = height ?? 1;
      this.addMeasurementLine(new Vector3(base.x - l / 2, base.y - h / 2 - 0.3, base.z), new Vector3(base.x + l / 2, base.y - h / 2 - 0.3, base.z), "length", `${l} m`);
      this.addMeasurementLine(new Vector3(base.x + l / 2 + 0.4, base.y - h / 2, base.z), new Vector3(base.x + l / 2 + 0.4, base.y - h / 2, base.z + w), "width", `${w} m`);
      this.addMeasurementLine(new Vector3(base.x - l / 2 - 0.4, base.y - h / 2, base.z), new Vector3(base.x - l / 2 - 0.4, base.y + h / 2, base.z), "height", `${h} m`);
    }
  }

  private focusHouse(houseIndex: HouseIndex, animate: boolean) {
    const targetX = this.houseX(houseIndex);
    if (!animate) {
      this.camera.target.set(targetX, 1.4, 0);
      return;
    }
    const startX = this.camera.target.x;
    const frames = 30;
    let frame = 0;
    const step = () => {
      frame += 1;
      const t = frame / frames;
      this.camera.target.x = startX + (targetX - startX) * t;
      if (frame < frames) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private focusVillage() {
    const startX = this.camera.target.x;
    const startRadius = this.camera.radius;
    const frames = 40;
    let frame = 0;
    const step = () => {
      frame += 1;
      const t = frame / frames;
      this.camera.target.x = startX * (1 - t);
      this.camera.radius = startRadius + (24 - startRadius) * t;
      if (frame < frames) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private tick() {
    this.pulseTime += this.engine.getDeltaTime() / 1000;
    if (this.activeMesh) {
      const material = this.activeMesh.material as StandardMaterial | null;
      if (material && material.alpha < 1) {
        material.alpha = 0.3 + Math.sin(this.pulseTime * 3) * 0.12 + 0.12;
      } else if (material) {
        material.emissiveColor = partColor(this.currentPulsePart()).scale(0.35 + Math.abs(Math.sin(this.pulseTime * 3)) * 0.3);
      }
    }
  }

  private currentPulsePart(): HousePart {
    return this.lastState?.currentPart ?? "wall";
  }

  syncState(state: LevelState, exercises: ResolvedExercises) {
    const previousState = this.lastState;
    this.lastState = state;

    for (let houseIndex = 0 as HouseIndex; houseIndex < 3; houseIndex++) {
      const houseState = state.houses[houseIndex];
      const houseExercises = exercises[houseIndex];

      for (const part of PART_ORDER) {
        const status = houseState[part];
        if (status === "locked") continue;
        const exercise = houseExercises[part];
        if (!exercise) continue;

        // La conversion réutilise la géométrie du bloc de volume : aucune
        // nouvelle géométrie à créer, seulement (re)donner le focus au bloc.
        const wallHeightHint = houseExercises.wall?.dimensions.height ?? 2;
        const mesh = part === "conversion" ? this.houseMeshes[houseIndex].block : this.meshForPart(houseIndex, part, exercise, wallHeightHint);
        if (!mesh) continue;

        if (status === "active") {
          const ghostPart = part === "conversion" ? "volume" : part;
          mesh.material = part === "conversion" ? this.getSolidMaterial("volume") : this.getGhostMaterial(ghostPart);
          mesh.isPickable = true;
          if (this.activeMesh !== mesh) {
            this.activeMesh = mesh;
            this.showMeasurementsFor(houseIndex, part, mesh, exercise);
          }
        } else if (status === "completed") {
          mesh.material = this.getSolidMaterial(part === "conversion" ? "volume" : part);
          mesh.isPickable = false;
          if (this.activeMesh === mesh) {
            this.activeMesh = null;
          }
        }
      }
    }

    if (previousState?.currentHouse !== state.currentHouse) {
      this.focusHouse(state.currentHouse, previousState !== null);
    }
    if (!previousState?.levelCompleted && state.levelCompleted) {
      this.clearMeasurement();
      this.activeMesh = null;
      this.focusVillage();
    }
  }

  activateCurrentPart(): boolean {
    if (!this.lastState || this.lastState.currentPart === null) return false;
    this.callbacks.onPartSelected(this.lastState.currentHouse, this.lastState.currentPart);
    return true;
  }

  resize() {
    this.engine.resize();
  }

  dispose() {
    this.scene.dispose();
    this.engine.dispose();
  }
}

export function mountFluxForgeGame(host: HTMLElement, callbacks: FluxForgeCallbacks): FluxForgeController {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  host.appendChild(canvas);

  const flux = new FluxForgeScene(canvas, callbacks);
  flux.engine.resize();
  flux.engine.runRenderLoop(() => flux.scene.render());

  const handleWindowResize = () => flux.resize();
  const resizeObserver = new ResizeObserver(() => flux.resize());
  resizeObserver.observe(host);
  window.addEventListener("resize", handleWindowResize);

  return {
    destroy: () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      flux.dispose();
      host.removeChild(canvas);
    },
    refreshLayout: () => flux.resize(),
    syncState: (state, exercises) => flux.syncState(state, exercises),
    activateCurrentPart: () => flux.activateCurrentPart(),
  };
}
