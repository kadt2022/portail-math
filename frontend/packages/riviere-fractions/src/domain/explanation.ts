import type { AnswerOption, Challenge, MistakeCode, Written } from "./challenge";
import { gcd } from "./fraction";

// Explications après une erreur : la règle de la famille, appliquée aux nombres de la question, puis une ligne sur
// l'erreur que révèle la voie choisie. Le domaine fait tous les calculs ; l'interface ne fait que traduire la clé.

export type ExplanationParams = Readonly<Record<string, string>>;

export interface ExplanationLine {
  key: string;
  params: ExplanationParams;
}

export interface Explanation {
  rule: ExplanationLine;
  mistake: ExplanationLine | null;
}

/** Écriture texte d'une réponse (« 3 », « 1/2 ») : sans calcul, l'écriture telle qu'elle est montrée. */
export function writtenText(written: Written): string {
  return written.kind === "integer" ? String(written.value) : `${written.numerator}/${written.denominator}`;
}

function ruleOf(challenge: Challenge): ExplanationLine {
  const answer = writtenText(challenge.answer.written);
  const expression = challenge.expression;
  switch (expression.kind) {
    case "division":
      return {
        key: "explain.division",
        params: { dividend: String(expression.dividend), divisor: String(expression.divisor), answer },
      };
    case "fraction": {
      const { numerator, denominator } = expression.fraction;
      if (challenge.family === "simplify") {
        const factor = gcd(numerator, denominator);
        return { key: "explain.simplify", params: { numerator: String(numerator), denominator: String(denominator), factor: String(factor), answer } };
      }
      return { key: "explain.fractionAsDivision", params: { numerator: String(numerator), denominator: String(denominator), answer } };
    }
    case "equivalent": {
      const factor = expression.rightDenominator / expression.left.denominator;
      return {
        key: "explain.equivalent",
        params: {
          numerator: String(expression.left.numerator),
          denominator: String(expression.left.denominator),
          target: String(expression.rightDenominator),
          factor: String(factor),
          answer,
        },
      };
    }
    case "sum":
      return {
        key: "explain.sum",
        params: {
          first: String(expression.left.numerator),
          second: String(expression.right.numerator),
          total: String(expression.left.numerator + expression.right.numerator),
          denominator: String(expression.left.denominator),
          answer,
        },
      };
    case "fraction-of":
      return {
        key: "explain.fractionOf",
        params: { denominator: String(expression.part.denominator), quantity: String(expression.quantity), answer },
      };
  }
}

const MISTAKE_KEYS: Record<MistakeCode, string> = {
  "copied-divisor": "mistake.copiedDivisor",
  subtracted: "mistake.subtracted",
  halved: "mistake.halved",
  "numerator-only": "mistake.numeratorOnly",
  inverted: "mistake.inverted",
  neighbour: "mistake.neighbour",
  "added-instead-of-multiplied": "mistake.addedInsteadOfMultiplied",
  "numerator-unchanged": "mistake.numeratorUnchanged",
  "added-denominators": "mistake.addedDenominators",
  "kept-one-numerator": "mistake.keptOneNumerator",
  "remainder-instead-of-part": "mistake.remainderInsteadOfPart",
  "multiplied-instead-of-divided": "mistake.multipliedInsteadOfDivided",
  "copied-denominator": "mistake.copiedDenominator",
};

export function explain(challenge: Challenge, chosen: AnswerOption): Explanation {
  return {
    rule: ruleOf(challenge),
    mistake: chosen.mistake ? { key: MISTAKE_KEYS[chosen.mistake], params: { chosen: writtenText(chosen.written) } } : null,
  };
}

export const MISTAKE_TRANSLATION_KEYS: readonly string[] = Object.values(MISTAKE_KEYS);
