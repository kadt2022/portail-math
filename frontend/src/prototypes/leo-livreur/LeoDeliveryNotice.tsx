import { useEffect, useRef } from "react";

import type { MissedNotice } from "./leoMission";
import styles from "./LeoDeliveryNotice.module.css";

/** Durée d'affichage de la notification (ms), sans bloquer la conduite. */
export const NOTICE_DURATION_MS = 6000;

/**
 * Livraison manquée : bandeau temporaire en haut de la scène. Non bloquant : il ne capte aucun geste, la conduite
 * continue dessous, et il s'efface seul. Annoncé aux lecteurs d'écran.
 */
export function LeoDeliveryNotice({ notice, onDismiss, className }: { notice: MissedNotice; onDismiss: () => void; className?: string }) {
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss.current(), NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className={className ? `${styles.layer} ${className}` : styles.layer}>
      <div className={styles.toast} role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false" className={styles.icon}>
          <path d="M12 3 2 21h20Z" fill="#f2b705" stroke="#8a5a00" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 9v6" stroke="#3b241c" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.4" fill="#3b241c" />
        </svg>
        <div>
          <strong>Livraison manquée !</strong>
          <p>Tu as dépassé le {notice.missed}. Les pizzas de cette maison sont toujours dans ta voiture.</p>
          <p>Prochaine destination : <strong>{notice.next}</strong>.</p>
        </div>
      </div>
    </div>
  );
}
