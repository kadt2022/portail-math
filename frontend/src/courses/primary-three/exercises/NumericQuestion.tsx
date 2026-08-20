import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { NumericQuestionExercise } from "./exercise-types";

interface NumericQuestionProps {
  exercise: NumericQuestionExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

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
      {exercise.choices ? (
        <div className={styles.wordsChoices} role="group" aria-label={t(instructionKey)}>
          {exercise.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={selected === choice ? styles.selectedChoice : undefined}
              aria-pressed={selected === choice}
              onClick={() => {
                setSelected(choice);
                reset();
              }}
            >
              {choice}
            </button>
          ))}
        </div>
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
