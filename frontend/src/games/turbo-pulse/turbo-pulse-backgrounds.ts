// Décors de Turbo Pulse : un monde par niveau, dans la galaxie Kimbo (Zion, Verdalia, Aqualis, Solara, Glacia, Pyra puis
// Ultima). Importer l'adresse d'une image ne la télécharge pas : Vite ne fournit que son URL versionnée (empreinte du
// contenu dans le nom), et le navigateur ne la demande qu'au moment voulu. Aucun module JavaScript intermédiaire, donc
// aucun aller-retour réseau de plus par niveau.
//
// Deux versions allégées de chaque illustration (WebP) : 960 pixels de large pour les téléphones (environ −68 %) et 1280
// pour les tablettes et les ordinateurs (environ −48 %), visuellement identiques à ces tailles d'écran. Les originaux
// (niv00N.webp) restent dans le dépôt comme sources ; ils ne sont plus servis aux joueurs.
import niv001Small from "../../assets/turbo-pulse/niv001-960.webp";
import niv002Small from "../../assets/turbo-pulse/niv002-960.webp";
import niv003Small from "../../assets/turbo-pulse/niv003-960.webp";
import niv004Small from "../../assets/turbo-pulse/niv004-960.webp";
import niv005Small from "../../assets/turbo-pulse/niv005-960.webp";
import niv006Small from "../../assets/turbo-pulse/niv006-960.webp";
import niv007Small from "../../assets/turbo-pulse/niv007-960.webp";
import niv001Large from "../../assets/turbo-pulse/niv001-1280.webp";
import niv002Large from "../../assets/turbo-pulse/niv002-1280.webp";
import niv003Large from "../../assets/turbo-pulse/niv003-1280.webp";
import niv004Large from "../../assets/turbo-pulse/niv004-1280.webp";
import niv005Large from "../../assets/turbo-pulse/niv005-1280.webp";
import niv006Large from "../../assets/turbo-pulse/niv006-1280.webp";
import niv007Large from "../../assets/turbo-pulse/niv007-1280.webp";
import { type DownloadProgress, fetchWithProgress } from "../loading/fetchWithProgress";

export type BackgroundSize = "small" | "large";

export const LEVEL_BACKGROUNDS: Readonly<Record<BackgroundSize, readonly string[]>> = {
  small: [niv001Small, niv002Small, niv003Small, niv004Small, niv005Small, niv006Small, niv007Small],
  large: [niv001Large, niv002Large, niv003Large, niv004Large, niv005Large, niv006Large, niv007Large],
};

/**
 * Largeur réelle de la scène (pixels physiques : largeur CSS × densité de l'écran) jusqu'à laquelle la version 960 suffit :
 * au-delà, elle serait agrandie de plus d'environ 15 % et perdrait de sa netteté.
 */
export const SMALL_BACKGROUND_MAX_WIDTH = 1100;

/** Version du décor adaptée à la scène : 960 pour les téléphones, 1280 pour les tablettes et les ordinateurs. */
export function backgroundSizeFor(pixelWidth: number): BackgroundSize {
  return pixelWidth <= SMALL_BACKGROUND_MAX_WIDTH ? "small" : "large";
}

/** Décor du niveau (le dernier sert au-delà). */
export function backgroundFor(levelIndex: number, size: BackgroundSize = "large") {
  const backgrounds = LEVEL_BACKGROUNDS[size];
  return backgrounds[Math.min(Math.max(0, levelIndex), backgrounds.length - 1)];
}

/** Décor du niveau suivant, à préparer pendant le niveau en cours ; null s'il n'y en a pas d'autre. */
export function nextBackgroundFor(levelIndex: number, size: BackgroundSize = "large") {
  const next = backgroundFor(levelIndex + 1, size);
  return next === backgroundFor(levelIndex, size) ? null : next;
}

export type FetchPriority = "high" | "low";

/**
 * Télécharge et décode une image avec la priorité demandée : haute pour le décor affiché, basse pour celui du niveau
 * suivant (il ne passe jamais devant ce dont le joueur a besoin tout de suite). Résolue une fois l'image décodée : le
 * décor s'affiche d'un coup, sans dessin progressif. Le cache HTTP du navigateur garde ensuite le fichier.
 */
export function loadImage(url: string, priority: FetchPriority): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.setAttribute("fetchpriority", priority);
    image.onload = () => {
      // decode() garantit l'image prête à peindre ; s'il échoue (navigateur ancien), l'image chargée suffit.
      void (image.decode ? image.decode().catch(() => undefined) : Promise.resolve()).then(() => resolve());
    };
    image.onerror = () => reject(new Error(`décor indisponible : ${url}`));
    image.src = url;
  });
}

/**
 * Décor de l'écran de chargement : téléchargé en annonçant sa progression (octets reçus), puis décodé depuis le cache HTTP
 * (aucun second téléchargement : les fichiers versionnés y sont gardés un an).
 */
export async function downloadImage(url: string, onProgress: DownloadProgress): Promise<void> {
  await fetchWithProgress(url, onProgress, "high");
  await loadImage(url, "high");
}
