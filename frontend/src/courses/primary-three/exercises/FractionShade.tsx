import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, FractionShadeExercise } from "./exercise-types";

type FractionShadeProps = ExerciseWidgetProps<FractionShadeExercise>;

// L'enfant colorie des parts égales d'une bande pour représenter une fraction.
export function FractionShade({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: FractionShadeProps) {
  const { t } = useTranslation("primaryThree");
  const [shaded, setShaded] = useState<readonly boolean[]>(
    Array.from({ length: exercise.parts }, (_, index) => completed && index < exercise.shaded),
  );
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);
  const count = shaded.filter(Boolean).length;

  const validate = () => {
    if (count === exercise.shaded) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>{t("exercise.fraction.target", { shaded: exercise.shaded, parts: exercise.parts })}</p>
      <div className={styles.shadeBar} role="group" aria-label={t("exercise.fraction.bar", { parts: exercise.parts })}>
        {shaded.map((isOn, index) => (
          <button
            key={index}
            type="button"
            className={isOn ? styles.shadeCellOn : styles.shadeCell}
            aria-pressed={isOn}
            aria-label={t("exercise.fraction.part", { number: index + 1 })}
            onClick={() => {
              setShaded((current) => current.map((value, position) => (position === index ? !value : value)));
              reset();
            }}
          />
        ))}
      </div>
      <strong className={styles.placeValueRepresentation} aria-live="polite">
        {t("exercise.fraction.count", { shaded: count, parts: exercise.parts })}
      </strong>
    </ActivityShell>
  );
}
