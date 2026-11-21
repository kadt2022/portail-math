import { useEffect, useRef, useState } from "react";

import styles from "./LeoAnswerPad.module.css";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Ajoute un chiffre (trois au plus, sans zéro inutile devant). */
const withDigit = (current: string, digit: string) => (current.length >= 3 ? current : current === "0" ? digit : current + digit);

export interface LeoAnswerPadProps {
  /** Unité affichée après la réponse (« pizzas », « parts »). */
  unit: string;
  onAnswer: (value: string) => void;
}

/**
 * Saisie d'une réponse : champ de réponse et pavé numérique compact (3 colonnes), plus le clavier de l'ordinateur
 * (chiffres, Retour arrière, Entrée). Il ne juge pas la réponse : il la transmet. À remonter (clé) pour une autre question.
 */
export function LeoAnswerPad({ unit, onAnswer }: LeoAnswerPadProps) {
  const [value, setValue] = useState("");
  // Dernières valeurs lues par l'écoute du clavier, installée une seule fois.
  const latest = useRef({ value, onAnswer });
  useEffect(() => {
    latest.current = { value, onAnswer };
  });

  const submit = () => {
    if (latest.current.value === "") return;
    latest.current.onAnswer(latest.current.value);
    setValue("");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) setValue((current) => withDigit(current, event.key));
      else if (event.key === "Backspace") setValue((current) => current.slice(0, -1));
      else if (event.key === "Enter") {
        // Entrée sur un bouton qui a le focus : c'est ce bouton qui agit (pas de double saisie).
        if (event.target instanceof HTMLElement && event.target.closest("button")) return;
        if (latest.current.value === "") return;
        latest.current.onAnswer(latest.current.value);
        setValue("");
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.pad}>
      <output className={styles.answer} aria-live="polite" aria-label="Ta réponse">
        <span className={styles.answerLabel}>Réponse</span>
        <strong className={styles.answerValue} data-empty={value === ""}>{value === "" ? "?" : value}</strong>
        <span>{unit}</span>
      </output>
      <div className={styles.keys}>
        {KEYS.map((digit) => (
          <button key={digit} type="button" onClick={() => setValue((current) => withDigit(current, digit))}>{digit}</button>
        ))}
        <button type="button" className={styles.word} onClick={() => setValue((current) => current.slice(0, -1))} aria-label="Effacer le dernier chiffre">
          Effacer
        </button>
        <button type="button" onClick={() => setValue((current) => withDigit(current, "0"))}>0</button>
        <button type="button" className={`${styles.submit} ${styles.word}`} onClick={submit} disabled={value === ""}>
          Valider
        </button>
      </div>
    </div>
  );
}
