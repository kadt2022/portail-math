import { useTranslation } from "react-i18next";

import styles from "./HowToUse.module.css";

const STEP_KEYS = ["choose", "learn", "practice", "progress"] as const;

export function HowToUse() {
  const { t } = useTranslation("common");

  return (
    <section className={styles.howTo} aria-labelledby="home-how-title">
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>{t("about.howEyebrow")}</p>
        <h2 id="home-how-title">{t("about.howTitle")}</h2>
        <p>{t("about.howLead")}</p>
      </div>

      <div className={styles.steps}>
        {STEP_KEYS.map((key, index) => (
          <article className={styles.step} key={key}>
            <span className={styles.stepNumber} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{t(`about.steps.${key}.title`)}</h3>
            <p>{t(`about.steps.${key}.description`)}</p>
          </article>
        ))}
      </div>

      <div className={styles.paceNote}>
        <strong>{t("about.paceTitle")}</strong>
        <p>{t("about.paceText")}</p>
      </div>
    </section>
  );
}
