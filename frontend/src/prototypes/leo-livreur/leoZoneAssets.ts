// Chargement progressif des ressources par zone (LEO-PERF-02, étapes 3 à 5). Pur (sans Phaser), donc testable.
//
// Trois lots de textures :
//   - « common » : Léo, le trafic, les maisons et le tablier (présent dans toutes les zones) — chargé au départ ;
//   - « bridge » : garde-corps et calque du pont suspendu — zones du pont seulement ;
//   - « city »   : illustration de la ville et planche des 7 vues de la berline — zones de la ville seulement.
// Un lot est téléchargé avant que Léo l'atteigne (anticipation selon la position, la vitesse, le sens, le poids du
// lot et le débit mesuré), libéré quand Léo s'en éloigne nettement, rechargé s'il revient. Aucun stockage persistant :
// seule la mémoire du jeu, pendant la partie.

import { BRIDGE_END_X, BRIDGE_START_X, cityLayout, CITY_FADE } from "./leoCityLayout";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

export type BundleId = "common" | "bridge" | "city";
/** « retrying » : échec, reprise automatique programmée ; les demandes ordinaires attendent la fin du délai. */
export type BundleState = "absent" | "loading" | "retrying" | "ready" | "error";

/** Clés de texture téléchargées par lot (les textures dérivées sont gérées par la scène). */
export const BUNDLE_TEXTURES: Record<BundleId, readonly string[]> = {
  common: [
    "leo-traffic-family-blue", "leo-traffic-compact-green", "leo-traffic-sedan-gray", "leo-traffic-city-bus",
    "leo-traffic-school-bus-occupied", "leo-traffic-taxi-occupied", "leo-traffic-minibus",
    "leo-car-right", "leo-car-left", "leo-car-front", "leo-car-back", "leo-house", "leo-world-bridge-deck",
  ],
  bridge: ["leo-world-bridge-rail", "leo-world-suspension-bridge-layer"],
  city: ["leo-world-city-top", "leo-world-city-bottom", "leo-cross-sedan-turn"],
};

/** Poids (octets) des lots, mesurés sur le build : servent à estimer le temps de téléchargement. */
export const BUNDLE_BYTES: Record<BundleId, number> = {
  common: 372_000,
  bridge: 500_000,
  city: 672_000,
};

/** Débit supposé tant qu'aucune mesure n'existe, et plancher de prudence : 250 kbit/s (réseau mobile faible). */
export const FALLBACK_BANDWIDTH_BPS = 250_000;
/** Marge de sécurité appliquée au temps de téléchargement estimé (connexions irrégulières). */
export const SAFETY_FACTOR = 2;
/** Tentatives automatiques après un échec, avant de demander à l'enfant de réessayer. */
export const MAX_AUTO_RETRIES = 2;
export const RETRY_DELAYS_MS = [2000, 6000] as const;

/** Étendue horizontale (monde) où un lot est nécessaire. */
export function bundleSpan(bundle: BundleId): { minX: number; maxX: number } {
  if (bundle === "common") return { minX: Number.NEGATIVE_INFINITY, maxX: Number.POSITIVE_INFINITY };
  if (bundle === "bridge") return { minX: BRIDGE_START_X, maxX: BRIDGE_END_X };
  const city = cityLayout();
  // Le panneau de la ville et son fondu ; la rue des Jardins (berline) est à l'intérieur du panneau.
  return { minX: city.panelX - CITY_FADE, maxX: city.panelEnd + CITY_FADE };
}

/** Lots nécessaires pour afficher l'intervalle [minX, maxX] du monde. */
export function bundlesForRange(minX: number, maxX: number): BundleId[] {
  return (["common", "bridge", "city"] as const).filter((bundle) => {
    const span = bundleSpan(bundle);
    return maxX >= span.minX && minX <= span.maxX;
  });
}

/**
 * Intervalle à préparer d'avance : la vue, plus devant Léo la distance qu'il parcourt pendant le téléchargement
 * estimé du plus gros lot (× marge de sécurité), et au moins une zone ; une zone derrière (marche arrière).
 * `direction` : +1 vers l'est, -1 vers l'ouest. `speed` en px/s (valeur absolue utilisée).
 */
export function prefetchRange(
  view: { minX: number; maxX: number },
  speed: number,
  direction: 1 | -1,
  bandwidthBps: number,
): { minX: number; maxX: number } {
  const bps = Math.max(FALLBACK_BANDWIDTH_BPS, Number.isFinite(bandwidthBps) ? bandwidthBps : 0);
  const heaviest = Math.max(BUNDLE_BYTES.bridge, BUNDLE_BYTES.city);
  const seconds = (heaviest * 8) / bps;
  const ahead = Math.max(WORLD_ZONE_WIDTH, Math.abs(speed) * seconds * SAFETY_FACTOR);
  const behind = WORLD_ZONE_WIDTH;
  return direction > 0
    ? { minX: view.minX - behind, maxX: view.maxX + ahead }
    : { minX: view.minX - ahead, maxX: view.maxX + behind };
}

/** Intervalle au-delà duquel un lot peut être libéré (hystérésis : on ne libère pas ce qu'on vient de quitter). */
export function keepRange(prefetch: { minX: number; maxX: number }) {
  return { minX: prefetch.minX - WORLD_ZONE_WIDTH, maxX: prefetch.maxX + WORLD_ZONE_WIDTH };
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
 * explicite (bouton Réessayer), libération seulement des lots inutilisés.
 */
export class ZoneAssetManager {
  private readonly status = new Map<BundleId, BundleStatus>();
  private readonly inFlight = new Map<BundleId, Promise<void>>();
  /** Débit mesuré (bit/s) sur les téléchargements terminés ; 0 tant qu'aucune mesure. */
  bandwidthBps = 0;

  constructor(
    private readonly fetchBundle: BundleFetcher,
    private readonly schedule: Scheduler = (callback, delay) => { setTimeout(callback, delay); },
    private readonly now: () => number = () => performance.now(),
    private readonly onChange: () => void = () => {},
  ) {
    for (const bundle of ["common", "bridge", "city"] as const) this.status.set(bundle, { state: "absent", attempts: 0 });
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
    return (["common", "bridge", "city"] as const).filter((bundle) => this.state(bundle) === "error");
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

  /** Libère un lot devenu inutile (l'appelant a vérifié qu'aucun objet ne l'utilise). Le lot commun ne l'est jamais. */
  release(bundle: BundleId) {
    if (bundle === "common") return false;
    const current = this.status.get(bundle) as BundleStatus;
    if (current.state !== "ready") return false;
    this.status.set(bundle, { state: "absent", attempts: 0 });
    this.onChange();
    return true;
  }

  private start(bundle: BundleId): Promise<void> {
    const current = this.status.get(bundle) as BundleStatus;
    this.status.set(bundle, { state: "loading", attempts: current.attempts + 1 });
    this.onChange();
    const startedAt = this.now();
    const run = this.fetchBundle(bundle)
      .then(() => {
        const seconds = Math.max(0.05, (this.now() - startedAt) / 1000);
        const measured = (BUNDLE_BYTES[bundle] * 8) / seconds;
        this.bandwidthBps = this.bandwidthBps > 0 ? Math.min(this.bandwidthBps, measured) : measured;
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
