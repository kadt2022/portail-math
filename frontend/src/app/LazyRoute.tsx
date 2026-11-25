import { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from "react";

import { GameLoaderHost, ReachMilestone } from "../games/loading/GameLoaderHost";
import styles from "./LazyRoute.module.css";

/**
 * Chargement des pages à la demande (LEO-PERF-02).
 *
 * - Pendant le téléchargement : un indicateur INDÉTERMINÉ (on ne connaît pas la taille du fichier : aucun
 *   pourcentage inventé), jamais un écran blanc.
 * - En cas d'échec réseau : un message clair et un bouton « Réessayer ». Un module JavaScript qui a échoué reste en
 *   échec dans la page (règle des navigateurs) : réessayer recharge donc la page, sur action de l'enfant seulement,
 *   jamais en boucle automatique.
 */
export function RouteLoading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function RouteLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <strong>La page n’a pas pu être téléchargée.</strong>
      <span>Vérifie la connexion Internet, puis réessaie.</span>
      <button type="button" className={styles.retry} onClick={onRetry}>Réessayer</button>
    </div>
  );
}

interface BoundaryState {
  failed: boolean;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <RouteLoadError onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}

interface RouteEntry {
  preload: () => Promise<unknown>;
  heavy: boolean;
}

const ROUTES: RouteEntry[] = [];

/**
 * Page chargée à la demande, avec indicateur de chargement et reprise sur erreur. Une page déjà téléchargée (par
 * `preloadRoutes` ou une visite précédente) s'affiche immédiatement, sans repasser par l'indicateur.
 * `heavy` : page qui embarque un moteur de jeu (Phaser) ; elle n'est jamais préchargée en masse.
 * `game` : page d'un jeu du catalogue ; à la place de l'indicateur des pages, le chargeur commun des jeux s'affiche dès
 * l'arrivée sur la page, à l'emplacement du lecteur, et le reste jusqu'au jeu prêt (même chargeur que dans le catalogue).
 */
export function lazyRoute<P extends object>(load: () => Promise<ComponentType<P>>, options: { heavy?: boolean; game?: string } = {}): ComponentType<P> {
  let resolved: ComponentType<P> | null = null;
  const fetchPage = () => load().then((component) => {
    resolved = component;
    return component;
  });
  const Page = lazy(() => fetchPage().then((component) => ({ default: component })));
  ROUTES.push({ preload: fetchPage, heavy: Boolean(options.heavy) });
  function LazyRouteElement(props: P) {
    // Page déjà téléchargée : rendue directement, sans suspendre (aucun indicateur pour une page déjà présente).
    // Le choix est figé au montage : un nouveau rendu du parent ne remplace jamais la page par une autre instance.
    const [Ready] = useState(() => resolved);
    const page = Ready ? <Ready {...props} /> : <Page {...props} />;
    return (
      <RouteErrorBoundary>
        {options.game ? (
          // Le jalon « code du lecteur reçu » est rendu avec la page, dans la même attente : il n'est atteint qu'à son arrivée.
          <GameLoaderHost game={options.game} layout="page">
            <Suspense fallback={null}>
              <ReachMilestone id="player" />
              {page}
            </Suspense>
          </GameLoaderHost>
        ) : Ready ? (
          page
        ) : (
          <Suspense fallback={<RouteLoading />}>{page}</Suspense>
        )}
      </RouteErrorBoundary>
    );
  }
  return LazyRouteElement;
}

/** Télécharge d'avance les pages ordinaires (tests d'intégration). Les pages de jeu lourdes sont exclues. */
export function preloadRoutes() {
  return Promise.all(ROUTES.filter((route) => !route.heavy).map((route) => route.preload())).then(() => undefined);
}
