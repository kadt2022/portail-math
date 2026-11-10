import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { NumericStepper } from "./NumericStepper";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, ShareTokensExercise } from "./exercise-types";

type ShareTokensProps = ExerciseWidgetProps<ShareTokensExercise>;

// « Je manipule » la division : distribuer des jetons dans des bols, puis lire
// la part de chaque bol et ce qui reste.
export function ShareTokens({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ShareTokensProps) {
  const { t } = useTranslation("primaryThree");
  const share = Math.floor(exercise.total / exercise.bowls);
  const rest = exercise.total % exercise.bowls;
  const [perBowl, setPerBowl] = useState(completed ? share : 0);
  const [left, setLeft] = useState(completed ? rest : 0);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (perBowl === share && left === rest) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>{t("exercise.share.target", { total: exercise.total, bowls: exercise.bowls })}</p>
      <div className={styles.groupsPreview} aria-hidden="true">
        {Array.from({ length: exercise.bowls }, (_, bowlIndex) => (
          <span key={bowlIndex} className={styles.groupBubble}>
            {Array.from({ length: perBowl }, (_, itemIndex) => (
              <i key={itemIndex} />
            ))}
          </span>
        ))}
      </div>
      <div className={styles.twoControls}>
        <NumericStepper
          label={t("exercise.share.perBowl")}
          value={perBowl}
          min={0}
          max={exercise.total}
          decreaseLabel={t("exercise.share.removePerBowl")}
          increaseLabel={t("exercise.share.addPerBowl")}
          onChange={(value) => {
            setPerBowl(value);
            reset();
          }}
        />
        <NumericStepper
          label={t("exercise.share.left")}
          value={left}
          min={0}
          max={exercise.total}
          decreaseLabel={t("exercise.share.removeLeft")}
          increaseLabel={t("exercise.share.addLeft")}
          onChange={(value) => {
            setLeft(value);
            reset();
          }}
        />
      </div>
    </ActivityShell>
  );
}
