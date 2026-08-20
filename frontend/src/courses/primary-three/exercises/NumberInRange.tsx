import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, NumberInRangeExercise } from "./exercise-types";

type NumberInRangeProps = ExerciseWidgetProps<NumberInRangeExercise>;

export function NumberInRange({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: NumberInRangeProps) {
  const { t } = useTranslation("primaryThree");
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

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.questionPrompt}>
        {t("exercise.numberInRange.prompt", { min: exercise.min, max: exercise.max })}
      </p>
      <input
        type="number"
        inputMode="numeric"
        className={styles.sequenceInput}
        value={value}
        aria-label={t("exercise.numberInRange.prompt", { min: exercise.min, max: exercise.max })}
        onChange={(event) => {
          setValue(event.target.value);
          reset();
        }}
      />
    </ActivityShell>
  );
}
