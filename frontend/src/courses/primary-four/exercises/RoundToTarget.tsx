import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ActivityShell } from "../../components/exercise-kit/ActivityShell";
import { ChoiceGroup } from "../../components/exercise-kit/ChoiceGroup";
import kitStyles from "../../components/exercise-kit/exercise-kit.module.css";
import { useRoundedExercise } from "../../components/exercise-kit/use-rounds";
import styles from "../PrimaryFourLesson.module.css";
import { formatNumber, roundToNearest } from "../number-words";
import type { ExerciseWidgetProps, RoundToTargetExercise } from "./exercise-types";

type RoundToTargetProps = ExerciseWidgetProps<RoundToTargetExercise>;

const ROUND_TO_LABEL_KEY: Record<number, string> = {
  10: "exercise.roundToTarget.unit.ten",
  100: "exercise.roundToTarget.unit.hundred",
  1000: "exercise.roundToTarget.unit.thousand",
  10000: "exercise.roundToTarget.unit.tenThousand",
};

// « Estimer et arrondir » (§18 du récit : « atteins la borne la plus
// proche ») : une ligne graduée place le nombre entre ses deux bornes de
// l'unité de rang demandée (dizaine, centaine, millier ou dizaine de
// mille), l'enfant choisit la borne la plus proche. Widget propre à la 4e
// primaire (l'arrondi à rang variable n'existe pas en 3e) ; réutilise
// `ActivityShell` et `ChoiceGroup` du kit d'exercices partagé.
export function RoundToTarget({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: RoundToTargetProps) {
  const { t, i18n } = useTranslation("primaryFour");
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    namespace: "primaryFour",
    roundCount: exercise.items.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });
  const [selected, setSelected] = useState<number | null>(
    completed
      ? roundToNearest(exercise.items[exercise.items.length - 1].value, exercise.items[exercise.items.length - 1].roundTo)
      : null,
  );

  const item = exercise.items[round];
  const answer = roundToNearest(item.value, item.roundTo);
  const lowerBound = Math.min(answer, item.distractor);
  const upperBound = Math.max(answer, item.distractor);
  const choices = answer < item.distractor ? [answer, item.distractor] : [item.distractor, answer];
  const position = upperBound === lowerBound ? 50 : ((item.value - lowerBound) / (upperBound - lowerBound)) * 100;

  const validate = () => {
    submit(selected === answer, () => setSelected(null));
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
      <p className={kitStyles.wordsPrompt} aria-live="polite">
        {t("exercise.roundToTarget.question", {
          number: formatNumber(item.value, i18n.language),
          unit: t(ROUND_TO_LABEL_KEY[item.roundTo]),
        })}
      </p>
      <div className={styles.numberLine} aria-hidden="true">
        <span className={styles.numberLineBound}>{formatNumber(lowerBound, i18n.language)}</span>
        <div className={styles.numberLineTrack}>
          <span className={styles.numberLineMarker} style={{ left: `${Math.min(96, Math.max(4, position))}%` }}>
            {formatNumber(item.value, i18n.language)}
          </span>
        </div>
        <span className={styles.numberLineBound}>{formatNumber(upperBound, i18n.language)}</span>
      </div>
      <ChoiceGroup
        choices={choices}
        selected={selected}
        ariaLabel={t(instructionKey)}
        onSelect={setSelected}
        labelFor={(value) => formatNumber(value, i18n.language)}
      />
    </ActivityShell>
  );
}
