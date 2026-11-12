import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { NumericStepper } from "./NumericStepper";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { EqualGroupsExercise, ExerciseWidgetProps } from "./exercise-types";

type EqualGroupsBuilderProps = ExerciseWidgetProps<EqualGroupsExercise>;

// « Je manipule » la multiplication : l'enfant fabrique des groupes égaux et
// voit le total se former avant d'écrire le calcul.
export function EqualGroupsBuilder({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: EqualGroupsBuilderProps) {
  const { t } = useTranslation("primaryThree");
  const [groups, setGroups] = useState(completed ? exercise.groups : 1);
  const [perGroup, setPerGroup] = useState(completed ? exercise.perGroup : 1);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (groups === exercise.groups && perGroup === exercise.perGroup) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>{t("exercise.groups.target", { groups: exercise.groups, perGroup: exercise.perGroup })}</p>
      <div className={styles.twoControls}>
        <NumericStepper
          label={t("exercise.groups.groups")}
          value={groups}
          min={1}
          max={10}
          decreaseLabel={t("exercise.groups.removeGroup")}
          increaseLabel={t("exercise.groups.addGroup")}
          onChange={(value) => {
            setGroups(value);
            reset();
          }}
        />
        <NumericStepper
          label={t("exercise.groups.perGroup")}
          value={perGroup}
          min={1}
          max={10}
          decreaseLabel={t("exercise.groups.removeItem")}
          increaseLabel={t("exercise.groups.addItem")}
          onChange={(value) => {
            setPerGroup(value);
            reset();
          }}
        />
      </div>
      <div className={styles.groupsPreview} aria-hidden="true">
        {Array.from({ length: groups }, (_, groupIndex) => (
          <span key={groupIndex} className={styles.groupBubble}>
            {Array.from({ length: perGroup }, (_, itemIndex) => (
              <i key={itemIndex} />
            ))}
          </span>
        ))}
      </div>
      <strong className={styles.placeValueRepresentation} aria-live="polite">
        {t("exercise.groups.total", { groups, perGroup, total: groups * perGroup })}
      </strong>
    </ActivityShell>
  );
}
