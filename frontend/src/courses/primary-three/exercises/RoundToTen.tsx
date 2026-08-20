import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { roundToNearestTen } from "../number-words";
import { ActivityShell } from "./ActivityShell";
import { ChoiceGroup } from "./ChoiceGroup";
import { useRoundedExercise } from "./use-rounds";
import type { ExerciseWidgetProps, RoundToTenExercise } from "./exercise-types";

type RoundToTenProps = ExerciseWidgetProps<RoundToTenExercise>;

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
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    roundCount: exercise.items.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });
  const [selected, setSelected] = useState<number | null>(
    completed ? roundToNearestTen(exercise.items[exercise.items.length - 1].value) : null,
  );

  const item = exercise.items[round];
  const answer = roundToNearestTen(item.value);
  const choices = answer < item.distractor ? [answer, item.distractor] : [item.distractor, answer];

  const validate = () => {
    submit(selected === answer, () => setSelected(null));
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
      <p className={styles.wordsPrompt} aria-live="polite">
        {t("exercise.roundToTen.question", { number: item.value })}
      </p>
      <ChoiceGroup choices={choices} selected={selected} ariaLabel={t(instructionKey)} onSelect={setSelected} />
    </ActivityShell>
  );
}
