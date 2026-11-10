import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { ExerciseVisual } from "./ExerciseVisual";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, TextChoiceExercise } from "./exercise-types";

type TextChoiceProps = ExerciseWidgetProps<TextChoiceExercise>;

// Question à choix dont les réponses sont des phrases courtes ou des mots
// (opération, unité, figure...). Les libellés viennent de clés i18n.
export function TextChoice({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: TextChoiceProps) {
  const { t } = useTranslation("primaryThree");
  const [selected, setSelected] = useState<number | null>(completed ? exercise.answerIndex : null);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (selected === exercise.answerIndex) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.questionPrompt}>{t(exercise.promptKey, exercise.promptValues)}</p>
      {exercise.visual ? <ExerciseVisual visual={exercise.visual} /> : null}
      <div className={styles.textChoices} role="group" aria-label={t(instructionKey)}>
        {exercise.choiceKeys.map((choiceKey, index) => (
          <button
            key={choiceKey}
            type="button"
            className={selected === index ? styles.selectedChoice : undefined}
            aria-pressed={selected === index}
            onClick={() => {
              setSelected(index);
              reset();
            }}
          >
            {t(choiceKey)}
          </button>
        ))}
      </div>
    </ActivityShell>
  );
}
