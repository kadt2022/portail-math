import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { numberToWordsEn, numberToWordsFr } from "../number-words";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { NumberWordsMatchExercise } from "./exercise-types";

interface NumberWordsMatcherProps {
  exercise: NumberWordsMatchExercise;
  titleKey: string;
  instructionKey: string;
  hintKey: string;
  strongHintKey: string;
  completed: boolean;
  onValidated: () => void;
}

// Petit générateur pseudo-aléatoire déterministe (sans dépendance externe) :
// mêmes choix affichés à chaque rendu tant que la graine ne change pas, pour
// ne pas faire sauter les boutons sous le doigt de l'enfant après un clic.
function shuffle<T>(items: readonly T[], seed: number): T[] {
  const array = [...items];
  let state = seed + 1;
  for (let i = array.length - 1; i > 0; i -= 1) {
    state = (state * 48271) % 2147483647;
    const j = state % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function NumberWordsMatcher({
  exercise,
  titleKey,
  instructionKey,
  hintKey,
  strongHintKey,
  completed,
  onValidated,
}: NumberWordsMatcherProps) {
  const { t, i18n } = useTranslation("primaryThree");
  const wordsOf = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? numberToWordsEn : numberToWordsFr;
  const [round, setRound] = useState(completed ? exercise.items.length - 1 : 0);
  const [selected, setSelected] = useState<number | null>(completed ? exercise.items[exercise.items.length - 1].value : null);
  const { attempts, registerWrong, reset } = useAttempts();

  const item = exercise.items[round];
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const choiceValues = useMemo(
    () => shuffle([item.value, ...item.distractors], round * 7 + item.value),
    [item, round],
  );

  const validate = () => {
    if (selected === item.value) {
      if (round + 1 < exercise.items.length) {
        setRound(round + 1);
        setSelected(null);
        reset();
      } else {
        onValidated();
      }
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
      progressLabel={
        exercise.items.length > 1
          ? t("activity.progressRound", { current: round + 1, total: exercise.items.length })
          : undefined
      }
    >
      <p className={styles.wordsPrompt} aria-live="polite">
        {item.direction === "digits-to-words" ? item.value : wordsOf(item.value)}
      </p>
      <div className={styles.wordsChoices} role="group" aria-label={t(instructionKey)}>
        {choiceValues.map((value) => {
          const label = item.direction === "digits-to-words" ? wordsOf(value) : String(value);
          return (
            <button
              key={value}
              type="button"
              className={selected === value ? styles.selectedChoice : undefined}
              aria-pressed={selected === value}
              onClick={() => {
                setSelected(value);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </ActivityShell>
  );
}
