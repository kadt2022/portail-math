import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { loaderMessage, nextMessageChangeIn, type LoaderMessage } from "./loaderMessages";
import type { LoadingSession, LoadingSessionState } from "./loadingSession";
import styles from "./GameLoader.module.css";

export interface GameLoaderProps {
  session: LoadingSession;
  /** Habillage du jeu : variables --loading-* (fond, barre, textes). Par défaut, celui de Turbo Pulse. */
  theme?: CSSProperties;
  /** Fermer le jeu pendant le chargement (même action que le bouton Fermer du lecteur). */
  onClose?: () => void;
  /** Horloge (ms) : celle de la séance ; remplaçable dans les tests. */
  now?: () => number;
}

const MESSAGE_KEYS: Record<LoaderMessage, string> = {
  initWait: "loadingScreen.initWait",
  slow: "loadingScreen.slow",
  long: "loadingScreen.long",
};

/**
 * Message secondaire du moment, recalculé par un seul chronomètre programmé vers le prochain changement possible ; il
 * est supprimé quand le chargeur disparaît (jeu prêt, fermé, ou autre jeu ouvert).
 */
function useLoaderMessage(state: LoadingSessionState, now: () => number): LoaderMessage | null {
  const clock = () => ({ phase: state.phase, sinceStart: now() - state.startedAt, sincePhase: now() - state.phaseStartedAt });
  const [, setTick] = useState(0);
  const current = state.ready ? null : clock();
  useEffect(() => {
    if (state.ready) return;
    const timer = window.setTimeout(() => setTick((tick) => tick + 1), nextMessageChangeIn(clock()));
    return () => window.clearTimeout(timer);
  });
  return current ? loaderMessage(current) : null;
}

// Chargeur commun à tous les jeux du catalogue, en HTML et CSS seulement (aucune image, police ni moteur à télécharger).
// Affiché dès le clic, il reste le même de bout en bout : même fond, mêmes dimensions, même barre, mêmes positions ; seul
// le titre change avec la phase. La zone du message secondaire est réservée, pour que rien ne bouge quand il apparaît.
export function GameLoader({ session, theme, onClose, now = () => performance.now() }: GameLoaderProps) {
  const { t } = useTranslation("games");
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const message = useLoaderMessage(state, now);
  // Petite marge : 0,07 se calcule 0,0699999… en virgule flottante, et doit bien s'afficher 7 %.
  const percent = Math.min(100, Math.floor(state.progress * 100 + 1e-6));
  return (
    <div className={styles.loading} style={theme} data-phase={state.phase}>
      <div className={styles.panel}>
        <p className={styles.title}>{t(state.phase === "init" ? "loadingScreen.titleInit" : "loadingScreen.titleResources")}</p>
        <div className={styles.row}>
          <div
            className={styles.track}
            role="progressbar"
            aria-label={t("loadingScreen.label")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
          <span className={styles.percent}>{percent} %</span>
        </div>
        <div className={styles.message}>
          {state.failed ? (
            <>
              <p className={styles.failed} role="alert">
                {t("loadingScreen.failed")}
              </p>
              <button type="button" className={styles.retry} onClick={() => session.retry()}>
                {t("loadingScreen.retry")}
              </button>
            </>
          ) : message ? (
            <p className={styles.secondary} role="status">
              {t(MESSAGE_KEYS[message])}
            </p>
          ) : null}
        </div>
      </div>
      {onClose ? (
        <button type="button" className={styles.close} onClick={onClose}>
          {t("loadingScreen.close")}
        </button>
      ) : null}
    </div>
  );
}
