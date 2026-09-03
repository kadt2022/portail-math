import { useTranslation } from "react-i18next";

import yambaHead from "../assets/yamba-head.jpg";
import { dayPartAt } from "./greeting";
import styles from "./WelcomeHero.module.css";

// Symboles qui derivent lentement derriere le titre. Purement decoratifs :
// ils portent aria-hidden et disparaissent des que l'utilisateur demande
// moins d'animation (regle globale de tokens.css).
const FLOATING_SIGNS = ["+", "8", "x", "3", "=", "5"];

const QUICK_LINKS = [
  { key: "quickAccess.courses", href: "/app/apprentissages/primaire/1/mathematiques", tone: "brand" },
  { key: "quickAccess.games", href: "#jeux-disponibles", tone: "accent" },
  { key: "quickAccess.progress", href: "/app/progression", tone: "violet" },
] as const;

export function WelcomeHero() {
  const { t } = useTranslation("dashboard");
  const dayPart = dayPartAt(new Date());

  return (
    <section className={styles.heroGrid} aria-label={t("welcome.eyebrow")}>
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeMain}>
          <div className={styles.signs} aria-hidden="true">
            {FLOATING_SIGNS.map((sign, index) => (
              <span key={sign} className={styles[`sign${index + 1}`]}>
                {sign}
              </span>
            ))}
          </div>

          <div className={styles.content}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              {t("welcome.eyebrow")}
            </p>
            <h1 className={styles.title}>
              {t(`welcome.greeting.${dayPart}`)} <span>{t("welcome.titleLine2")}</span>
            </h1>
            <p className={styles.lead}>{t("welcome.description")}</p>
          </div>

          <div className={styles.yambaBubble}>
            <img src={yambaHead} alt="" />
            <span>{t("welcome.yambaTip")}</span>
          </div>
        </div>

        <div className={styles.welcomeFooter}>
          <a className={styles.cta} href="#jeux-disponibles">
            {t("welcome.exploreGames")} <span aria-hidden="true">→</span>
          </a>
          <nav className={styles.quickLinks} aria-label={t("quickAccess.heading")}>
            {QUICK_LINKS.map((link) => (
              <a key={link.key} className={`${styles.quickLink} ${styles[link.tone]}`} href={link.href}>
                {t(link.key)}
              </a>
            ))}
          </nav>
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
