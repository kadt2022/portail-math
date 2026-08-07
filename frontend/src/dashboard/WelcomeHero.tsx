import { useTranslation } from "react-i18next";

import styles from "./WelcomeHero.module.css";

// h1 unique de la page : le tableau de bord n'en porte pas d'autre.
// La photo (images/enfants-revision.webp) existe déjà dans le portail —
// aucun doublon créé. Un voile dégradé assure la lisibilité du texte sans
// couvrir les enfants à droite.
export function WelcomeHero() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.hero}>
      <img className={styles.photo} src="/images/enfants-revision.webp" alt="" />
      <div className={styles.scrim} aria-hidden="true" />
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
    </section>
  );
}
