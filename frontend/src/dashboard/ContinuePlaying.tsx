import { useTranslation } from "react-i18next";

import { ExploreScene } from "../games/GameScenes";
import styles from "./ContinuePlaying.module.css";

// État neutre uniquement : cette PR ne lit pas la progression enregistrée.
// Un récit dédié branchera ici la vraie reprise de partie.
export function ContinuePlaying() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.section} aria-labelledby="continuer-titre">
      <h2 id="continuer-titre" className={styles.heading}>
        {t("continuePlaying.heading")}
      </h2>
      <div className={styles.card}>
        <div className={styles.illustration}>
          <ExploreScene />
        </div>
        <div className={styles.content}>
          <p className={styles.message}>{t("continuePlaying.message")}</p>
          <a className={styles.cta} href="#jeux-disponibles">
            {t("continuePlaying.cta")} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
