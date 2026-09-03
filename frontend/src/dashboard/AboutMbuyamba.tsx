import { useTranslation } from "react-i18next";

import yambaHead from "../assets/yamba-head.jpg";
import styles from "./AboutMbuyamba.module.css";

function ArrowDoodle() {
  return (
    <svg className={styles.doodleArrow} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M6 42 C10 16, 34 8, 50 18" fill="none" stroke="#e2762b" strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" />
      <path d="M40 9 L54 15 L45 26 Z" fill="#e2762b" />
    </svg>
  );
}

function StarDoodle() {
  return (
    <svg className={styles.doodleStar} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 L14.4 8.6 L21.5 9.2 L16 13.8 L17.8 20.8 L12 16.9 L6.2 20.8 L8 13.8 L2.5 9.2 L9.6 8.6 Z"
        fill="#f4a019"
      />
    </svg>
  );
}

function PlusDoodle() {
  return (
    <svg className={styles.doodlePlus} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" fill="#4f8fe0" />
    </svg>
  );
}

// Présentation du produit, pas une fiche technique : ce que Mbuyamba
// Education est et pourquoi un élève a envie d'y rester. Prolonge
// visuellement les deux cartes du hero (mêmes couleurs, mêmes rayons
// asymétriques) sans reprendre leur forme — pas de rectangle blanc
// centré, pas de grille de quatre cases identiques.
export function AboutMbuyamba() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.about} aria-labelledby="a-propos-titre">
      <div className={styles.wash} aria-hidden="true" />
      <ArrowDoodle />
      <StarDoodle />
      <PlusDoodle />

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
