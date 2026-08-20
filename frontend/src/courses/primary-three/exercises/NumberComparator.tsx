import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { Comparator, CompareNumbersExercise } from "./exercise-types";

interface NumberComparatorProps {
  exercise: CompareNumbersExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

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
  const [round, setRound] = useState(completed ? exercise.items.length - 1 : 0);
  const [selected, setSelected] = useState<Comparator | null>(
    completed ? comparatorOf(exercise.items[exercise.items.length - 1].left, exercise.items[exercise.items.length - 1].right) : null,
  );
  const { attempts, registerWrong, reset } = useAttempts();

  const item = exercise.items[round];
  const expected = comparatorOf(item.left, item.right);
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (selected === expected) {
      if (round + 1 < exercise.items.length) {
        setRound(round + 1);
        setSelected(null);
        reset();
      } else {
        onValidated();
      }
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
      progressLabel={
        exercise.items.length > 1
          ? t("activity.progressRound", { current: round + 1, total: exercise.items.length })
          : undefined
      }
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
