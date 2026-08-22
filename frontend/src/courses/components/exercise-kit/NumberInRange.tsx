import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { ActivityShell } from "./ActivityShell";
import type { NumberInRangeExercise, SharedExerciseWidgetProps } from "./shared-exercise-types";
import { hintForAttempts, useAttempts } from "./use-attempts";

type NumberInRangeProps = SharedExerciseWidgetProps<NumberInRangeExercise>;

export function NumberInRange({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
  namespace,
  formatNumber,
}: NumberInRangeProps) {
  const { t } = useTranslation(namespace);
  const [value, setValue] = useState(completed ? String(exercise.min + 1) : "");
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    const given = Number(value);
    if (value.trim() !== "" && Number.isInteger(given) && given > exercise.min && given < exercise.max) {
      onValidated();
      return;
    }
    registerWrong();
  };

  const prompt = t("exercise.numberInRange.prompt", { min: formatNumber(exercise.min), max: formatNumber(exercise.max) });

  return (
    <ActivityShell
      namespace={namespace}
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
    >
      <p className={styles.questionPrompt}>{prompt}</p>
      <input
        type="number"
        inputMode="numeric"
        className={styles.sequenceInput}
        value={value}
        aria-label={prompt}
        onChange={(event) => {
          setValue(event.target.value);
          reset();
        }}
      />
    </ActivityShell>
  );
}
