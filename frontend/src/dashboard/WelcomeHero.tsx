import { useTranslation } from "react-i18next";

import styles from "./WelcomeHero.module.css";

export function WelcomeHero() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.heroGrid} aria-label={t("welcome.eyebrow")}>
      <div className={styles.welcomeCard}>
        <div className={styles.decorations} aria-hidden="true">
          <span className={styles.decorPlus}>+</span>
          <span className={styles.decorCircle}>◔</span>
          <span className={styles.decorTriangle}>△</span>
          <span className={styles.decorCube}>◇</span>
          <span className={styles.decorBars}>▥</span>
        </div>

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

      <article className={styles.childrenCard}>
        <div className={styles.imageWrap}>
          <img className={styles.photo} src="/images/enfants-revision.webp" alt="" />
          <div className={styles.photoGlow} aria-hidden="true" />
          <div className={styles.imageDecorations} aria-hidden="true">
            <span>+</span>
            <span>△</span>
            <span>◇</span>
          </div>
        </div>
        <div className={styles.learningContent}>
          <div>
            <p className={styles.learningEyebrow}>{t("learning.eyebrow")}</p>
            <h2 className={styles.learningTitle}>{t("learning.title")}</h2>
            <p className={styles.learningDescription}>{t("learning.description")}</p>
          </div>
          <a className={styles.courseCta} href="/app/apprentissages/primaire/1/mathematiques">
            {t("learning.exploreCourses")} <span aria-hidden="true">→</span>
          </a>
        </div>
      </article>
    </section>
  );
}
