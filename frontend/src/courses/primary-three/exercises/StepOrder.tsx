import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, StepOrderExercise } from "./exercise-types";

type StepOrderProps = ExerciseWidgetProps<StepOrderExercise>;

// Remettre des étapes écrites dans l'ordre. Les étapes sont proposées à
// l'envers (jamais dans l'ordre juste), l'enfant les touche dans l'ordre voulu.
export function StepOrder({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: StepOrderProps) {
  const { t } = useTranslation("primaryThree");
  const [placed, setPlaced] = useState<readonly string[]>(completed ? exercise.stepKeys : []);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);
  const remaining = [...exercise.stepKeys].reverse().filter((key) => !placed.includes(key));

  const validate = () => {
    if (placed.length === exercise.stepKeys.length && placed.every((key, index) => key === exercise.stepKeys[index])) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <div className={styles.stepList} aria-label={t("exercise.steps.available")}>
        {remaining.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setPlaced((current) => [...current, key]);
              reset();
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <ol className={styles.stepPlaced} aria-label={t("exercise.steps.placed")}>
        {placed.map((key) => (
          <li key={key}>
            <button
              type="button"
              aria-label={t("exercise.steps.remove", { step: t(key) })}
              onClick={() => {
                setPlaced((current) => current.filter((entry) => entry !== key));
                reset();
              }}
            >
              {t(key)}
            </button>
          </li>
        ))}
      </ol>
    </ActivityShell>
  );
}
