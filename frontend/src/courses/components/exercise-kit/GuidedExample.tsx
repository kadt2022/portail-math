import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { InfoStepShell } from "./InfoStepShell";

interface GuidedExampleProps {
  namespace: string;
  methodKey: string;
  promptKeys: readonly string[];
  completed: boolean;
  onValidated: () => void;
}

// « Exemple guidé » : la méthode générique du cours (représenter, estimer,
// calculer, vérifier, phrase-réponse...) suivie des questions Facile /
// Intermédiaire / Réflexion du livre, affichées à titre d'exemple résolu
// pas à pas.
export function GuidedExample({ namespace, methodKey, promptKeys, completed, onValidated }: GuidedExampleProps) {
  const { t } = useTranslation(namespace);
  const methodSteps = t(methodKey, { returnObjects: true }) as string[];

  return (
    <InfoStepShell
      namespace={namespace}
      eyebrowKey="blocks.example.eyebrow"
      completed={completed}
      onValidated={onValidated}
      tone="example"
    >
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
