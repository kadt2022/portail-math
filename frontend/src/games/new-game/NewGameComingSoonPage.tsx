import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "./NewGameComingSoonPage.module.css";

// Écran d'attente pour /app/jeux/nouveau-jeu-react. Le vrai jeu arrive dans
// un récit dédié, construit sur le pont React–Phaser commun : cette page ne
// doit jamais laisser croire qu'une partie peut commencer.
export function NewGameComingSoonPage() {
  const { t } = useTranslation("games");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("comingSoonPage.eyebrow")}</p>
      <h1 className={styles.title}>{t("comingSoonPage.title")}</h1>
      <p className={styles.lead}>{t("comingSoonPage.description")}</p>
      <Link className={styles.back} to="/jeux">
        {t("comingSoonPage.back")}
      </Link>
    </div>
  );
}
