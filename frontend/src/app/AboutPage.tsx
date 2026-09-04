import { useTranslation } from "react-i18next";

import aboutClassroom from "../assets/about-classroom.webp";
import styles from "./AboutPage.module.css";

const STEP_KEYS = ["choose", "learn", "practice", "progress"] as const;

export function AboutPage() {
  const { t } = useTranslation("common");

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-story-title">
        <div className={styles.heroCopy}>
          <h1 id="about-story-title">{t("about.storyTitle")}</h1>
          <p className={styles.lead}>{t("about.storyLead")}</p>
          <p>{t("about.storyParagraphOne")}</p>
          <p>{t("about.storyParagraphTwo")}</p>
          <p>{t("about.storyParagraphThree")}</p>
          <blockquote>{t("about.storyQuote")}</blockquote>
        </div>

        <figure className={styles.heroVisual}>
          <img src={aboutClassroom} alt={t("about.imageAlt")} />
          <figcaption>{t("about.imageCaption")}</figcaption>
        </figure>
      </section>

      <section className={styles.howTo} aria-labelledby="about-how-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t("about.howEyebrow")}</p>
          <h2 id="about-how-title">{t("about.howTitle")}</h2>
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

      <section className={styles.vision} aria-labelledby="about-vision-title">
        <div className={styles.visionCopy}>
          <p className={styles.eyebrow}>{t("about.visionEyebrow")}</p>
          <h2 id="about-vision-title">{t("about.visionTitle")}</h2>
          <p className={styles.visionLead}>{t("about.visionLead")}</p>
          <p>{t("about.visionParagraphOne")}</p>
          <p>{t("about.visionParagraphTwo")}</p>

          <div className={styles.principles}>
            <div>
              <h3>{t("about.technologyTitle")}</h3>
              <p>{t("about.technologyText")}</p>
            </div>
            <div>
              <h3>{t("about.rootsTitle")}</h3>
              <p>{t("about.rootsText")}</p>
            </div>
          </div>
        </div>

        <aside className={styles.promise} aria-label={t("about.promiseLabel")}>
          <p className={styles.promiseEyebrow}>{t("about.promiseEyebrow")}</p>
          <h3>{t("about.promiseTitle")}</h3>
          <p>{t("about.promiseText")}</p>
          <strong>{t("about.promiseQuote")}</strong>
        </aside>
      </section>

      <footer className={styles.closing}>
        <p>{t("about.welcome")}</p>
        <strong>{t("about.closing")}</strong>
      </footer>
    </div>
  );
}
