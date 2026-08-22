import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface GuidedExampleProps {
  methodKey: string;
  promptKeys: readonly string[];
  completed: boolean;
  onValidated: () => void;
}

// « Exemple guidé » : la méthode générique (représenter, estimer, calculer,
// vérifier, phrase-réponse) suivie des trois questions Facile / Intermédiaire
// / Réflexion du livre, affichées ici à titre d'exemple résolu pas à pas.
export function GuidedExample({ methodKey, promptKeys, completed, onValidated }: GuidedExampleProps) {
  const { t } = useTranslation("primaryFour");
  const methodSteps = t(methodKey, { returnObjects: true }) as string[];

  return (
    <InfoStepShell eyebrowKey="blocks.example.eyebrow" completed={completed} onValidated={onValidated} tone="example">
      <ol className={styles.methodList}>
        {methodSteps.map((sentence, index) => (
          <li key={index}>{sentence}</li>
        ))}
      </ol>
      <ul className={styles.promptList}>
        {promptKeys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </InfoStepShell>
  );
}
