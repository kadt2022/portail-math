import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { NumericStepper } from "./NumericStepper";
import { useRoundedExercise } from "./use-rounds";
import type { ExerciseWidgetProps, PlaceValueBuildExercise } from "./exercise-types";

type PlaceValueBuilderProps = ExerciseWidgetProps<PlaceValueBuildExercise>;

function decompose(value: number) {
  return {
    hundreds: Math.floor(value / 100),
    tens: Math.floor((value % 100) / 10),
    units: value % 10,
  };
}

// « Je manipule » : l'enfant compose un nombre (ou une petite série de
// nombres dictés) avec des plaques de 100, des barres de 10 et des unités,
// jusqu'à obtenir exactement la valeur de position attendue.
export function PlaceValueBuilder({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: PlaceValueBuilderProps) {
  const { t } = useTranslation("primaryThree");
  const lastTarget = exercise.targets[exercise.targets.length - 1];
  const lastExpected = decompose(lastTarget);
  const [hundreds, setHundreds] = useState(completed ? lastExpected.hundreds : 0);
  const [tens, setTens] = useState(completed ? lastExpected.tens : 0);
  const [units, setUnits] = useState(completed ? lastExpected.units : 0);
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    roundCount: exercise.targets.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });

  const target = exercise.targets[round];
  const expected = decompose(target);

  const validate = () => {
    submit(hundreds === expected.hundreds && tens === expected.tens && units === expected.units, () => {
      setHundreds(0);
      setTens(0);
      setUnits(0);
    });
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
      <p className={styles.targetNumber} aria-live="polite">
        {t("exercise.placeValue.target", { number: target })}
      </p>
      <div className={styles.stickControls}>
        <NumericStepper
          label={t("exercise.placeValue.hundreds")}
          value={hundreds}
          min={0}
          max={exercise.maxHundreds}
          decreaseLabel={t("exercise.placeValue.decrease", { label: t("exercise.placeValue.hundreds") })}
          increaseLabel={t("exercise.placeValue.increase", { label: t("exercise.placeValue.hundreds") })}
          onChange={setHundreds}
        />
        <NumericStepper
          label={t("exercise.placeValue.tens")}
          value={tens}
          min={0}
          max={exercise.maxTens}
          decreaseLabel={t("exercise.placeValue.decrease", { label: t("exercise.placeValue.tens") })}
          increaseLabel={t("exercise.placeValue.increase", { label: t("exercise.placeValue.tens") })}
          onChange={setTens}
        />
        <NumericStepper
          label={t("exercise.placeValue.units")}
          value={units}
          min={0}
          max={exercise.maxUnits}
          decreaseLabel={t("exercise.placeValue.decrease", { label: t("exercise.placeValue.units") })}
          increaseLabel={t("exercise.placeValue.increase", { label: t("exercise.placeValue.units") })}
          onChange={setUnits}
        />
      </div>
      <div className={styles.placeValuePreview} aria-hidden="true">
        <div className={styles.hundredPlates}>
          {Array.from({ length: hundreds }, (_, index) => (
            <span key={index} className={styles.hundredPlate} />
          ))}
        </div>
        <div className={styles.tenRods}>
          {Array.from({ length: tens }, (_, index) => (
            <span key={index} className={styles.tenRod} />
          ))}
        </div>
        <div className={styles.unitCubes}>
          {Array.from({ length: units }, (_, index) => (
            <span key={index} className={styles.unitCube} />
          ))}
        </div>
      </div>
      <strong className={styles.placeValueRepresentation}>
        {t("exercise.placeValue.representation", { hundreds, tens, units })}
      </strong>
    </ActivityShell>
  );
}
