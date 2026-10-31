import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon } from "../components/PortalIcon";
import styles from "./FreePathSection.module.css";

// Carte du tableau de bord, posée sous les deux parcours scolaires : elle n'emprunte aucun style au tableau de bord.
export function FreePathSection() {
  const { t } = useTranslation("freePath");

  return (
    <section className={styles.card} aria-labelledby="free-path-title">
      <span className={styles.badge}><PortalIcon name="cap" /></span>
      <div className={styles.copy}>
        <h2 id="free-path-title">{t("section.title")}</h2>
        <p>{t("section.description")}</p>
      </div>
      <Link to="/parcours-libre" className={styles.cta}>
        {t("section.action")} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
