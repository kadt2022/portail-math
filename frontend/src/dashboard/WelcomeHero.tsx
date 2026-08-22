import { useTranslation } from "react-i18next";

import styles from "./WelcomeHero.module.css";

export function WelcomeHero() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.heroGrid} aria-label={t("welcome.eyebrow")}>
      <div className={styles.welcomeCard}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{t("welcome.eyebrow")}</p>
          <h1 className={styles.title}>
            {t("welcome.titleLine1")} <span>{t("welcome.titleLine2")}</span>
          </h1>
          <p className={styles.lead}>{t("welcome.description")}</p>
          <a className={styles.cta} href="#jeux-disponibles">
            {t("welcome.exploreGames")} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className={styles.childrenCard} aria-hidden="true">
        <img className={styles.photo} src="/images/enfants-revision.webp" alt="" />
      </div>
    </section>
  );
}
