import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";

export interface ActivityShellProps {
  namespace: string;
  titleKey: string;
  instructionKey: string;
  completed: boolean;
  feedback: string;
  progressLabel?: string;
  onValidate: () => void;
  children: ReactNode;
}

// Coquille visuelle partagée par tous les widgets d'exercice : titre,
// consigne, zone interactive fournie par l'appelant, puis retour immédiat
// (succès ou indice) et bouton de validation. Voir InfoStepShell pour les
// sections non interactives (situation, explication, résumé...).
export function ActivityShell({
  namespace,
  titleKey,
  instructionKey,
  completed,
  feedback,
  progressLabel,
  onValidate,
  children,
}: ActivityShellProps) {
  const { t } = useTranslation(namespace);
  return (
    <section className={styles.activityPanel} aria-labelledby="activity-title">
      <div className={styles.activityHeading}>
        <div>
          <p className={styles.activityEyebrow}>{t("lesson.objectiveLabel")}</p>
          <h2 id="activity-title">{t(titleKey)}</h2>
        </div>
        {completed ? <span className={styles.successBadge}>✓ {t("status.completed")}</span> : null}
      </div>
      <p className={styles.instruction}>{t(instructionKey)}</p>
      {progressLabel ? (
        <p className={styles.roundProgress} aria-live="polite">
          {progressLabel}
        </p>
      ) : null}
      <div className={styles.interactiveZone}>{children}</div>
      <div className={styles.validationRow}>
        <p className={completed ? styles.successMessage : styles.feedback} aria-live="polite">
          {completed ? t("activity.success") : feedback}
        </p>
        {!completed ? (
          <button className={styles.validateButton} type="button" onClick={onValidate}>
            {t("activity.validate")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
