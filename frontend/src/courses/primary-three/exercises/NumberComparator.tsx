import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { useRoundedExercise } from "./use-rounds";
import type { Comparator, CompareNumbersExercise, ExerciseWidgetProps } from "./exercise-types";

type NumberComparatorProps = ExerciseWidgetProps<CompareNumbersExercise>;

function comparatorOf(left: number, right: number): Comparator {
  if (left > right) return ">";
  if (left < right) return "<";
  return "=";
}

const SYMBOLS: readonly Comparator[] = ["<", "=", ">"];

export function NumberComparator({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: NumberComparatorProps) {
  const { t } = useTranslation("primaryThree");
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    roundCount: exercise.items.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });
  const [selected, setSelected] = useState<Comparator | null>(
    completed ? comparatorOf(exercise.items[exercise.items.length - 1].left, exercise.items[exercise.items.length - 1].right) : null,
  );

  const item = exercise.items[round];
  const expected = comparatorOf(item.left, item.right);

  const validate = () => {
    submit(selected === expected, () => setSelected(null));
  };

  return (
    <ActivityShell
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
      progressLabel={progressLabel}
    >
      <div className={styles.compareRow}>
        <span className={styles.compareNumber}>{item.left}</span>
        <div className={styles.compareSymbols} role="group" aria-label={t("exercise.compare.chooseSymbol")}>
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              className={selected === symbol ? styles.selectedChoice : undefined}
              aria-pressed={selected === symbol}
              aria-label={t(`exercise.compare.symbolLabel.${symbol === "<" ? "less" : symbol === ">" ? "greater" : "equal"}`)}
              onClick={() => setSelected(symbol)}
            >
              {symbol}
            </button>
          ))}
        </div>
        <span className={styles.compareNumber}>{item.right}</span>
      </div>
    </ActivityShell>
  );
}
