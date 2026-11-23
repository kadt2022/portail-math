// Ressources de Conduire avec Léo, regroupées en lots par zone. Pur (sans Phaser), donc testable.
//
// Trois lots de textures :
//   - « common » : Léo, le trafic, les maisons, le village et le tablier ;
//   - « bridge » : garde-corps et calque du pont suspendu ;
//   - « city »   : illustration de la ville, piétons et planche des 7 vues de la berline.
// Les trois lots sont téléchargés et préparés avant le départ, puis gardés en mémoire pendant toute la partie : une
// attente au début plutôt qu'un arrêt de Léo en pleine conduite (marche arrière et retours entre zones compris). Aucun
// stockage persistant : seule la mémoire du jeu, pendant la partie ; le cache HTTP sert les visites suivantes.

import { BRIDGE_END_X, BRIDGE_START_X, cityLayout, CITY_FADE } from "./leoCityLayout";
import { boulevardLayout, BOULEVARD_FADE } from "./leoBoulevardLayout";

export type BundleId = "common" | "bridge" | "city";
/** « retrying » : échec, reprise automatique programmée ; les demandes ordinaires attendent la fin du délai. */
export type BundleState = "absent" | "loading" | "retrying" | "ready" | "error";

/** Lots dans l'ordre de leur préparation. */
export const ALL_BUNDLES: readonly BundleId[] = ["common", "bridge", "city"];

/** Clés de texture téléchargées par lot (les textures dérivées sont gérées par la scène). */
export const BUNDLE_TEXTURES: Record<BundleId, readonly string[]> = {
  common: [
    "leo-traffic-family-blue", "leo-traffic-compact-green", "leo-traffic-sedan-gray", "leo-traffic-city-bus",
    "leo-traffic-school-bus-occupied", "leo-traffic-taxi-occupied", "leo-traffic-minibus", "leo-world-village-zone1-backdrop",
    "leo-car-right", "leo-car-left", "leo-car-front", "leo-car-back", "leo-house", "leo-house-yellow", "leo-world-bridge-deck",
    "leo-house-near-side", "leo-tree", "leo-flowers-near-side", "leo-garden-near-side",
  ],
  bridge: ["leo-world-bridge-rail", "leo-world-suspension-bridge-layer"],
  city: [
    "leo-world-city-top", "leo-world-city-bottom", "leo-world-boulevard-zone4", "leo-cross-sedan-turn",
    "leo-pedestrian-man-sheet", "leo-pedestrian-woman-sheet", "leo-pedestrian-child-sheet",
    "leo-pedestrian-depth-front-sheet", "leo-pedestrian-depth-back-sheet",
  ],
};

/** Toutes les textures téléchargées avant le départ. */
export const ALL_TEXTURE_KEYS: readonly string[] = ALL_BUNDLES.flatMap((bundle) => BUNDLE_TEXTURES[bundle]);

/**
 * Poids (octets) des lots, mesurés sur les fichiers livrés : servent à estimer la progression avant que le serveur annonce les tailles réelles.
 * Toutes les images du jeu sont en WebP (les originaux restent dans assets/ comme sources, sans être téléchargés) ; certaines
 * sont livrées réduites à leur taille réelle d'affichage (voir leoTextureDelivery).
 */
export const BUNDLE_BYTES: Record<BundleId, number> = {
  common: 673_000,
  bridge: 500_000,
  city: 1_253_000,
};

/** Tentatives automatiques après un échec, avant de demander à l'enfant de réessayer. */
export const MAX_AUTO_RETRIES = 2;
export const RETRY_DELAYS_MS = [2000, 6000] as const;

/** Étendue horizontale (monde) où un lot est nécessaire. */
export function bundleSpan(bundle: BundleId): { minX: number; maxX: number } {
  if (bundle === "common") return { minX: Number.NEGATIVE_INFINITY, maxX: Number.POSITIVE_INFINITY };
  if (bundle === "bridge") return { minX: BRIDGE_START_X, maxX: BRIDGE_END_X };
  const city = cityLayout();
  const boulevard = boulevardLayout();
  // Entrée de ville + zone 4 et leurs fondus ; la rue des Jardins est dans le premier panneau.
  return {
    minX: city.panelX - CITY_FADE,
    maxX: boulevard.panelEnd + BOULEVARD_FADE,
  };
}

/** Lots nécessaires pour afficher l'intervalle [minX, maxX] du monde. */
export function bundlesForRange(minX: number, maxX: number): BundleId[] {
  return (["common", "bridge", "city"] as const).filter((bundle) => {
    const span = bundleSpan(bundle);
    return maxX >= span.minX && minX <= span.maxX;
  });
}

/** Téléchargeur d'un lot (Phaser dans le jeu, simulé dans les tests). Résout quand tout le lot est prêt. */
export type BundleFetcher = (bundle: BundleId) => Promise<void>;
export type Scheduler = (callback: () => void, delayMs: number) => void;

export interface BundleStatus {
  state: BundleState;
  attempts: number;
}

/**
 * États des lots : jamais deux téléchargements simultanés du même lot, reprises automatiques limitées, puis erreur
 * explicite (bouton Réessayer), aucune libération pendant la partie.
 */
export class ZoneAssetManager {
  private readonly status = new Map<BundleId, BundleStatus>();
  private readonly inFlight = new Map<BundleId, Promise<void>>();
  constructor(
    private readonly fetchBundle: BundleFetcher,
    private readonly schedule: Scheduler = (callback, delay) => { setTimeout(callback, delay); },
    private readonly onChange: () => void = () => {},
  ) {
    for (const bundle of ALL_BUNDLES) this.status.set(bundle, { state: "absent", attempts: 0 });
  }

  state(bundle: BundleId): BundleState {
    return (this.status.get(bundle) as BundleStatus).state;
  }

  attempts(bundle: BundleId) {
    return (this.status.get(bundle) as BundleStatus).attempts;
  }

  isReady(bundles: readonly BundleId[]) {
    return bundles.every((bundle) => this.state(bundle) === "ready");
  }

  /** Lots en erreur définitive (reprises automatiques épuisées). */
  failed(): BundleId[] {
    return ALL_BUNDLES.filter((bundle) => this.state(bundle) === "error");
  }

  /**
   * Demande un lot : sans effet s'il est prêt, en cours, en attente de reprise (le délai n'est jamais court-circuité)
   * ou en erreur (l'erreur attend un « Réessayer »).
   */
  request(bundle: BundleId): Promise<void> | null {
    const current = this.status.get(bundle) as BundleStatus;
    if (current.state === "ready" || current.state === "error" || current.state === "retrying") return null;
    const existing = this.inFlight.get(bundle);
    if (existing) return existing;
    return this.start(bundle);
  }

  /** Réessayer (bouton) : remet les lots en erreur à zéro et relance leur téléchargement. */
  retryFailed() {
    for (const bundle of this.failed()) {
      this.status.set(bundle, { state: "absent", attempts: 0 });
      void this.request(bundle);
    }
  }

  private start(bundle: BundleId): Promise<void> {
    const current = this.status.get(bundle) as BundleStatus;
    this.status.set(bundle, { state: "loading", attempts: current.attempts + 1 });
    this.onChange();
    const run = this.fetchBundle(bundle)
      .then(() => {
        this.status.set(bundle, { state: "ready", attempts: 0 });
        this.inFlight.delete(bundle);
        this.onChange();
      })
      .catch(() => {
        this.inFlight.delete(bundle);
        const attempts = (this.status.get(bundle) as BundleStatus).attempts;
        if (attempts <= MAX_AUTO_RETRIES) {
          // Reprise automatique, après un délai croissant : jamais de boucle serrée.
          this.status.set(bundle, { state: "retrying", attempts });
          this.schedule(() => {
            if (this.state(bundle) !== "retrying") return;
            this.status.set(bundle, { state: "absent", attempts });
            void this.request(bundle);
          }, RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)]);
        } else {
          this.status.set(bundle, { state: "error", attempts });
        }
        this.onChange();
      });
    this.inFlight.set(bundle, run);
    return run;
  }
}
