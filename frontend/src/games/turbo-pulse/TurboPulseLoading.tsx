import { useTranslation } from "react-i18next";

import styles from "./TurboPulseLoading.module.css";

export interface TurboPulseLoadingProps {
  /** Fraction réellement chargée (0 à 1) : moteur, décor du premier niveau et musique. */
  progress: number;
  /** Tout est prêt : l'écran s'efface en fondu, la partie commence. */
  finished: boolean;
}

// Écran de chargement intégré à la scène : discret, une barre lumineuse qui avance avec les ressources réellement reçues,
// et leur pourcentage. À 100 %, il s'efface et le jeu commence, complet (décor et musique compris).
export function TurboPulseLoading({ progress, finished }: TurboPulseLoadingProps) {
  const { t } = useTranslation("games");
  const percent = Math.min(100, Math.floor(progress * 100));
  return (
    <div className={`${styles.loading} ${finished ? styles.finished : ""}`} aria-hidden={finished}>
      <div className={styles.panel}>
        <p className={styles.title}>{t("turboPulse.game.loading.title")}</p>
        <div
          className={styles.track}
          role="progressbar"
          aria-label={t("turboPulse.game.loading.label")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.percent}>{percent} %</p>
      </div>
    </div>
  );
}
