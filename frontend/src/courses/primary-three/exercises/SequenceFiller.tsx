import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { SequenceFillExercise } from "./exercise-types";

interface SequenceFillerProps {
  exercise: SequenceFillExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function SequenceFiller({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: SequenceFillerProps) {
  const { t } = useTranslation("primaryThree");
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
              {entry}
            </span>
          ),
        )}
      </div>
    </ActivityShell>
  );
}
