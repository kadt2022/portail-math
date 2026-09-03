import { useTranslation } from "react-i18next";

import yambaHead from "../assets/yamba-head.jpg";
import styles from "./LearningJourney.module.css";

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

// Prolongement narratif du hero, pas une section publicitaire à part : les
// deux cartes du haut (apprendre / jouer) se poursuivent ici en deux
// chemins, qui convergent vers Yamba et la progression. Aucune donnée
// enregistrée n'est lue ici — les liens mènent vers les mêmes pages que le
// reste du tableau de bord.
export function LearningJourney() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.journey} aria-labelledby="parcours-titre">
      <h2 id="parcours-titre" className={styles.srOnly}>
        {t("journey.heading")}
      </h2>

      <div className={styles.paths}>
        <a className={`${styles.path} ${styles.pathLearn}`} href="/app/apprentissages/primaire/1/mathematiques">
          <span className={styles.pathIcon}>
            <BookIcon />
          </span>
          <span className={styles.pathLabel}>{t("journey.learn.label")}</span>
          <span className={styles.pathSteps}>
            {t("journey.learn.step1")} <span aria-hidden="true">→</span> {t("journey.learn.step2")}
          </span>
        </a>

        <a className={`${styles.path} ${styles.pathPlay}`} href="#jeux-disponibles">
          <span className={styles.pathIcon}>
            <ControllerIcon />
          </span>
          <span className={styles.pathLabel}>{t("journey.play.label")}</span>
          <span className={styles.pathSteps}>
            {t("journey.play.step1")} <span aria-hidden="true">→</span> {t("journey.play.step2")}
          </span>
        </a>
      </div>

      <div className={styles.arrows} aria-hidden="true">
        <span className={styles.arrow} />
        <span className={styles.arrow} />
      </div>

      <a className={styles.convergence} href="/app/progression">
        <img className={styles.yambaAvatar} src={yambaHead} alt="" />
        <span className={styles.convergenceText}>{t("journey.convergence.text")}</span>
        <span className={styles.convergenceCta}>
          {t("journey.convergence.cta")} <span aria-hidden="true">→</span>
        </span>
      </a>
    </section>
  );
}
