import { useEffect, useRef, useState } from "react";

import styles from "./LeoAnswerPad.module.css";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Ajoute un chiffre (trois au plus, sans zéro inutile devant). */
const withDigit = (current: string, digit: string) => (current.length >= 3 ? current : current === "0" ? digit : current + digit);

export interface LeoAnswerPadProps {
  /** Unité affichée après la réponse (« pizzas », « parts »). */
  unit: string;
  onAnswer: (value: string) => void;
  /** Clavier de l'ordinateur écouté : faux quand le jeu est masqué (autre jeu, catalogue) ou en pause. */
  keyboard?: boolean;
}

/**
 * Une frappe concerne-t-elle cette question ? Oui si elle vient de sa fenêtre, ou d'aucun champ (focus sur la page
 * elle-même). Non si elle vient d'ailleurs : recherche du catalogue, autre champ, autre partie de la page.
 */
export function keyBelongsTo(scope: Element | null, target: EventTarget | null) {
  if (!scope || !(target instanceof Node)) return false;
  if (scope.contains(target)) return true;
  return target === document.body || target === document.documentElement;
}

/**
 * Saisie d'une réponse : champ de réponse et pavé numérique compact (3 colonnes), plus le clavier de l'ordinateur
 * (chiffres, Retour arrière, Entrée). Il ne juge pas la réponse : il la transmet. À remonter (clé) pour une autre question.
 */
export function LeoAnswerPad({ unit, onAnswer, keyboard = true }: LeoAnswerPadProps) {
  const [value, setValue] = useState("");
  const padRef = useRef<HTMLDivElement | null>(null);
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
    if (!keyboard) return;
    const onKey = (event: KeyboardEvent) => {
      // Fenêtre de la question (le pavé et son énoncé) : seules les frappes qui la concernent sont prises.
      const scope = padRef.current?.closest('[role="dialog"]') ?? padRef.current ?? null;
      if (!keyBelongsTo(scope, event.target)) return;
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
  }, [keyboard]);

  return (
    <div ref={padRef} className={styles.pad}>
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
