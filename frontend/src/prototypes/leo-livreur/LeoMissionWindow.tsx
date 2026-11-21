import { useEffect, useId, useRef, type ReactNode } from "react";

import { PizzaIcon } from "./LeoMissionIcons";
import styles from "./LeoMissionWindow.module.css";

export interface LeoMissionWindowProps {
  /** Intitulé court, aussi nom accessible de la fenêtre. */
  title: string;
  /** Placement fourni par l'écran hôte (zone de la scène), sinon toute la surface du parent positionné. */
  className?: string;
  /** Contenu principal : commandes, question, résultats. */
  children: ReactNode;
  /** Colonne d'action : pavé de réponse ou bouton pour continuer. À droite quand la hauteur manque. */
  side?: ReactNode;
}

/**
 * Fenêtre de la mission : carte flottante centrée sur la scène, qui laisse voir le décor autour. Elle gère seulement
 * le cadre (placement, en-tête, focus, apparition) ; le contenu est fourni par l'écran affiché.
 */
export function LeoMissionWindow({ title, className, children, side }: LeoMissionWindowProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLElement | null>(null);

  // Nouvelle fenêtre : le focus clavier y entre (sans faire défiler la page), pour la parcourir avec Tab.
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div className={className ? `${styles.overlay} ${className}` : styles.overlay}>
      <section ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className={styles.header}>
          <PizzaIcon />
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className={styles.main}>{children}</div>
        {side ? <div className={styles.side}>{side}</div> : null}
      </section>
    </div>
  );
}
