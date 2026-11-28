import { Constants } from "@babylonjs/core/Engines/constants";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { HDRFiltering } from "@babylonjs/core/Materials/Textures/Filtering/hdrFiltering";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import type { Scene } from "@babylonjs/core/scene";

// Environnement réfléchi des matériaux PBR, fabriqué sur place : on photographie une seule fois le ciel du hangar dans une carte
// cubique (sonde de réflexion), puis on la préfiltre pour les surfaces plus ou moins rugueuses. Aucun fichier à télécharger. Si le
// préfiltrage n'est pas disponible, les matériaux filtrent la carte eux-mêmes en temps réel, en basse qualité.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : ReflectionProbe, HDRFiltering. Même technique que le Train des multiplications 3D.
//
// Écrit pour Yamba.

export function createStudioEnvironment(scene: Scene, sky: Mesh, materials: () => readonly PBRMaterial[]): { dispose(): void } {
  const probe = new ReflectionProbe("studio-probe", 128, scene, true, true);
  probe.renderList!.push(sky);
  probe.position = new Vector3(0, 0.4, 0);
  probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  const texture = probe.cubeTexture;
  texture.gammaSpace = true;
  scene.customRenderTargets.push(texture);
  const realtime = () => {
    for (const m of materials()) {
      m.realTimeFiltering = true;
      m.realTimeFilteringQuality = Constants.TEXTURE_FILTERING_QUALITY_LOW;
    }
    scene.environmentTexture = texture;
  };
  texture.onAfterRenderObservable.add((face) => {
    if (face !== 5) return;
    texture.onAfterRenderObservable.clear();
    scene.customRenderTargets.splice(scene.customRenderTargets.indexOf(texture), 1);
    try {
      new HDRFiltering(scene.getEngine())
        .prefilter(texture)
        .then(() => {
          scene.environmentTexture = texture;
        })
        .catch(realtime);
    } catch {
      realtime();
    }
  });
  return {
    dispose() {
      probe.dispose();
    },
  };
}
