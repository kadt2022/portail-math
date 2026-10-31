import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon } from "../components/PortalIcon";
import styles from "./FreePathSection.module.css";

// Section autonome du tableau de bord : n'emprunte aucun style aux parcours scolaires.
export function FreePathSection() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.wrapper}>
    <section className={styles.section} aria-labelledby="free-path-title">
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t("section.eyebrow")}</p>
        <h2 id="free-path-title">{t("section.title")}</h2>
        <p className={styles.text}>{t("section.description")}</p>
        <Link to="/parcours-libre" className={styles.cta}>
          {t("section.action")} <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className={styles.tiles} aria-label={t("section.tilesLabel")}>
        <li className={styles.tileGre}>
          <PortalIcon name="cap" />
          <strong>{t("gre.sigil")}</strong>
          <span>{t("comingSoon")}</span>
        </li>
        <li className={styles.tileExetat}>
          <PortalIcon name="file" />
          <strong>{t("exetat.sigil")}</strong>
          <span>{t("available")}</span>
        </li>
      </ul>
    </section>
    </div>
  );
}
