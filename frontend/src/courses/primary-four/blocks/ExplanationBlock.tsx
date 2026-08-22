import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface ExplanationBlockProps {
  textKey: string;
  completed: boolean;
  onValidated: () => void;
  // Certaines leçons (ex. la valeur de position) accompagnent le texte
  // d'une petite figure tactile (voir PlaceValueRevealBoard) : la donnée de
  // leçon pilote sa présence, ce bloc reste générique.
  figure?: ReactNode;
}

export function ExplanationBlock({ textKey, completed, onValidated, figure }: ExplanationBlockProps) {
  const { t } = useTranslation("primaryFour");
  return (
    <InfoStepShell eyebrowKey="blocks.discover.eyebrow" completed={completed} onValidated={onValidated} tone="discover">
      <p className={styles.explanationText}>{t(textKey)}</p>
      {figure}
    </InfoStepShell>
  );
}
