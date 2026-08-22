import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryFourLesson.module.css";
import { formatNumber } from "../number-words";
import { ActivityShell } from "./ActivityShell";
import { ChoiceGroup } from "./ChoiceGroup";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, NumericQuestionExercise } from "./exercise-types";

type NumericQuestionProps = ExerciseWidgetProps<NumericQuestionExercise>;

export function NumericQuestion({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: NumericQuestionProps) {
  const { t, i18n } = useTranslation("primaryFour");
  const [value, setValue] = useState(completed ? String(exercise.answer) : "");
  const [selected, setSelected] = useState<number | null>(completed ? exercise.answer : null);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    const given = exercise.choices ? selected : Number(value);
    if (given === exercise.answer && (exercise.choices || value.trim() !== "")) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.questionPrompt}>{t(exercise.promptKey, exercise.promptValues)}</p>
      {exercise.choices ? (
        <ChoiceGroup
          choices={exercise.choices}
          selected={selected}
          ariaLabel={t(instructionKey)}
          onSelect={(choice) => {
            setSelected(choice);
            reset();
          }}
          labelFor={(value) => formatNumber(value, i18n.language)}
        />
      ) : (
        <input
          type="number"
          inputMode="numeric"
          className={styles.sequenceInput}
          value={value}
          aria-label={t(instructionKey)}
          onChange={(event) => {
            setValue(event.target.value);
            reset();
          }}
        />
      )}
    </ActivityShell>
  );
}
