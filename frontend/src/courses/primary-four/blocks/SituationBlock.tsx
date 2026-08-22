import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface SituationBlockProps {
  textKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function SituationBlock({ textKey, completed, onValidated }: SituationBlockProps) {
  const { t } = useTranslation("primaryFour");
  return (
    <InfoStepShell eyebrowKey="blocks.situation.eyebrow" completed={completed} onValidated={onValidated} tone="situation">
      <p className={styles.situationText}>{t(textKey)}</p>
    </InfoStepShell>
  );
}
