import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { Material } from "@babylonjs/core/Materials/material";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

import type { MaterialRole } from "../ship/shipParts";
import type { Palette } from "../ship/shipSpec";

// Les matériaux du vaisseau, du plus au moins brillant :
//   - carrosserie : peinture composite lisse, sous un vernis automobile (clearCoat) qui double les reflets ;
//   - accents : peinture métallisée (paillettes), un peu plus métallique que la coque ;
//   - verrière : verre teinté dont les reflets restent nets même transparent (radiance et spéculaire au-dessus de l'alpha) ;
//   - moteurs et armatures : métal brossé technique (anisotrope), plus sombre et plus mécanique que la coque ;
//   - détails sombres : graphite verni, pour séparer clairement les pièces ;
//   - lumières : émissifs plus forts que le blanc, que l'effet de halo (bloom) fait rayonner ;
//   - bouclier : énergie transparente par effet Fresnel, lumineuse sur les bords et vide au centre, pour ne pas ternir le vaisseau.
// Un matériau par rôle, partagé par toutes les pièces : changer de palette change quelques couleurs, jamais les formes.
//
// Composants éprouvés de Babylon.js (Apache 2.0) : PBRMaterial (clearCoat, anisotropie), StandardMaterial et FresnelParameters.
//
// Écrit pour Yamba.

export interface ShipMaterials {
  readonly roles: Readonly<Record<MaterialRole, PBRMaterial>>;
  readonly shield: Material;
  /** Applique une palette : coque, accents, verrière, lueur des moteurs, étoiles et voyants. */
  applyPalette(palette: Palette): void;
  /** Pulsation de la lueur des moteurs (1 : repos ; plus : poussée). */
  setGlow(k: number): void;
  /** Les matériaux physiques, qui reçoivent l'environnement réfléchi. */
  all(): PBRMaterial[];
  dispose(): void;
}

/** Force de lueur des lumières : au-dessus de 1 pour que le halo les fasse briller. */
const LAMP_POWER = 0.95;

function paint(scene: Scene, name: string, options: { metallic: number; roughness: number; coat: number }): PBRMaterial {
  const m = new PBRMaterial(name, scene);
  m.metallic = options.metallic;
  m.roughness = options.roughness;
  m.clearCoat.isEnabled = true;
  m.clearCoat.intensity = options.coat;
  m.clearCoat.roughness = 0.025;
  m.environmentIntensity = 1.25;
  return m;
}

function lamp(scene: Scene, name: string): PBRMaterial {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = Color3.Black();
  m.metallic = 0;
  m.roughness = 1;
  m.disableLighting = true;
  return m;
}

export function createShipMaterials(scene: Scene): ShipMaterials {
  const hull = paint(scene, "ship-hull", { metallic: 0.18, roughness: 0.36, coat: 1 });
  const accent = paint(scene, "ship-accent", { metallic: 0.5, roughness: 0.3, coat: 1 });
  const star = paint(scene, "ship-star", { metallic: 0.3, roughness: 0.3, coat: 1 });

  const glass = new PBRMaterial("ship-glass", scene);
  glass.metallic = 0;
  glass.roughness = 0.02;
  glass.alpha = 0.5;
  glass.indexOfRefraction = 1.52;
  glass.environmentIntensity = 1.8;
  glass.clearCoat.isEnabled = true;
  glass.clearCoat.intensity = 1;
  glass.clearCoat.roughness = 0.01;
  glass.backFaceCulling = false;
  glass.twoSidedLighting = true;
  glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  glass.useRadianceOverAlpha = true;
  glass.useSpecularOverAlpha = true;

  const metal = new PBRMaterial("ship-metal", scene);
  metal.albedoColor = Color3.FromHexString("#9aa3bb");
  metal.metallic = 1;
  metal.roughness = 0.26;
  metal.anisotropy.isEnabled = true;
  metal.anisotropy.intensity = 0.65;
  metal.environmentIntensity = 1.4;

  const dark = new PBRMaterial("ship-dark", scene);
  dark.albedoColor = Color3.FromHexString("#1c1f38");
  dark.metallic = 0.55;
  dark.roughness = 0.32;
  dark.clearCoat.isEnabled = true;
  dark.clearCoat.intensity = 0.8;
  dark.clearCoat.roughness = 0.05;
  dark.environmentIntensity = 1.3;

  const glowBlue = lamp(scene, "ship-glow-blue");
  const glowCyan = lamp(scene, "ship-glow-cyan");
  const light = lamp(scene, "ship-light");

  // Bouclier : transparent au centre, lumineux sur les bords (Fresnel), sans éclairage, en mélange additif : le noir du centre devient transparent, seuls les bords brillent.
  const shield = new StandardMaterial("ship-shield", scene);
  shield.disableLighting = true;
  shield.backFaceCulling = false;
  shield.alpha = 0.99;
  shield.emissiveFresnelParameters = new FresnelParameters({ bias: 0.08, power: 3, leftColor: Color3.White(), rightColor: Color3.Black() });
  shield.diffuseColor = Color3.Black();
  shield.alphaMode = Constants.ALPHA_ADD;
  shield.disableDepthWrite = true;

  const roles: Record<MaterialRole, PBRMaterial> = { hull, accent, glass, metal, dark, glowBlue, glowCyan, light, star };
  let glow = Color3.White();

  return {
    roles,
    shield,
    applyPalette(palette) {
      hull.albedoColor = Color3.FromHexString(palette.hull);
      accent.albedoColor = Color3.FromHexString(palette.accent);
      star.albedoColor = Color3.FromHexString(palette.star);
      star.emissiveColor = Color3.FromHexString(palette.star).scale(0.18);
      glass.albedoColor = Color3.FromHexString(palette.glass);
      glass.emissiveColor = Color3.FromHexString(palette.glass).scale(0.12);
      glow = Color3.FromHexString(palette.glow);
      glowBlue.emissiveColor = glow.scale(LAMP_POWER);
      glowCyan.emissiveColor = Color3.Lerp(glow, Color3.White(), 0.7).scale(LAMP_POWER);
      light.emissiveColor = Color3.FromHexString(palette.star).scale(LAMP_POWER);
      shield.emissiveColor = Color3.Lerp(glow, Color3.White(), 0.1).scale(0.8);
    },
    setGlow(k) {
      glowBlue.emissiveColor = glow.scale(LAMP_POWER * k);
      glowCyan.emissiveColor = Color3.Lerp(glow, Color3.White(), 0.7).scale(LAMP_POWER * Math.min(1.15, k));
    },
    all: () => Object.values(roles),
    dispose() {
      for (const material of [...Object.values(roles), shield]) material.dispose();
    },
  };
}
