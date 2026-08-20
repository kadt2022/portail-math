import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface LessonSummaryProps {
  textKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function LessonSummary({ textKey, completed, onValidated }: LessonSummaryProps) {
  const { t } = useTranslation("primaryThree");
  return (
    <InfoStepShell eyebrowKey="blocks.remember.eyebrow" completed={completed} onValidated={onValidated} tone="remember">
      <blockquote className={styles.rule}>{t(textKey)}</blockquote>
    </InfoStepShell>
  );
}
