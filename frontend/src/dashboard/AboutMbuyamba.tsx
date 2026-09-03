import { useTranslation } from "react-i18next";

import yambaHead from "../assets/yamba-head.jpg";
import styles from "./AboutMbuyamba.module.css";

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 4.5v17" />
      <path d="M9 7h6" />
    </svg>
  );
}

function ControllerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="8" width="19" height="10" rx="5" />
      <path d="M7 11v4" />
      <path d="M5 13h4" />
      <circle cx="15.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 9 11 13 15 21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}

// Présentation du produit, pas une fiche technique : ce que Mbuyamba
// Education est et pourquoi un élève a envie d'y rester. Prolonge
// visuellement les deux cartes du hero : mêmes deux couleurs (vert et
// orange, rien d'autre), même rayon asymétrique — pas une mosaïque de
// cartes de couleurs différentes.
export function AboutMbuyamba() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.about}>
      <ul className={styles.features}>
        <li className={styles.feature}>
          <span className={`${styles.featureIcon} ${styles.orange}`} aria-hidden="true">
            <BookIcon />
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.level.title")}</h3>
          <p className={styles.featureText}>{t("about.features.level.text")}</p>
        </li>

        <li className={styles.feature}>
          <span className={`${styles.featureIcon} ${styles.green}`} aria-hidden="true">
            <ControllerIcon />
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.play.title")}</h3>
          <p className={styles.featureText}>{t("about.features.play.text")}</p>
        </li>

        <li className={styles.feature}>
          <span className={`${styles.featureIcon} ${styles.orange}`} aria-hidden="true">
            <TrendIcon />
          </span>
          <h3 className={styles.featureTitle}>{t("about.features.progress.title")}</h3>
          <p className={styles.featureText}>{t("about.features.progress.text")}</p>
        </li>
      </ul>

      <article className={styles.yamba}>
        <img className={styles.yambaAvatar} src={yambaHead} alt="" />
        <div>
          <h3 className={styles.yambaTitle}>{t("about.yamba.title")}</h3>
          <p className={styles.yambaText}>{t("about.yamba.text")}</p>
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
