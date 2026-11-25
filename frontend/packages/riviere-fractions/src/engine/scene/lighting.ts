import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";

// Éclairage de la rivière : un soleil (lumière directionnelle) qui projette de vraies ombres douces, un ciel
// (lumière hémisphérique) qui éclaire les faces à l'ombre d'un bleu léger, une brume de distance discrète, et un
// étalonnage des couleurs (exposition, contraste, saturation).
//
// Composants éprouvés de Babylon.js (Apache 2.0) : DirectionalLight, HemisphericLight, ShadowGenerator (filtrage PCF,
// repli Poisson en WebGL 1), StandardMaterial (éclairage, ombres, brume et étalonnage du paysage), ColorCurves.
// Écrit pour Yamba : le réglage de la lumière ; une carte d'ombre « régionale » qui couvre la rivière autour et devant
// le bateau et n'est redessinée que lorsqu'il a avancé (le paysage est immobile : inutile de la refaire à chaque
// image) ; le choix des objets qui projettent une ombre ; le même étalonnage dans nos matériaux écrits à la main.

/** Réglages de la lumière du niveau 1 : soleil de fin de matinée, assez haut pour garder la scène lumineuse. */
export const LIGHTING = {
  /** Direction vers le soleil (normalisée) : derrière le bateau, sur sa droite, à 48° au-dessus de l'horizon. */
  sunDirection: new Vector3(0.5, 0.74, -0.45).normalize(),
  sunColor: new Vector3(1, 0.94, 0.82),
  sunIntensity: 1.5,
  /** Lumière du ciel (faces tournées vers le haut) et lumière renvoyée par le sol (faces tournées vers le bas). */
  skyLight: new Vector3(0.62, 0.72, 0.9),
  groundLight: new Vector3(0.46, 0.42, 0.3),
  ambientIntensity: 0.86,
  skyZenith: new Vector3(0.2, 0.5, 0.92),
  skyHorizon: new Vector3(0.78, 0.88, 0.97),
  /** Brume de distance : les lointains bleuissent, le premier plan reste net. */
  fogColor: new Vector3(0.74, 0.85, 0.95),
  fogDensity: 0.002,
  /** Étalonnage : exposition (multiplicateur linéaire), contraste (1 = neutre), saturation (+100 = double). */
  exposure: 1.18,
  contrast: 1.1,
  saturation: 14,
} as const;

/** Valeurs prêtes pour les matériaux écrits à la main (eau, ciel, lanternes) : les mêmes intensités que le paysage. */
export const SHADER_LIGHT = {
  sunDirection: LIGHTING.sunDirection,
  sunColor: LIGHTING.sunColor.scale(LIGHTING.sunIntensity),
  skyLight: LIGHTING.skyLight.scale(LIGHTING.ambientIntensity),
  groundLight: LIGHTING.groundLight.scale(LIGHTING.ambientIntensity),
  skyZenith: LIGHTING.skyZenith,
  skyHorizon: LIGHTING.skyHorizon,
  fogColor: LIGHTING.fogColor,
  fogDensity: LIGHTING.fogDensity,
};

/**
 * Lumière du bateau du joueur : même ciel, soleil un peu plus doux. Ses peintures brillantes (orange, rouge) ont été
 * réglées et validées sous ce soleil ; sous le soleil plus fort du paysage, l'orange virerait au jaune.
 */
export const BOAT_LIGHT = { ...SHADER_LIGHT, sunColor: LIGHTING.sunColor.scale(1.05) };

/**
 * Carte d'ombre régionale : un carré de 200 m (vu du soleil) autour d'un point de la rivière devant le bateau. Elle
 * n'est redessinée que lorsque ce point change, tous les 40 m de progression.
 */
export const SHADOW_SETTINGS = { mapSize: 2048, frustum: 200, depth: 260 } as const;

export interface LightingOptions {
  /** Ombres portées (désactivables pour un appareil très modeste ou pour les tests). */
  shadows?: boolean;
  /** Étalonnage des couleurs. */
  grading?: boolean;
}

export interface SceneLighting {
  /** Matériau du paysage : couleurs des sommets, lumière du soleil et du ciel, ombres, brume, étalonnage. */
  readonly landscape: StandardMaterial;
  readonly shadows: ShadowGenerator | null;
  /**
   * Étalonnage pour nos matériaux écrits à la main (uniforme `grading` du fragment GRADE) : facteur d'exposition en
   * espace d'écran, part de contraste, facteur de saturation. (1, 0, 1) quand l'étalonnage est coupé.
   */
  readonly grading: Vector3;
  /** Recentre la carte d'ombre sur ce point (au niveau de l'eau) avec ces objets, et la redessine une fois. */
  setShadowRegion(focus: Vector3, casters: readonly AbstractMesh[]): void;
  /** Triangles dessinés lors du dernier tracé de la carte d'ombre, et nombre de tracés depuis le début. */
  shadowStats(): { triangles: number; renders: number };
}

const color3 = (v: Vector3) => new Color3(v.x, v.y, v.z);

export function createLighting(scene: Scene, options: LightingOptions = {}): SceneLighting {
  const toScene = LIGHTING.sunDirection.scale(-1);
  const sun = new DirectionalLight("sun", toScene, scene);
  sun.diffuse = color3(LIGHTING.sunColor);
  sun.specular = Color3.Black();
  sun.intensity = LIGHTING.sunIntensity;
  sun.autoUpdateExtends = false;
  sun.autoCalcShadowZBounds = false;
  sun.shadowFrustumSize = SHADOW_SETTINGS.frustum;
  sun.shadowMinZ = 0;
  sun.shadowMaxZ = SHADOW_SETTINGS.depth;

  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.diffuse = color3(LIGHTING.skyLight);
  sky.groundColor = color3(LIGHTING.groundLight);
  sky.specular = Color3.Black();
  sky.intensity = LIGHTING.ambientIntensity;

  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = LIGHTING.fogDensity;
  scene.fogColor = color3(LIGHTING.fogColor);
  scene.ambientColor = Color3.Black();

  // Paysage : pas de reflet spéculaire (fini l'aspect plastique), les deux faces éclairées (feuillages, toits).
  const landscape = new StandardMaterial("landscape", scene);
  landscape.diffuseColor = Color3.White();
  landscape.specularColor = Color3.Black();
  landscape.backFaceCulling = false;
  landscape.twoSidedLighting = true;

  // Étalonnage appliqué par le matériau du paysage lui-même (pas de passe supplémentaire en fin de rendu).
  const grade = options.grading !== false;
  const config = scene.imageProcessingConfiguration;
  config.toneMappingEnabled = false;
  config.exposure = grade ? LIGHTING.exposure : 1;
  config.contrast = grade ? LIGHTING.contrast : 1;
  const curves = new ColorCurves();
  curves.globalSaturation = LIGHTING.saturation;
  config.colorCurves = curves;
  config.colorCurvesEnabled = grade;
  // Mêmes opérations pour nos matériaux : exposition (en espace linéaire, ramenée ici en espace d'écran), contraste,
  // saturation — dans cet ordre, comme Babylon (imageProcessingFunctions).
  const grading = grade ? new Vector3(LIGHTING.exposure ** (1 / 2.2), LIGHTING.contrast - 1, 1 + LIGHTING.saturation / 100) : new Vector3(1, 0, 1);

  let shadows: ShadowGenerator | null = null;
  let renders = 0;
  let lastTriangles = 0;
  if (options.shadows !== false) {
    const generator = new ShadowGenerator(SHADOW_SETTINGS.mapSize, sun);
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    generator.bias = 0.003;
    generator.normalBias = 0.1;
    generator.frustumEdgeFalloff = 0.3;
    generator.setDarkness(0);
    const map = generator.getShadowMap()!;
    map.renderList = [];
    map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    map.onBeforeRenderObservable.add(() => {
      renders += 1;
      lastTriangles = (map.renderList ?? []).reduce((sum, mesh) => sum + (mesh.isEnabled() ? mesh.getTotalIndices() / 3 : 0), 0);
    });
    shadows = generator;
  }

  // Repère de la lumière, comme Babylon le construit (LookAtLH, haut = +y) : pour caler la carte sur ses texels.
  const zAxis = toScene.normalizeToNew();
  const xAxis = Vector3.Cross(Vector3.Up(), zAxis).normalize();
  const yAxis = Vector3.Cross(zAxis, xAxis).normalize();
  const texel = SHADOW_SETTINGS.frustum / SHADOW_SETTINGS.mapSize;
  const center = new Vector3();

  return {
    landscape,
    shadows,
    grading,
    setShadowRegion(focus, casters) {
      const map = shadows?.getShadowMap();
      if (!map) return;
      const x = Math.round(Vector3.Dot(focus, xAxis) / texel) * texel;
      const y = Math.round(Vector3.Dot(focus, yAxis) / texel) * texel;
      const z = Vector3.Dot(focus, zAxis);
      center.copyFrom(xAxis).scaleInPlace(x).addInPlace(yAxis.scale(y)).addInPlace(zAxis.scale(z));
      sun.position.copyFrom(center).subtractInPlace(zAxis.scale(SHADOW_SETTINGS.depth / 2));
      map.renderList = [...casters];
      map.resetRefreshCounter();
    },
    shadowStats() {
      return { triangles: Math.round(lastTriangles), renders };
    },
  };
}
