import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ColumnCalcExercise, ExerciseWidgetProps } from "./exercise-types";

type ColumnCalcProps = ExerciseWidgetProps<ColumnCalcExercise>;

const COLUMN_NAMES = ["units", "tens", "hundreds", "thousands"] as const;

function expectedResult(exercise: ColumnCalcExercise) {
  switch (exercise.operation) {
    case "+":
      return exercise.left + exercise.right;
    case "-":
      return exercise.left - exercise.right;
    default:
      return exercise.left * exercise.right;
  }
}

// Opération posée : les nombres sont alignés par rang, l'enfant écrit le
// résultat chiffre par chiffre, de la droite (unités) vers la gauche.
export function ColumnCalc({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ColumnCalcProps) {
  const { t } = useTranslation("primaryThree");
  const expected = expectedResult(exercise);
  const width = Math.max(String(exercise.left).length, String(exercise.right).length, String(expected).length);
  const [digits, setDigits] = useState<readonly string[]>(
    completed ? String(expected).padStart(width, " ").split("").map((digit) => digit.trim()) : Array.from({ length: width }, () => ""),
  );
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    const given = digits.join("");
    if (given !== "" && Number(given) === expected) {
      onValidated();
      return;
    }
    registerWrong();
  };

  const padded = (value: number) => String(value).padStart(width, " ").split("");
  const operatorLabel = exercise.operation === "x" ? "×" : exercise.operation === "-" ? "−" : "+";

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <div className={styles.columnCalc} role="group" aria-label={t("exercise.column.label", { left: exercise.left, operator: operatorLabel, right: exercise.right })}>
        <div className={styles.columnRow} aria-hidden="true">
          {padded(exercise.left).map((digit, index) => (
            <span key={index}>{digit}</span>
          ))}
        </div>
        <div className={styles.columnRow} aria-hidden="true">
          {padded(exercise.right).map((digit, index) => (
            <span key={index}>{digit}</span>
          ))}
          <b>{operatorLabel}</b>
        </div>
        <div className={styles.columnResult}>
          {digits.map((digit, index) => {
            const rank = width - 1 - index;
            return (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                aria-label={t(`exercise.column.${COLUMN_NAMES[rank] ?? "units"}`)}
                onChange={(event) => {
                  const cleaned = event.target.value.replace(/\D/g, "").slice(-1);
                  setDigits((current) => current.map((value, position) => (position === index ? cleaned : value)));
                  reset();
                }}
              />
            );
          })}
        </div>
      </div>
    </ActivityShell>
  );
}
