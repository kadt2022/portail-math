import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ActivityShell } from "../../components/exercise-kit/ActivityShell";
import kitStyles from "../../components/exercise-kit/exercise-kit.module.css";
import { NumericStepper } from "../../components/exercise-kit/NumericStepper";
import { useRoundedExercise } from "../../components/exercise-kit/use-rounds";
import styles from "../PrimaryFourLesson.module.css";
import { formatNumber } from "../number-words";
import type { ExerciseWidgetProps, PlaceValueBuildExercise } from "./exercise-types";

type PlaceValueBuilderProps = ExerciseWidgetProps<PlaceValueBuildExercise>;

// Rangs de la 4e primaire : dizaine de mille, unité de mille, centaine,
// dizaine, unité (nombres jusqu'à 100 000) — deux rangs de plus que le
// PlaceValueBuilder de la 3e primaire, qui s'arrête aux centaines. Ce widget
// reste propre à la 4e primaire (le nombre de rangs n'est pas partagé par le
// kit d'exercices générique) ; il réutilise en revanche `ActivityShell` et
// `NumericStepper` du kit.
const PLACES = [
  { key: "dm", divisor: 10000 },
  { key: "um", divisor: 1000 },
  { key: "c", divisor: 100 },
  { key: "d", divisor: 10 },
  { key: "u", divisor: 1 },
] as const;

function decompose(value: number) {
  let remainder = value;
  const digits: Record<(typeof PLACES)[number]["key"], number> = { dm: 0, um: 0, c: 0, d: 0, u: 0 };
  for (const place of PLACES) {
    digits[place.key] = Math.floor(remainder / place.divisor);
    remainder %= place.divisor;
  }
  return digits;
}

// « Je manipule » : l'enfant compose un nombre (ou une petite série de
// nombres dictés) en réglant les cinq compteurs DM/UM/C/D/U jusqu'à obtenir
// exactement la valeur de position attendue.
export function PlaceValueBuilder({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: PlaceValueBuilderProps) {
  const { t, i18n } = useTranslation("primaryFour");
  const lastTarget = exercise.targets[exercise.targets.length - 1];
  const lastExpected = decompose(lastTarget);
  const [digits, setDigits] = useState(completed ? lastExpected : decompose(0));
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    namespace: "primaryFour",
    roundCount: exercise.targets.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });

  const target = exercise.targets[round];
  const expected = decompose(target);

  const validate = () => {
    submit(
      PLACES.every((place) => digits[place.key] === expected[place.key]),
      () => setDigits(decompose(0)),
    );
  };

  return (
    <ActivityShell
      namespace="primaryFour"
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
      progressLabel={progressLabel}
    >
      <p className={kitStyles.targetNumber} aria-live="polite">
        {t("exercise.placeValue.target", { number: formatNumber(target, i18n.language) })}
      </p>
      <div className={styles.stickControls5}>
        {PLACES.map((place) => (
          <NumericStepper
            key={place.key}
            label={t(`exercise.placeValue.${place.key}`)}
            value={digits[place.key]}
            min={0}
            max={exercise.maxDigit}
            decreaseLabel={t("exercise.placeValue.decrease", { label: t(`exercise.placeValue.${place.key}`) })}
            increaseLabel={t("exercise.placeValue.increase", { label: t(`exercise.placeValue.${place.key}`) })}
            onChange={(value) => setDigits((current) => ({ ...current, [place.key]: value }))}
          />
        ))}
      </div>
      <strong className={kitStyles.placeValueRepresentation}>
        {t("exercise.placeValue.representation", {
          dm: digits.dm,
          um: digits.um,
          c: digits.c,
          d: digits.d,
          u: digits.u,
        })}
      </strong>
    </ActivityShell>
  );
}
