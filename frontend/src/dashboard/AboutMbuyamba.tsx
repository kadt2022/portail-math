import { useTranslation } from "react-i18next";

import yambaHead from "../assets/yamba-head.jpg";
import styles from "./AboutMbuyamba.module.css";

// Présentation du produit, pas une fiche technique : ce que Mbuyamba
// Education est et pourquoi un élève a envie d'y rester. Prolonge
// visuellement les deux cartes du hero (mêmes couleurs, mêmes rayons
// asymétriques) sans reprendre leur forme — pas de rectangle blanc
// centré, pas de grille de quatre cases identiques.
export function AboutMbuyamba() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.about} aria-labelledby="a-propos-titre">
      <div className={styles.signs} aria-hidden="true">
        <span>+</span>
        <span>×</span>
        <span>9</span>
      </div>

      <div className={styles.intro}>
        <h2 id="a-propos-titre" className={styles.title}>
          {t("about.title")}
        </h2>
        <p className={styles.tagline}>{t("about.tagline")}</p>
        <p className={styles.description}>{t("about.description")}</p>
      </div>

      <div className={styles.features}>
        <article className={`${styles.feature} ${styles.featureLevel}`}>
          <span className={styles.featureIcon} aria-hidden="true">
            📚
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.level.title")}</h3>
          <p className={styles.featureText}>{t("about.features.level.text")}</p>
        </article>

        <article className={`${styles.feature} ${styles.featurePlay}`}>
          <span className={styles.featureIcon} aria-hidden="true">
            🎮
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.play.title")}</h3>
          <p className={styles.featureText}>{t("about.features.play.text")}</p>
        </article>

        <article className={`${styles.feature} ${styles.featureProgress}`}>
          <span className={styles.featureIcon} aria-hidden="true">
            📈
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.progress.title")}</h3>
          <p className={styles.featureText}>{t("about.features.progress.text")}</p>
        </article>
      </div>

      <article className={styles.yamba}>
        <img className={styles.yambaAvatar} src={yambaHead} alt="" />
        <div>
          <h3 className={styles.featureTitle}>{t("about.yamba.title")}</h3>
          <p className={styles.featureText}>{t("about.yamba.text")}</p>
        </div>
      </article>

      <p className={styles.conclusion}>{t("about.conclusion")}</p>

      <div className={styles.ctas}>
        <a className={`${styles.cta} ${styles.ctaPrimary}`} href="/app/apprentissages/primaire/1/mathematiques">
          {t("about.ctaCourses")} <span aria-hidden="true">→</span>
        </a>
        <a className={`${styles.cta} ${styles.ctaSecondary}`} href="#jeux-disponibles">
          {t("about.ctaGames")} <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
