import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import styles from "./AboutPage.module.css";

export function AboutPage() {
  const { t } = useTranslation("common");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("about.eyebrow")}</p>
      <h1>{t("about.title")}</h1>
      <p className={styles.lead}>{t("about.lead")}</p>
      <div className={styles.grid}>
        <section className={styles.card}>
          <p>{t("about.descriptionOne")}</p>
          <p>{t("about.descriptionTwo")}</p>
          <div className={styles.notice}>
            <strong>{t("about.noticeTitle")}</strong>
            <p>{t("about.notice")}</p>
          </div>
        </section>
        <aside className={styles.values} aria-label={t("about.valuesLabel")}>
          <h2>{t("about.valuesTitle")}</h2>
          <ul>
            <li>{t("about.valueSimple")}</li>
            <li>{t("about.valuePaths")}</li>
            <li>{t("about.valueFree")}</li>
          </ul>
          <Link to="/" className={styles.link}>
            {t("about.discover")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
