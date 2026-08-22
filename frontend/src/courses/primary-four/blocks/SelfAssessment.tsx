import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";

interface SelfAssessmentProps {
  completed: boolean;
  onValidated: () => void;
}

const OPTIONS = ["alone", "withSupport", "retry"] as const;

// « AUTOÉVALUATION » du livre : aucune bonne ou mauvaise réponse, l'enfant
// choisit simplement comment il/elle a vécu l'évaluation avant de terminer.
export function SelfAssessment({ completed, onValidated }: SelfAssessmentProps) {
  const { t } = useTranslation("primaryFour");
  const [choice, setChoice] = useState<(typeof OPTIONS)[number] | null>(completed ? "alone" : null);

  return (
    <section className={styles.activityPanel} aria-labelledby="activity-title">
      <div className={styles.activityHeading}>
        <div>
          <p className={styles.activityEyebrow}>{t("blocks.assess.eyebrow")}</p>
          <h2 id="activity-title">{t("blocks.assess.prompt")}</h2>
        </div>
        {completed ? <span className={styles.successBadge}>✓ {t("status.completed")}</span> : null}
      </div>
      <fieldset className={styles.choiceList}>
        <legend className={styles.srOnly}>{t("blocks.assess.prompt")}</legend>
        {OPTIONS.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="self-assessment"
              value={option}
              checked={choice === option}
              onChange={() => setChoice(option)}
            />
            <span>{t(`blocks.assess.options.${option}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className={styles.validationRow}>
        <p className={styles.feedback} aria-live="polite" />
        {!completed ? (
          <button
            className={styles.validateButton}
            type="button"
            disabled={choice === null}
            onClick={onValidated}
          >
            {t("blocks.assess.confirm")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
