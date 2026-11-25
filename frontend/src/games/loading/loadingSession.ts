// Séance de chargement d'un jeu : une par ouverture, créée au clic, suivie par le chargeur commun (GameLoader) du début à
// la fin. Pure (sans React), donc testable.
//
// Progression globale pondérée, de 0 à 100 % :
//   - Initialisation (0 à 10 %) : jalons techniques réellement atteints (code du lecteur reçu, moteur reçu, lecteur
//     monté), chacun avec son poids. Un import() n'annonce pas ses octets : seuls ses jalons comptent, rien n'est simulé.
//   - Ressources (10 à 100 %) : 10 % + progression réelle des ressources × 90 %. Les ressources peuvent commencer à
//     arriver pendant l'initialisation (téléchargements en parallèle) ; leur avancée n'est montrée qu'à partir de la phase 2.
// La valeur affichée ne recule jamais et n'atteint 100 % qu'au signal « prêt ».

export type LoadingPhase = "init" | "resources";

export interface LoadingSessionState {
  phase: LoadingPhase;
  /** Progression globale affichée, de 0 à 1 (monotone). */
  progress: number;
  /** Instant du clic (ms, horloge de la séance) : référence du seuil global de 90 s. */
  startedAt: number;
  /** Début de la phase en cours (ms) : référence des seuils de 10 s (initialisation) et 15 s (ressources). */
  phaseStartedAt: number;
  ready: boolean;
  /** Échec réel (réseau coupé, fichier introuvable après les reprises) : le chargeur propose Réessayer. */
  failed: boolean;
}

export interface LoadingSession {
  getState(): LoadingSessionState;
  subscribe(listener: () => void): () => void;
  /** Jalon d'initialisation atteint (sans effet s'il est inconnu ou déjà atteint). */
  milestone(id: string): void;
  /** Progression réelle des ressources, de 0 à 1. */
  reportResources(fraction: number): void;
  /** Le jeu est prêt à s'afficher : 100 %, le chargeur disparaît. */
  ready(): void;
  fail(onRetry: () => void): void;
  /** Réessayer (bouton du chargeur) : l'échec est levé et l'action de reprise du jeu est lancée. */
  retry(): void;
}

/** Part de l'initialisation dans la progression globale. */
export const INIT_SHARE = 0.1;
/** Tant que le jeu n'est pas prêt, la barre s'arrête juste avant 100 %. */
const BEFORE_READY = 0.99;

export function createLoadingSession(milestones: Readonly<Record<string, number>>, now: () => number = () => performance.now()): LoadingSession {
  const weights = new Map(Object.entries(milestones));
  const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
  const reached = new Set<string>();
  const listeners = new Set<() => void>();
  let resources = 0;
  let onRetry: (() => void) | null = null;
  const startedAt = now();
  let state: LoadingSessionState = { phase: "init", progress: 0, startedAt, phaseStartedAt: startedAt, ready: false, failed: false };

  const emit = (next: Partial<LoadingSessionState>) => {
    const merged = { ...state, ...next };
    if (merged.phase === state.phase && merged.progress === state.progress && merged.ready === state.ready && merged.failed === state.failed) return;
    state = merged;
    for (const listener of listeners) listener();
  };

  const update = () => {
    if (state.ready) return;
    const initDone = [...weights.keys()].every((id) => reached.has(id));
    // Poids des jalons ramenés à la part de l'initialisation (10 %), quel que soit le jeu.
    const init = total > 0 ? ([...reached].reduce((sum, id) => sum + (weights.get(id) ?? 0), 0) / total) * INIT_SHARE : INIT_SHARE;
    const computed = initDone ? INIT_SHARE + Math.min(1, resources) * (1 - INIT_SHARE) : Math.min(init, INIT_SHARE);
    const progress = Math.max(state.progress, Math.min(BEFORE_READY, computed));
    if (initDone && state.phase === "init") emit({ phase: "resources", phaseStartedAt: now(), progress });
    else emit({ progress });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    milestone(id) {
      if (!weights.has(id) || reached.has(id)) return;
      reached.add(id);
      update();
    },
    reportResources(fraction) {
      if (!Number.isFinite(fraction)) return;
      resources = Math.max(resources, Math.min(1, fraction));
      update();
    },
    ready() {
      for (const id of weights.keys()) reached.add(id);
      emit({ phase: "resources", progress: 1, ready: true, failed: false });
    },
    fail(retry) {
      onRetry = retry;
      emit({ failed: true });
    },
    retry() {
      const action = onRetry;
      onRetry = null;
      emit({ failed: false });
      action?.();
    },
  };
}
