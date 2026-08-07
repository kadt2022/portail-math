import { useTranslation } from "react-i18next";

import styles from "./ProgressSummary.module.css";

const STAT_KEYS = [
  "progress.gamesStarted",
  "progress.challengesCompleted",
  "progress.firstTrySuccesses",
  "progress.correctedErrors",
];

// Emplacement réservé : aucune donnée réelle n'est lue dans cette PR. Le
// tiret évite d'afficher un faux zéro que l'enfant pourrait lire comme un
// échec.
export function ProgressSummary() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.section} aria-labelledby="progression-titre">
      <h2 id="progression-titre" className={styles.heading}>
        {t("progress.heading")}
      </h2>
      <div className={styles.grid}>
        {STAT_KEYS.map((key) => (
          <div className={styles.tile} key={key}>
            <p className={styles.value} aria-hidden="true">
              —
            </p>
            <p className={styles.label}>{t(key)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
