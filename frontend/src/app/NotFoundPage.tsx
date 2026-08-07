import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  const { t } = useTranslation("common");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("notFound.eyebrow")}</p>
      <h1 className={styles.title}>{t("notFound.title")}</h1>
      <p className={styles.lead}>{t("notFound.description")}</p>
      <Link className={styles.back} to="/">
        {t("notFound.back")}
      </Link>
    </div>
  );
}
