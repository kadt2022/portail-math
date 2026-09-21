import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { ActivityShell } from "./ActivityShell";
import { ChoiceGroup } from "./ChoiceGroup";
import type { NumericQuestionExercise, SharedExerciseWidgetProps } from "./shared-exercise-types";
import { hintForAttempts, useAttempts } from "./use-attempts";

type NumericQuestionProps = SharedExerciseWidgetProps<NumericQuestionExercise>;

export function NumericQuestion({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
  namespace,
  formatNumber,
  validateAnswer,
}: NumericQuestionProps) {
  const { t } = useTranslation(namespace);
  const [value, setValue] = useState(completed && exercise.answer !== undefined ? String(exercise.answer) : "");
  const [selected, setSelected] = useState<number | null>(completed ? (exercise.answer ?? null) : null);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = async () => {
    const given = exercise.choices ? selected : Number(value);
    if (given === null || (!exercise.choices && value.trim() === "")) {
      registerWrong();
      return;
    }
    const correct = validateAnswer
      ? await validateAnswer(0, given)
      : given === exercise.answer;
    if (correct) {
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
          labelFor={formatNumber}
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
