import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";

interface InfoStepShellProps {
  namespace: string;
  eyebrowKey: string;
  completed: boolean;
  onValidated: () => void;
  children: ReactNode;
  tone: "situation" | "discover" | "example" | "remember";
}

// Coquille commune aux blocs non interactifs d'une leçon (situation,
// explication, exemple guidé, résumé) : ils n'ont rien à valider par
// l'enfant, juste un « j'ai compris » qui fait avancer la leçon comme les
// autres étapes.
export function InfoStepShell({ namespace, eyebrowKey, completed, onValidated, children, tone }: InfoStepShellProps) {
  const { t } = useTranslation(namespace);
  return (
    <section className={`${styles.infoPanel} ${styles[`infoPanel-${tone}`]}`} aria-labelledby="activity-title">
      <p className={styles.activityEyebrow} id="activity-title">
        {t(eyebrowKey)}
      </p>
      <div className={styles.infoContent}>{children}</div>
      <div className={styles.validationRow}>
        {completed ? <span className={styles.successBadge}>✓ {t("status.completed")}</span> : null}
        {!completed ? (
          <button className={styles.validateButton} type="button" onClick={onValidated}>
            {t("blocks.confirmContinue")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
