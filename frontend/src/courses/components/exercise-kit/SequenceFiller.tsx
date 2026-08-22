import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { ActivityShell } from "./ActivityShell";
import type { SequenceFillExercise, SharedExerciseWidgetProps } from "./shared-exercise-types";
import { hintForAttempts, useAttempts } from "./use-attempts";

type SequenceFillerProps = SharedExerciseWidgetProps<SequenceFillExercise>;

export function SequenceFiller({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
  namespace,
  formatNumber,
}: SequenceFillerProps) {
  const { t } = useTranslation(namespace);
  const answer = exercise.sequence[exercise.blankIndex];
  const [value, setValue] = useState(completed ? String(answer) : "");
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (Number(value) === answer && value.trim() !== "") {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell
      namespace={namespace}
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
    >
      <div className={styles.sequenceRow} aria-label={t(instructionKey)}>
        {exercise.sequence.map((entry, index) =>
          index === exercise.blankIndex ? (
            <input
              key={index}
              type="number"
              inputMode="numeric"
              className={styles.sequenceInput}
              value={value}
              aria-label={t("exercise.sequence.blankLabel")}
              onChange={(event) => {
                setValue(event.target.value);
                reset();
              }}
            />
          ) : (
            <span key={index} className={styles.sequenceChip}>
              {formatNumber(entry)}
            </span>
          ),
        )}
      </div>
    </ActivityShell>
  );
}
