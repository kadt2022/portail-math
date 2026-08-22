import { useState } from "react";
import { useTranslation } from "react-i18next";

import { hintForAttempts, useAttempts } from "./use-attempts";

interface UseRoundedExerciseOptions {
  namespace: string;
  roundCount: number;
  completed: boolean;
  hintKey: string;
  strongHintKey: string;
  onValidated: () => void;
}

// Logique commune aux exercices à plusieurs manches (composer un nombre,
// associer mots/chiffres, comparer, arrondir...) : avancer d'une manche à la
// bonne réponse, rester sur place avec un indice à la mauvaise, terminer
// l'exercice à la dernière manche. Chaque widget ne garde que l'état propre
// à sa propre réponse (compteurs, sélection...). Paramétré par `namespace`
// pour rester réutilisable par n'importe quel cours.
export function useRoundedExercise({
  namespace,
  roundCount,
  completed,
  hintKey,
  strongHintKey,
  onValidated,
}: UseRoundedExerciseOptions) {
  const { t } = useTranslation(namespace);
  const [round, setRound] = useState(completed ? roundCount - 1 : 0);
  const { attempts, registerWrong, reset } = useAttempts();

  const submit = (isCorrect: boolean, resetRoundState: () => void) => {
    if (!isCorrect) {
      registerWrong();
      return;
    }
    if (round + 1 < roundCount) {
      setRound((current) => current + 1);
      resetRoundState();
      reset();
    } else {
      onValidated();
    }
  };

  return {
    round,
    feedback: hintForAttempts(attempts, t, hintKey, strongHintKey),
    progressLabel:
      roundCount > 1 ? t("activity.progressRound", { current: round + 1, total: roundCount }) : undefined,
    submit,
  };
}
