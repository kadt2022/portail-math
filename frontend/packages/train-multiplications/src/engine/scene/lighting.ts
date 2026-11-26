import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";

// Éclairage du monde ferroviaire. Au grand air : un soleil (lumière directionnelle) qui projette de vraies ombres
// douces, un ciel (lumière hémisphérique), une brume de distance discrète et un étalonnage des couleurs — les mêmes
// réglages que la Rivière des fractions. Sous terre : le soleil et le ciel n'éclairent plus rien ; la voûte est éclairée
// par ses luminaires (une lumière chaude et douce) et par le projecteur de la locomotive. La séparation passe par les
// masques de calque de Babylon.js : chaque maillage est « au grand air » ou « sous terre », et chaque lumière n'éclaire
// que son calque. Un véhicule qui entre dans un tunnel change de calque : il s'assombrit, éclairé par son projecteur.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : DirectionalLight, HemisphericLight, SpotLight, ShadowGenerator
// (filtrage PCF), StandardMaterial, ColorCurves. Repris de la Rivière des fractions (écrit pour Yamba) et adapté : la
// carte d'ombre suit le train à chaque image (il bouge), au lieu d'être redessinée par région.

export const OUTDOOR = 0x1;
export const UNDERGROUND = 0x2;

export const LIGHTING = {
  sunDirection: new Vector3(0.45, 0.78, -0.42).normalize(),
  sunColor: new Vector3(1, 0.94, 0.82),
  sunIntensity: 1.45,
  skyLight: new Vector3(0.62, 0.72, 0.9),
  groundLight: new Vector3(0.48, 0.44, 0.36),
  ambientIntensity: 0.84,
  skyZenith: new Vector3(0.2, 0.5, 0.92),
  skyHorizon: new Vector3(0.8, 0.89, 0.97),
  fogColor: new Vector3(0.76, 0.86, 0.95),
  fogDensity: 0.0016,
  exposure: 1.15,
  contrast: 1.1,
  saturation: 14,
  /** Sous terre : lumière de voûte chaude et douce (les luminaires), assez forte pour bien voir la voie et le train. */
  tunnelAmbient: new Vector3(0.66, 0.53, 0.38),
  tunnelAmbientIntensity: 0.95,
} as const;

export interface LightingOptions {
  shadows?: boolean;
  grading?: boolean;
  /** Taille de la carte d'ombre (texels) : 2048 par défaut, 1024 sur un appareil modeste. */
  shadowMapSize?: number;
}

export interface SceneLighting {
  readonly landscape: StandardMaterial;
  readonly shadows: ShadowGenerator | null;
  readonly grading: Vector3;
  /** Projecteur de la locomotive (n'éclaire que sous terre). */
  readonly headlight: SpotLight;
  /** Centre la carte d'ombre sur ce point et fixe les objets qui projettent une ombre. */
  setShadowFocus(focus: Vector3): void;
  setShadowCasters(casters: readonly AbstractMesh[]): void;
}

const color3 = (v: Vector3) => new Color3(v.x, v.y, v.z);

/** Demi-côté (m) du carré couvert par la carte d'ombre autour du train. */
export const SHADOW_FRUSTUM = 90;

export function createLighting(scene: Scene, options: LightingOptions = {}): SceneLighting {
  const toScene = LIGHTING.sunDirection.scale(-1);
  const sun = new DirectionalLight("sun", toScene, scene);
  sun.diffuse = color3(LIGHTING.sunColor);
  sun.specular = new Color3(0.25, 0.24, 0.22);
  sun.intensity = LIGHTING.sunIntensity;
  sun.includeOnlyWithLayerMask = OUTDOOR;
  sun.autoUpdateExtends = false;
  sun.autoCalcShadowZBounds = false;
  sun.shadowFrustumSize = SHADOW_FRUSTUM;
  sun.shadowMinZ = 0;
  sun.shadowMaxZ = 240;

  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.diffuse = color3(LIGHTING.skyLight);
  sky.groundColor = color3(LIGHTING.groundLight);
  sky.specular = Color3.Black();
  sky.intensity = LIGHTING.ambientIntensity;
  sky.includeOnlyWithLayerMask = OUTDOOR;

  const vault = new HemisphericLight("tunnel-vault", new Vector3(0, 1, 0), scene);
  vault.diffuse = color3(LIGHTING.tunnelAmbient);
  vault.groundColor = color3(LIGHTING.tunnelAmbient.scale(0.5));
  vault.specular = Color3.Black();
  vault.intensity = LIGHTING.tunnelAmbientIntensity;
  vault.includeOnlyWithLayerMask = UNDERGROUND;

  const headlight = new SpotLight("headlight", new Vector3(0, 3, 5), new Vector3(0, -0.08, 1), Math.PI / 3.6, 3, scene);
  headlight.diffuse = new Color3(1, 0.9, 0.68);
  headlight.specular = new Color3(0.3, 0.28, 0.22);
  headlight.intensity = 1.7;
  headlight.range = 130;
  headlight.includeOnlyWithLayerMask = UNDERGROUND;

  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = LIGHTING.fogDensity;
  scene.fogColor = color3(LIGHTING.fogColor);
  scene.ambientColor = Color3.Black();

  const landscape = new StandardMaterial("landscape", scene);
  landscape.diffuseColor = Color3.White();
  landscape.specularColor = Color3.Black();
  landscape.backFaceCulling = false;
  landscape.twoSidedLighting = true;

  const grade = options.grading !== false;
  const config = scene.imageProcessingConfiguration;
  config.toneMappingEnabled = false;
  config.exposure = grade ? LIGHTING.exposure : 1;
  config.contrast = grade ? LIGHTING.contrast : 1;
  const curves = new ColorCurves();
  curves.globalSaturation = LIGHTING.saturation;
  config.colorCurves = curves;
  config.colorCurvesEnabled = grade;
  const grading = grade ? new Vector3(LIGHTING.exposure ** (1 / 2.2), LIGHTING.contrast - 1, 1 + LIGHTING.saturation / 100) : new Vector3(1, 0, 1);

  let shadows: ShadowGenerator | null = null;
  if (options.shadows !== false) {
    const generator = new ShadowGenerator(options.shadowMapSize ?? 2048, sun);
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    generator.bias = 0.002;
    generator.normalBias = 0.04;
    generator.frustumEdgeFalloff = 0.25;
    generator.setDarkness(0);
    generator.getShadowMap()!.renderList = [];
    shadows = generator;
  }

  const zAxis = toScene.normalizeToNew();
  const xAxis = Vector3.Cross(Vector3.Up(), zAxis).normalize();
  const yAxis = Vector3.Cross(zAxis, xAxis).normalize();
  const texel = SHADOW_FRUSTUM / (options.shadowMapSize ?? 2048);
  const center = new Vector3();

  return {
    landscape,
    shadows,
    grading,
    headlight,
    setShadowFocus(focus) {
      // Centre calé sur la grille des texels : les ombres ne scintillent pas quand le train avance.
      const x = Math.round(Vector3.Dot(focus, xAxis) / texel) * texel;
      const y = Math.round(Vector3.Dot(focus, yAxis) / texel) * texel;
      const z = Vector3.Dot(focus, zAxis);
      center.copyFrom(xAxis).scaleInPlace(x).addInPlace(yAxis.scale(y)).addInPlace(zAxis.scale(z));
      sun.position.copyFrom(center).subtractInPlace(zAxis.scale(120));
    },
    setShadowCasters(casters) {
      const map = shadows?.getShadowMap();
      if (map) map.renderList = [...casters];
    },
  };
}
