import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import styles from "./GameLoadingScreen.module.css";

export interface GameLoadingScreenProps {
  /** Fraction réellement chargée (0 à 1), en octets reçus. */
  progress: number;
  /** Tout ce qui est indispensable est prêt : l'écran s'efface en fondu, la partie commence. */
  finished: boolean;
  /** Une ressource indispensable n'a pas pu être téléchargée : message et bouton Réessayer à la place du pourcentage. */
  failed?: boolean;
  onRetry?: () => void;
  /** Habillage du jeu : variables --loading-* (fond, barre, textes). Par défaut, celui de Turbo Pulse. */
  theme?: CSSProperties;
  /**
   * Délai (ms) après lequel, si le chargement dure encore, un message invite à patienter (connexion lente). Le
   * téléchargement continue. Sans valeur, aucun message.
   */
  slowAfterMs?: number;
}

/** Durée du fondu de sortie (voir GameLoadingScreen.module.css). */
export const LOADING_FADE_MS = 400;

// Écran de chargement commun aux jeux, intégré à leur scène : discret, une barre qui avance avec les octets réellement
// reçus et leur pourcentage, sans répéter le nom du jeu. À 100 %, il s'efface et le jeu commence.
export function GameLoadingScreen({ progress, finished, failed = false, onRetry, theme, slowAfterMs }: GameLoadingScreenProps) {
  const { t } = useTranslation("games");
  const percent = Math.min(100, Math.floor(progress * 100));
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (slowAfterMs === undefined || finished) return;
    const timer = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(timer);
  }, [slowAfterMs, finished]);
  return (
    <div className={`${styles.loading} ${finished ? styles.finished : ""}`} aria-hidden={finished} style={theme}>
      <div className={styles.panel}>
        <p className={styles.title}>{t("loadingScreen.title")}</p>
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
        {failed ? (
          <>
            <p className={styles.failed} role="alert">
              {t("loadingScreen.failed")}
            </p>
            {onRetry ? (
              <button type="button" className={styles.retry} onClick={onRetry}>
                {t("loadingScreen.retry")}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.percent}>{percent} %</p>
            {slow && !finished ? (
              <p className={styles.slow} role="status">
                {t("loadingScreen.slow")}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
