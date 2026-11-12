import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { ChoiceGroup } from "./ChoiceGroup";
import { ExerciseVisual } from "./ExerciseVisual";
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
  const { t } = useTranslation("primaryThree");
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
      {exercise.visual ? <ExerciseVisual visual={exercise.visual} /> : null}
      {exercise.choices ? (
        <ChoiceGroup
          choices={exercise.choices}
          selected={selected}
          ariaLabel={t(instructionKey)}
          labelFor={exercise.unitKey ? (choice) => `${choice} ${t(exercise.unitKey ?? "")}` : undefined}
          onSelect={(choice) => {
            setSelected(choice);
            reset();
          }}
        />
      ) : (
        <div className={styles.answerLine}>
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
          {exercise.unitKey ? <span>{t(exercise.unitKey)}</span> : null}
        </div>
      )}
    </ActivityShell>
  );
}
