import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import { HDRFiltering } from "@babylonjs/core/Materials/Textures/Filtering/hdrFiltering";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

// Environnement réfléchi des matériaux PBR, fabriqué sur place : on photographie une seule fois le dôme du ciel dans
// une carte cubique (sonde de réflexion), puis on la préfiltre (une version de plus en plus floue par niveau de mip,
// pour les surfaces de plus en plus rugueuses). Aucun fichier d'environnement à télécharger.
//
// Si le préfiltrage n'est pas disponible sur l'appareil, les matériaux filtrent la carte eux-mêmes, en temps réel,
// au plus bas niveau de qualité (un peu plus coûteux, mais identique à l'œil).
//
// Composants éprouvés de Babylon.js (Apache 2.0) : ReflectionProbe, HDRFiltering, filtrage en temps réel du PBR.
//
// Écrit pour Yamba.

export interface SkyEnvironment {
  /** « prefiltered » : carte préfiltrée ; « realtime » : filtrage par les matériaux ; « none » : pas encore prête. */
  readonly mode: "prefiltered" | "realtime" | "none";
  dispose(): void;
}

export function createSkyEnvironment(scene: Scene, sky: Mesh, materials: () => readonly PBRMaterial[]): SkyEnvironment {
  const probe = new ReflectionProbe("sky-probe", 128, scene, true, true);
  probe.renderList!.push(sky);
  probe.position = new Vector3(0, 20, 0);
  probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  const texture = probe.cubeTexture;
  // Le dôme est dessiné dans l'espace des couleurs de l'écran : on le déclare tel quel.
  texture.gammaSpace = true;
  const state = { mode: "none" as SkyEnvironment["mode"] };
  // La sonde n'est dessinée que si un matériau la réclame : on la demande nous-mêmes, une fois.
  scene.customRenderTargets.push(texture);
  const realtime = () => {
    for (const m of materials()) {
      m.realTimeFiltering = true;
      m.realTimeFilteringQuality = Constants.TEXTURE_FILTERING_QUALITY_LOW;
    }
    scene.environmentTexture = texture;
    state.mode = "realtime";
  };
  texture.onAfterRenderObservable.add((face) => {
    if (face !== 5) return;
    texture.onAfterRenderObservable.clear();
    scene.customRenderTargets.splice(scene.customRenderTargets.indexOf(texture), 1);
    try {
      const filtering = new HDRFiltering(scene.getEngine());
      filtering
        .prefilter(texture)
        .then(() => {
          scene.environmentTexture = texture;
          state.mode = "prefiltered";
        })
        .catch(realtime);
    } catch {
      realtime();
    }
  });
  return {
    get mode() {
      return state.mode;
    },
    dispose() {
      probe.dispose();
    },
  };
}
