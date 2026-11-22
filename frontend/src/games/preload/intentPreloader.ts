// Préchargement sur intention claire, identique pour tous : aucune détection de la connexion. Ne sait rien des jeux : il
// reçoit un identifiant et une fonction de chargement.
//
// - Survol à la souris : le préchargement ne part qu'après une intention stable (250 ms par défaut), et il est annulé si le
//   pointeur quitte la carte avant. Une seule intention attend à la fois : traverser vite le catalogue ne précharge rien.
// - File d'attente bornée (un préchargement à la fois par défaut) ; un préchargement en attente dans la file est retiré
//   si le pointeur quitte la carte ; un jeu déjà préchargé ne l'est jamais deux fois.
// - Jeu choisi : tout ce qui attend encore (intention, file) est annulé, pour laisser le débit au jeu ouvert.
// L'ouverture réelle d'un jeu ne passe jamais par ici : rien ne peut la bloquer ni la retarder.

export interface IntentPreloaderOptions {
  load: (id: string) => Promise<unknown>;
  /** Durée de survol stable avant de précharger. */
  delayMs?: number;
  /** Préchargements simultanés au plus. */
  maxConcurrent?: number;
}

export interface IntentPreloader {
  /**
   * Le pointeur s'arrête sur la carte d'un jeu. `stillHovered` est consulté à l'échéance : la carte a pu quitter le
   * pointeur pendant un défilement sans que sa sortie soit signalée ; elle n'est alors pas préchargée.
   */
  intent(id: string, stillHovered?: () => boolean): void;
  /** Le pointeur quitte la carte : annule ce qui n'a pas encore commencé. */
  end(id: string): void;
  /** Un jeu est choisi : plus aucun préchargement en attente ne doit lui disputer le débit. */
  cancelAll(): void;
}

export function createIntentPreloader({ load, delayMs = 250, maxConcurrent = 1 }: IntentPreloaderOptions): IntentPreloader {
  /** Jeux dont le préchargement a commencé (ou est terminé). */
  const started = new Set<string>();
  const queue: string[] = [];
  let running = 0;
  let pending: { id: string; timer: ReturnType<typeof setTimeout> } | null = null;

  const pump = () => {
    while (running < maxConcurrent && queue.length > 0) {
      const id = queue.shift() as string;
      started.add(id);
      running += 1;
      void load(id)
        .catch(() => undefined)
        .finally(() => {
          running -= 1;
          pump();
        });
    }
  };
  const cancelPending = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending = null;
  };

  return {
    intent(id, stillHovered) {
      if (started.has(id) || queue.includes(id) || pending?.id === id) return;
      // Une seule intention en attente : la nouvelle carte remplace la précédente.
      cancelPending();
      pending = {
        id,
        timer: setTimeout(() => {
          pending = null;
          if (stillHovered && !stillHovered()) return;
          queue.push(id);
          pump();
        }, delayMs),
      };
    },
    end(id) {
      if (pending?.id === id) cancelPending();
      const queued = queue.indexOf(id);
      if (queued >= 0) queue.splice(queued, 1);
    },
    cancelAll() {
      cancelPending();
      queue.length = 0;
    },
  };
}
