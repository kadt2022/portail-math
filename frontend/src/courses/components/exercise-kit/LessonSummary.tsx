import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface LessonSummaryProps {
  namespace: string;
  textKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function LessonSummary({ namespace, textKey, completed, onValidated }: LessonSummaryProps) {
  const { t } = useTranslation(namespace);
  return (
    <InfoStepShell
      namespace={namespace}
      eyebrowKey="blocks.remember.eyebrow"
      completed={completed}
      onValidated={onValidated}
      tone="remember"
    >
      <blockquote className={styles.rule}>{t(textKey)}</blockquote>
    </InfoStepShell>
  );
}
