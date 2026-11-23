// Progression globale d'un chargement fait de plusieurs ressources : chacune pèse son poids en octets (estimé au départ,
// remplacé par sa taille réelle dès qu'elle est connue). Le pourcentage affiché ne recule jamais.

export interface LoadingProgress<Id extends string> {
  /** Octets reçus pour une ressource (et sa taille totale si le serveur l'annonce). */
  report(id: Id, loaded: number, total: number | null): void;
  /** Ressource prête (ou abandonnée : une ressource en échec ne bloque jamais le chargement). */
  complete(id: Id): void;
  /** Fraction chargée, de 0 à 1. */
  fraction(): number;
  done(): boolean;
}

/**
 * `paced` : ressource qui n'annonce pas sa progression (un module JavaScript). Comme toutes les ressources partagent la
 * même connexion, elle avance au rythme de la plus avancée des autres (en octets reçus), sans dépasser 97 % de son poids
 * tant qu'elle n'est pas réellement arrivée. Sans cela, sa part entière tomberait d'un coup à la fin.
 */
export function createLoadingProgress<Id extends string>(estimates: Record<Id, number>, onChange: (fraction: number) => void, paced?: NoInfer<Id>): LoadingProgress<Id> {
  const parts = Object.fromEntries(Object.entries(estimates).map(([id, weight]) => [id, { weight: Number(weight), loaded: 0, complete: false }])) as Record<
    Id,
    { weight: number; loaded: number; complete: boolean }
  >;
  let shown = 0;
  const compute = () => {
    let total = 0;
    let loaded = 0;
    const list = Object.entries(parts) as Array<[Id, { weight: number; loaded: number; complete: boolean }]>;
    const fastest = Math.max(0, ...list.filter(([id]) => id !== paced).map(([, part]) => part.loaded));
    for (const [id, part] of list) {
      total += part.weight;
      const received = id === paced ? Math.min(fastest, part.weight * 0.97) : part.loaded;
      loaded += part.complete ? part.weight : Math.min(received, part.weight);
    }
    return total > 0 ? loaded / total : 1;
  };
  // Signalé seulement quand le pourcentage entier affiché change : des dizaines de fichiers reçus morceau par morceau
  // ne déclenchent pas pour autant des milliers de rendus de l'écran (le fil principal reste au jeu qui démarre).
  let reported = -1;
  const emit = () => {
    shown = Math.max(shown, compute());
    const percent = Math.floor(shown * 100);
    if (percent === reported) return;
    reported = percent;
    onChange(shown);
  };
  const isDone = () => (Object.values(parts) as Array<{ complete: boolean }>).every((part) => part.complete);
  return {
    report(id, loaded, total) {
      const part = parts[id];
      if (part.complete) return;
      if (total && total > 0) part.weight = total;
      part.loaded = loaded;
      emit();
    },
    complete(id) {
      parts[id].complete = true;
      parts[id].loaded = parts[id].weight;
      if (isDone()) shown = 1;
      emit();
    },
    fraction: () => shown,
    done: isDone,
  };
}
