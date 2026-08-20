import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { roundToNearestTen } from "../number-words";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { RoundToTenExercise } from "./exercise-types";

interface RoundToTenProps {
  exercise: RoundToTenExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

export function RoundToTen({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: RoundToTenProps) {
  const { t } = useTranslation("primaryThree");
  const [round, setRound] = useState(completed ? exercise.items.length - 1 : 0);
  const [selected, setSelected] = useState<number | null>(
    completed ? roundToNearestTen(exercise.items[exercise.items.length - 1].value) : null,
  );
  const { attempts, registerWrong, reset } = useAttempts();

  const item = exercise.items[round];
  const answer = roundToNearestTen(item.value);
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);
  const choices = answer < item.distractor ? [answer, item.distractor] : [item.distractor, answer];

  const validate = () => {
    if (selected === answer) {
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
      <p className={styles.wordsPrompt} aria-live="polite">
        {t("exercise.roundToTen.question", { number: item.value })}
      </p>
      <div className={styles.wordsChoices} role="group" aria-label={t(instructionKey)}>
        {choices.map((value) => (
          <button
            key={value}
            type="button"
            className={selected === value ? styles.selectedChoice : undefined}
            aria-pressed={selected === value}
            onClick={() => setSelected(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </ActivityShell>
  );
}
