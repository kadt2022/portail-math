import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { formatNumber } from "../number-words";
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
  const { t, i18n } = useTranslation("primaryFour");
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
        {t("exercise.numberInRange.prompt", {
          min: formatNumber(exercise.min, i18n.language),
          max: formatNumber(exercise.max, i18n.language),
        })}
      </p>
      <input
        type="number"
        inputMode="numeric"
        className={styles.sequenceInput}
        value={value}
        aria-label={t("exercise.numberInRange.prompt", {
          min: formatNumber(exercise.min, i18n.language),
          max: formatNumber(exercise.max, i18n.language),
        })}
        onChange={(event) => {
          setValue(event.target.value);
          reset();
        }}
      />
    </ActivityShell>
  );
}
