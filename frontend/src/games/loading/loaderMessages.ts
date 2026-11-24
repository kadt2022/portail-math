// Message secondaire du chargeur commun, d'après le temps écoulé. Pur, donc testable sans attente réelle.
//
// Par ordre de priorité :
//   1. 90 s ou plus depuis le clic, quelle que soit la phase : alternance toutes les 20 s, en commençant par le message
//      « plusieurs minutes », puis le message « un peu plus de temps », et ainsi de suite jusqu'à la fin du chargement ;
//   2. initialisation en cours depuis 10 s ou plus : « Veuillez patienter… » ;
//   3. ressources en cours depuis 15 s ou plus : « un peu plus de temps » ;
//   4. sinon, aucun message.
// Un chargement long n'est pas présenté comme une connexion lente : il peut aussi venir du poids du jeu.

import type { LoadingPhase } from "./loadingSession";

export type LoaderMessage = "initWait" | "slow" | "long";

export const INIT_WAIT_MS = 10_000;
export const RESOURCES_SLOW_MS = 15_000;
export const LONG_WAIT_MS = 90_000;
export const ALTERNATE_MS = 20_000;

export interface LoaderClock {
  phase: LoadingPhase;
  /** Temps écoulé depuis le clic (ms). */
  sinceStart: number;
  /** Temps écoulé depuis le début de la phase en cours (ms). */
  sincePhase: number;
}

export function loaderMessage({ phase, sinceStart, sincePhase }: LoaderClock): LoaderMessage | null {
  if (sinceStart >= LONG_WAIT_MS) return Math.floor((sinceStart - LONG_WAIT_MS) / ALTERNATE_MS) % 2 === 0 ? "long" : "slow";
  if (phase === "init") return sincePhase >= INIT_WAIT_MS ? "initWait" : null;
  return sincePhase >= RESOURCES_SLOW_MS ? "slow" : null;
}

/** Délai (ms) jusqu'au prochain changement possible du message : un seul chronomètre à la fois suffit. */
export function nextMessageChangeIn({ phase, sinceStart, sincePhase }: LoaderClock): number {
  if (sinceStart >= LONG_WAIT_MS) return ALTERNATE_MS - ((sinceStart - LONG_WAIT_MS) % ALTERNATE_MS);
  const phaseThreshold = phase === "init" ? INIT_WAIT_MS : RESOURCES_SLOW_MS;
  const toPhase = sincePhase < phaseThreshold ? phaseThreshold - sincePhase : Number.POSITIVE_INFINITY;
  return Math.max(1, Math.min(toPhase, LONG_WAIT_MS - sinceStart));
}
