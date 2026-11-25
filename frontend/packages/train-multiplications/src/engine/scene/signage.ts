import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh as MeshClass, type Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { OUTDOOR } from "./lighting";

// Panneaux à texte : noms des gares, plaques des tunnels. Le texte est dessiné une fois dans une petite texture
// (canevas), lisible des deux côtés du panneau.
//
// Écrit pour Yamba.

export interface BoardStyle {
  background: string;
  border: string;
  color: string;
  /** Hauteur du texte, en part de la hauteur du panneau. */
  size?: number;
}

export function textBoard(scene: Scene, name: string, text: string, width: number, height: number, style: BoardStyle, layer = OUTDOOR): Mesh {
  const ratio = width / height;
  const h = 128;
  const w = Math.min(1024, Math.round(h * ratio));
  const texture = new DynamicTexture(`${name}-text`, { width: w, height: h }, scene, true);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = style.border;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = style.background;
  ctx.fillRect(7, 7, w - 14, h - 14);
  ctx.fillStyle = style.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = Math.round(h * (style.size ?? 0.52));
  ctx.font = `700 ${size}px "Trebuchet MS", system-ui, sans-serif`;
  while (ctx.measureText(text).width > w - 28 && size > 12) {
    size -= 2;
    ctx.font = `700 ${size}px "Trebuchet MS", system-ui, sans-serif`;
  }
  ctx.fillText(text, w / 2, h / 2 + 2);
  texture.update();
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseTexture = texture;
  material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(0.25, 0.25, 0.25);
  material.backFaceCulling = true;
  // Deux faces simples dos à dos : le texte se lit à l'endroit des deux côtés.
  const plane = CreatePlane(name, { width, height }, scene);
  const back = CreatePlane(`${name}-back`, { width, height }, scene);
  back.parent = plane;
  back.rotation.y = Math.PI;
  for (const face of [plane, back]) {
    face.material = material;
    face.layerMask = layer;
    face.isPickable = false;
  }
  return plane;
}

/**
 * Panneaux regroupés : tous les textes dans une seule texture (une ligne de 128 pixels par panneau) et tous les
 * panneaux dans un seul maillage, lisible des deux côtés. Un seul appel de dessin pour toute la signalétique.
 */
export interface BoardAtlas {
  add(text: string, width: number, height: number, style: BoardStyle, position: Vector3, rotationY: number): void;
  build(): Mesh | null;
}

export function createBoardAtlas(scene: Scene, name: string, layer = OUTDOOR): BoardAtlas {
  const W = 1024;
  const ROW = 128;
  const boards: { text: string; width: number; height: number; style: BoardStyle; position: Vector3; rotationY: number }[] = [];
  return {
    add(text, width, height, style, position, rotationY) {
      boards.push({ text, width, height, style, position: position.clone(), rotationY });
    },
    build() {
      if (boards.length === 0) return null;
      const H = Math.max(ROW, 2 ** Math.ceil(Math.log2(boards.length * ROW)));
      const texture = new DynamicTexture(`${name}-atlas`, { width: W, height: H }, scene, true);
      const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      boards.forEach((board, row) => {
        const w = Math.min(W, Math.round(ROW * (board.width / board.height)));
        const y0 = row * ROW;
        ctx.fillStyle = board.style.border;
        ctx.fillRect(0, y0, w, ROW);
        ctx.fillStyle = board.style.background;
        ctx.fillRect(7, y0 + 7, w - 14, ROW - 14);
        ctx.fillStyle = board.style.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let size = Math.round(ROW * (board.style.size ?? 0.52));
        ctx.font = `700 ${size}px "Trebuchet MS", system-ui, sans-serif`;
        while (ctx.measureText(board.text).width > w - 28 && size > 12) {
          size -= 2;
          ctx.font = `700 ${size}px "Trebuchet MS", system-ui, sans-serif`;
        }
        ctx.fillText(board.text, w / 2, y0 + ROW / 2 + 2);
        // Deux faces dos à dos : coordonnées de texture inversées sur la face arrière pour lire à l'endroit.
        const u1 = w / W;
        const vTop = 1 - y0 / H;
        const vBottom = 1 - (y0 + ROW) / H;
        const c = Math.cos(board.rotationY);
        const s = Math.sin(board.rotationY);
        const right = new Vector3(c, 0, -s);
        const normal = new Vector3(s, 0, c);
        for (const face of [1, -1]) {
          const base = positions.length / 3;
          const corners: [number, number, number, number][] = [
            [-1, -1, face > 0 ? u1 : 0, vBottom],
            [1, -1, face > 0 ? 0 : u1, vBottom],
            [1, 1, face > 0 ? 0 : u1, vTop],
            [-1, 1, face > 0 ? u1 : 0, vTop],
          ];
          for (const [sx, sy, u, v] of corners) {
            const p = board.position.add(right.scale((sx * board.width) / 2)).addInPlaceFromFloats(0, (sy * board.height) / 2, 0).addInPlace(normal.scale(face * 0.01));
            positions.push(p.x, p.y, p.z);
            normals.push(normal.x * face, 0, normal.z * face);
            uvs.push(u, v);
          }
          indices.push(...(face > 0 ? [base, base + 2, base + 1, base, base + 3, base + 2] : [base, base + 1, base + 2, base, base + 2, base + 3]));
        }
      });
      texture.update();
      const material = new StandardMaterial(`${name}-material`, scene);
      material.diffuseTexture = texture;
      material.specularColor = Color3.Black();
      material.emissiveColor = new Color3(0.25, 0.25, 0.25);
      const mesh = new MeshClass(name, scene);
      const data = new VertexData();
      data.positions = positions;
      data.normals = normals;
      data.uvs = uvs;
      data.indices = indices;
      data.applyToMesh(mesh);
      mesh.material = material;
      mesh.layerMask = layer;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
      return mesh;
    },
  };
}
