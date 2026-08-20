import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { NumberOrderExercise } from "./exercise-types";

interface NumberOrdererProps {
  exercise: NumberOrderExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

function expectedOrder(exercise: NumberOrderExercise): number[] {
  const sorted = [...exercise.values].sort((a, b) => a - b);
  return exercise.direction === "ascending" ? sorted : sorted.reverse();
}

export function NumberOrderer({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: NumberOrdererProps) {
  const { t } = useTranslation("primaryThree");
  const [placed, setPlaced] = useState<number[]>(completed ? expectedOrder(exercise) : []);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);
  const remaining = exercise.values.filter((value) => !placed.includes(value));

  const validate = () => {
    const expected = expectedOrder(exercise);
    if (placed.length === expected.length && placed.every((value, index) => value === expected[index])) {
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
      <div className={styles.numberCards} aria-label={t("exercise.order.available")}>
        {remaining.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={t("exercise.order.pick", { number: value })}
            onClick={() => {
              setPlaced((current) => [...current, value]);
              reset();
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <ol className={styles.orderRow} aria-label={t("exercise.order.placed")}>
        {placed.map((value, index) => (
          <li key={value}>
            <button
              type="button"
              aria-label={t("exercise.order.removeFromPosition", { number: value, position: index + 1 })}
              onClick={() => {
                setPlaced((current) => current.filter((entry) => entry !== value));
                reset();
              }}
            >
              {value}
            </button>
          </li>
        ))}
        {Array.from({ length: exercise.values.length - placed.length }, (_, index) => (
          <li key={`empty-${index}`} className={styles.orderEmptySlot} aria-hidden="true">
            ?
          </li>
        ))}
      </ol>
    </ActivityShell>
  );
}
