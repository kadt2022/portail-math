import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { formatNumber } from "../number-words";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, NumberOrderExercise } from "./exercise-types";

type NumberOrdererProps = ExerciseWidgetProps<NumberOrderExercise>;

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
  const { t, i18n } = useTranslation("primaryFour");
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
            aria-label={t("exercise.order.pick", { number: formatNumber(value, i18n.language) })}
            onClick={() => {
              setPlaced((current) => [...current, value]);
              reset();
            }}
          >
            {formatNumber(value, i18n.language)}
          </button>
        ))}
      </div>
      <ol className={styles.orderRow} aria-label={t("exercise.order.placed")}>
        {placed.map((value, index) => (
          <li key={value}>
            <button
              type="button"
              aria-label={t("exercise.order.removeFromPosition", {
                number: formatNumber(value, i18n.language),
                position: index + 1,
              })}
              onClick={() => {
                setPlaced((current) => current.filter((entry) => entry !== value));
                reset();
              }}
            >
              {formatNumber(value, i18n.language)}
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
