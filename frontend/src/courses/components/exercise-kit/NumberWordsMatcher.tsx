import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./exercise-kit.module.css";
import { ActivityShell } from "./ActivityShell";
import { ChoiceGroup } from "./ChoiceGroup";
import type { NumberWordsMatchExercise, SharedExerciseWidgetProps } from "./shared-exercise-types";
import { useRoundedExercise } from "./use-rounds";

interface NumberWordsMatcherProps extends SharedExerciseWidgetProps<NumberWordsMatchExercise> {
  // Chaque cours a sa propre étendue de nombres en toutes lettres (0-999 en
  // 3e, 0-99 999 en 4e) : ce widget reste agnostique de cette règle de
  // grammaire et reçoit la fonction déjà résolue pour la langue courante.
  wordsOf: (value: number) => string;
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
  namespace,
  formatNumber,
  wordsOf,
}: NumberWordsMatcherProps) {
  const { t } = useTranslation(namespace);
  const { round, feedback, progressLabel, submit } = useRoundedExercise({
    namespace,
    roundCount: exercise.items.length,
    completed,
    hintKey,
    strongHintKey,
    onValidated,
  });
  const [selected, setSelected] = useState<number | null>(completed ? exercise.items[exercise.items.length - 1].value : null);

  const item = exercise.items[round];

  const choiceValues = useMemo(
    () => shuffle([item.value, ...item.distractors], round * 7 + item.value),
    [item, round],
  );

  const validate = () => {
    submit(selected === item.value, () => setSelected(null));
  };

  return (
    <ActivityShell
      namespace={namespace}
      titleKey={titleKey}
      instructionKey={instructionKey}
      completed={completed}
      feedback={feedback}
      onValidate={validate}
      progressLabel={progressLabel}
    >
      <p className={styles.wordsPrompt} aria-live="polite">
        {item.direction === "digits-to-words" ? formatNumber(item.value) : wordsOf(item.value)}
      </p>
      <ChoiceGroup
        choices={choiceValues}
        selected={selected}
        ariaLabel={t(instructionKey)}
        onSelect={setSelected}
        labelFor={(value) => (item.direction === "digits-to-words" ? wordsOf(value) : formatNumber(value))}
      />
    </ActivityShell>
  );
}
