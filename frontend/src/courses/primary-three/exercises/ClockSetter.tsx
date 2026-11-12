import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { AnalogClock } from "./ExerciseVisual";
import { NumericStepper } from "./NumericStepper";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ClockSetExercise, ExerciseWidgetProps } from "./exercise-types";

type ClockSetterProps = ExerciseWidgetProps<ClockSetExercise>;

// « Tourne les aiguilles » : heures de 1 à 12 et minutes par pas de 5.
export function ClockSetter({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ClockSetterProps) {
  const { t } = useTranslation("primaryThree");
  const [hours, setHours] = useState(completed ? exercise.hours : 12);
  const [minutes, setMinutes] = useState(completed ? exercise.minutes : 0);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (hours === exercise.hours && minutes === exercise.minutes) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>{t("exercise.clock.target", { hours: exercise.hours, minutes: exercise.minutes })}</p>
      <div className={styles.clockLayout}>
        <AnalogClock hours={hours} minutes={minutes} />
        <div className={styles.twoControls}>
          <NumericStepper
            label={t("exercise.clock.hours")}
            value={hours}
            min={1}
            max={12}
            decreaseLabel={t("exercise.clock.removeHour")}
            increaseLabel={t("exercise.clock.addHour")}
            onChange={(value) => {
              setHours(value);
              reset();
            }}
          />
          <NumericStepper
            label={t("exercise.clock.minutes")}
            value={minutes}
            min={0}
            max={55}
            step={5}
            decreaseLabel={t("exercise.clock.removeMinutes")}
            increaseLabel={t("exercise.clock.addMinutes")}
            onChange={(value) => {
              setMinutes(value);
              reset();
            }}
          />
        </div>
      </div>
    </ActivityShell>
  );
}
