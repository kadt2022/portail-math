import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface SituationBlockProps {
  namespace: string;
  textKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function SituationBlock({ namespace, textKey, completed, onValidated }: SituationBlockProps) {
  const { t } = useTranslation(namespace);
  return (
    <InfoStepShell
      namespace={namespace}
      eyebrowKey="blocks.situation.eyebrow"
      completed={completed}
      onValidated={onValidated}
      tone="situation"
    >
      <p className={styles.situationText}>{t(textKey)}</p>
    </InfoStepShell>
  );
}
