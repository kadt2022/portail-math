import { useTranslation } from "react-i18next";

import styles from "./ProgressionPage.module.css";

// Route posée dès cette PR pour que l'actualisation directe fonctionne et que
// la navigation soit complète. La lecture réelle de la progression locale
// arrive dans un récit dédié : aucun accès à localStorage n'a lieu ici.
export function ProgressionPage() {
  const { t } = useTranslation("progress");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("page.eyebrow")}</p>
      <h1 className={styles.title}>{t("page.title")}</h1>
      <p className={styles.lead}>{t("page.description")}</p>
    </div>
  );
}
