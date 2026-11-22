// Décors de Turbo Pulse : un monde par niveau, dans la galaxie Kimbo (Zion, Verdalia, Aqualis, Solara, Glacia, Pyra puis
// Ultima). Importer l'adresse d'une image ne la télécharge pas : Vite ne fournit que son URL versionnée (empreinte du
// contenu dans le nom), et le navigateur ne la demande qu'au moment voulu. Aucun module JavaScript intermédiaire, donc
// aucun aller-retour réseau de plus par niveau.
import niv001 from "../../assets/turbo-pulse/niv001.webp";
import niv002 from "../../assets/turbo-pulse/niv002.webp";
import niv003 from "../../assets/turbo-pulse/niv003.webp";
import niv004 from "../../assets/turbo-pulse/niv004.webp";
import niv005 from "../../assets/turbo-pulse/niv005.webp";
import niv006 from "../../assets/turbo-pulse/niv006.webp";
import niv007 from "../../assets/turbo-pulse/niv007.webp";

export const LEVEL_BACKGROUNDS: readonly string[] = [niv001, niv002, niv003, niv004, niv005, niv006, niv007];

/** Décor du niveau (le dernier sert au-delà). */
export function backgroundFor(levelIndex: number) {
  return LEVEL_BACKGROUNDS[Math.min(Math.max(0, levelIndex), LEVEL_BACKGROUNDS.length - 1)];
}

/** Décor du niveau suivant, à préparer pendant le niveau en cours ; null s'il n'y en a pas d'autre. */
export function nextBackgroundFor(levelIndex: number) {
  const next = backgroundFor(levelIndex + 1);
  return next === backgroundFor(levelIndex) ? null : next;
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
