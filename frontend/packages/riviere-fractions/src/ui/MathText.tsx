import type { QuestionPart } from "../application/presentation";
import type { Translate } from "../i18n/messages";
import styles from "./RiverStage.module.css";

// Écriture mathématique en HTML : fractions en étages, opérateurs, inconnue. Aucun calcul ici, seulement de l'affichage.

export function StackedFraction({ numerator, denominator, label }: { numerator: string; denominator: string; label?: string }) {
  return (
    <span className={styles.fraction} role="img" aria-label={label ?? `${numerator} / ${denominator}`}>
      <span aria-hidden="true">{numerator}</span>
      <span className={styles.fractionBar} aria-hidden="true" />
      <span aria-hidden="true">{denominator}</span>
    </span>
  );
}

/** Une réponse écrite « 3 » ou « 1/2 », telle que la session la donne. */
export function AnswerText({ text }: { text: string }) {
  const [numerator, denominator] = text.split("/");
  return denominator ? <StackedFraction numerator={numerator} denominator={denominator} /> : <span className={styles.number}>{text}</span>;
}

export function QuestionText({ parts, t }: { parts: readonly QuestionPart[]; t: Translate }) {
  return (
    <span className={styles.expression}>
      {parts.map((part, index) => {
        switch (part.kind) {
          case "number":
            return <span key={index} className={styles.number}>{part.value}</span>;
          case "fraction":
            return <StackedFraction key={index} numerator={part.numerator} denominator={part.denominator} />;
          case "fraction-unknown-numerator":
            return <StackedFraction key={index} numerator="?" denominator={part.denominator} label={`? / ${part.denominator}`} />;
          case "operator":
            return <span key={index} className={styles.operator}>{part.symbol}</span>;
          case "word":
            return <span key={index} className={styles.word}>{t(part.key)}</span>;
          case "unknown":
            return <span key={index} className={styles.unknown}>?</span>;
        }
      })}
    </span>
  );
}
