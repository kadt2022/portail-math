import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface ExplanationBlockProps {
  textKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function ExplanationBlock({ textKey, completed, onValidated }: ExplanationBlockProps) {
  const { t } = useTranslation("primaryThree");
  return (
    <InfoStepShell eyebrowKey="blocks.discover.eyebrow" completed={completed} onValidated={onValidated} tone="discover">
      <p className={styles.explanationText}>{t(textKey)}</p>
    </InfoStepShell>
  );
}
