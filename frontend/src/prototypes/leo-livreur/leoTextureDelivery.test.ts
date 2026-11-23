import { describe, expect, it } from "vitest";

import { DELIVERED_TEXTURE_SIZES, DELIVERY_MARGIN, logicalSizeFor, MEASURED_DISPLAY_SCALE } from "./leoTextureDelivery";
import { STARTUP_TEXTURE_URLS, TEXTURE_URLS } from "./leoTextureUrls";
import { ALL_TEXTURE_KEYS } from "./leoZoneAssets";

/** Fichiers livrés réduits (suffixe : leur largeur), en données incorporées pour en lire l'en-tête. */
const DELIVERED_FILES = import.meta.glob<string>("./assets/*-{815,396,384,390,251,253}.webp", { query: "?inline", eager: true, import: "default" });

/** Dimensions d'un fichier WebP livré, lues dans son en-tête (VP8X, VP8L ou VP8). */
function webpSize(url: string) {
  const name = url.split("?")[0].split("/").pop() as string;
  const entry = Object.entries(DELIVERED_FILES).find(([path]) => path.endsWith(`/${name}`));
  if (!entry) throw new Error(`fichier livré introuvable : ${name}`);
  const binary = atob(entry[1].split(",")[1]);
  const view = new DataView(Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer);
  const u24 = (offset: number) => view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
  const chunk = binary.slice(12, 16);
  if (chunk === "VP8X") return { width: 1 + u24(24), height: 1 + u24(27) };
  if (chunk === "VP8L") {
    const bits = view.getUint32(21, true);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
}

describe("textures livrées allégées", () => {
  it("une texture reçue réduite est redessinée à sa taille logique ; les autres restent telles quelles", () => {
    expect(logicalSizeFor("leo-pedestrian-man-sheet", { width: 815, height: 272 })).toEqual({ width: 2172, height: 724 });
    expect(logicalSizeFor("leo-pedestrian-man-sheet", { width: 2172, height: 724 })).toBeNull();
    expect(logicalSizeFor("leo-world-city-top", { width: 1920, height: 471 })).toBeNull();
  });

  it("chaque fichier livré garde les proportions de l'illustration, plus petit, et au moins 15 % au-dessus de son affichage maximal", () => {
    for (const [key, logical] of Object.entries(DELIVERED_TEXTURE_SIZES)) {
      const delivered = webpSize(TEXTURE_URLS[key]);
      const factor = delivered.width / logical.width;
      expect(delivered.width, key).toBeLessThan(logical.width);
      expect(Math.abs(delivered.height - logical.height * factor), key).toBeLessThanOrEqual(1);
      expect(factor, key).toBeGreaterThanOrEqual(MEASURED_DISPLAY_SCALE[key] * DELIVERY_MARGIN);
    }
  });

  it("les décors déjà agrandis à l'écran (ville, boulevard, village, pont) sont livrés à leur taille d'origine", () => {
    for (const key of ["leo-world-city-top", "leo-world-boulevard-zone4", "leo-world-village-zone1-backdrop", "leo-world-suspension-bridge-layer"]) {
      expect(DELIVERED_TEXTURE_SIZES[key], key).toBeUndefined();
    }
  });

  it("l'écran de chargement attend exactement les images de tout le parcours (commun, pont, ville)", () => {
    expect(STARTUP_TEXTURE_URLS).toEqual(ALL_TEXTURE_KEYS.map((key) => TEXTURE_URLS[key]));
    expect(STARTUP_TEXTURE_URLS.every((url) => typeof url === "string" && url.length > 0)).toBe(true);
  });
});
