import { useState } from "react";

// Compte les essais infructueux d'un round d'exercice pour piloter l'aide
// progressive : un indice léger dès la première erreur, un indice plus
// détaillé à partir de la deuxième (voir ActivityShell + chaque widget).
export function useAttempts() {
  const [attempts, setAttempts] = useState(0);
  return {
    attempts,
    registerWrong: () => setAttempts((current) => current + 1),
    reset: () => setAttempts(0),
  };
}

export function hintForAttempts(
  attempts: number,
  t: (key: string) => string,
  hintKey: string,
  strongHintKey: string,
) {
  if (attempts <= 0) {
    return "";
  }
  return attempts === 1 ? t(hintKey) : t(strongHintKey);
}
