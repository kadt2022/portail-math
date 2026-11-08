// Chemin d'un enfant dans un parcours : chaque module enchaîne ses leçons,
// son évaluation (et éventuellement le bilan final), puis le module suivant.
// Commun à la 1re et à la 2e primaire, indépendant de leurs modèles : il
// suffit d'un identifiant, d'un type et d'une clé de titre.

export type JourneyState = "completed" | "in-progress" | "not-started" | null;

export interface JourneyItem {
  id: string;
  kind: "lesson" | "evaluation";
  titleKey: string;
}

export interface JourneyModule {
  id: string;
  number: number;
  titleKey: string;
}

export interface JourneyStop<M extends JourneyModule = JourneyModule, I extends JourneyItem = JourneyItem> {
  module: M;
  item: I;
}

export function buildJourney<M extends JourneyModule, I extends JourneyItem>(
  modules: readonly M[],
  itemsOf: (module: M) => readonly I[],
): readonly JourneyStop<M, I>[] {
  return modules.flatMap((module) => itemsOf(module).map((item) => ({ module, item })));
}

/** Élément suivant sur le chemin, y compris dans le module suivant. */
export function nextStopIn<S extends JourneyStop>(stops: readonly S[], itemId: string): S | undefined {
  const index = stops.findIndex((stop) => stop.item.id === itemId);
  return index >= 0 ? stops[index + 1] : undefined;
}

export function moduleStopsIn<S extends JourneyStop>(stops: readonly S[], moduleId: string): S[] {
  return stops.filter((stop) => stop.module.id === moduleId);
}

export type ModuleContinue<S extends JourneyStop = JourneyStop> =
  | { type: "start" | "resume" | "continue" | "next-module"; stop: S }
  | { type: "finished" };

/**
 * Où mène le gros bouton de la page d'un module : l'élément en cours,
 * sinon le premier non terminé, sinon le début du module suivant.
 */
export function moduleContinueIn<S extends JourneyStop>(
  stops: readonly S[],
  moduleId: string,
  stateOf: (item: S["item"]) => JourneyState,
): ModuleContinue<S> {
  const own = moduleStopsIn(stops, moduleId);
  const inProgress = own.find((stop) => stateOf(stop.item) === "in-progress");
  if (inProgress) return { type: "resume", stop: inProgress };
  const pending = own.find((stop) => stateOf(stop.item) !== "completed");
  if (pending) {
    const started = own.some((stop) => stateOf(stop.item) === "completed");
    return { type: started ? "continue" : "start", stop: pending };
  }
  const next = nextStopIn(stops, own.at(-1)?.item.id ?? "");
  return next ? { type: "next-module", stop: next } : { type: "finished" };
}
