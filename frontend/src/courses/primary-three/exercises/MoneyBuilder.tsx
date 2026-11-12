import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { NumericStepper } from "./NumericStepper";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, MoneyBuildExercise } from "./exercise-types";

type MoneyBuilderProps = ExerciseWidgetProps<MoneyBuildExercise>;

// Glouton : sert uniquement à pré-remplir l'état d'une étape déjà réussie.
function greedyCounts(target: number, cards: readonly number[]) {
  let remaining = target;
  const counts: Record<number, number> = {};
  for (const card of [...cards].sort((a, b) => b - a)) {
    counts[card] = Math.floor(remaining / card);
    remaining -= counts[card] * card;
  }
  return counts;
}

// Monnaie factice : l'enfant pose des cartes de valeurs données jusqu'à
// former exactement la somme demandée (parfois avec un nombre de cartes limité).
export function MoneyBuilder({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: MoneyBuilderProps) {
  const { t } = useTranslation("primaryThree");
  const [counts, setCounts] = useState<Record<number, number>>(
    completed ? greedyCounts(exercise.target, exercise.cards) : Object.fromEntries(exercise.cards.map((card) => [card, 0])),
  );
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);
  const total = exercise.cards.reduce((sum, card) => sum + card * (counts[card] ?? 0), 0);
  const cardCount = exercise.cards.reduce((sum, card) => sum + (counts[card] ?? 0), 0);

  const validate = () => {
    if (total === exercise.target && (exercise.maxCards === undefined || cardCount <= exercise.maxCards)) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>
        {t("exercise.money.target", { amount: exercise.target })}
        {exercise.maxCards !== undefined ? ` — ${t("exercise.money.maxCards", { count: exercise.maxCards })}` : ""}
      </p>
      <div className={styles.moneyControls}>
        {exercise.cards.map((card) => (
          <NumericStepper
            key={card}
            label={t("exercise.money.card", { amount: card })}
            value={counts[card] ?? 0}
            min={0}
            max={20}
            decreaseLabel={t("exercise.money.remove", { amount: card })}
            increaseLabel={t("exercise.money.add", { amount: card })}
            onChange={(value) => {
              setCounts((current) => ({ ...current, [card]: value }));
              reset();
            }}
          />
        ))}
      </div>
      <strong className={styles.placeValueRepresentation} aria-live="polite">
        {t("exercise.money.total", { amount: total, count: cardCount })}
      </strong>
    </ActivityShell>
  );
}
