import type { Expression, Written } from "../domain/challenge";

// Ce que l'interface et la scène affichent d'une question : des morceaux d'écriture, sans aucun calcul. La scène 3D
// reçoit des étiquettes de panneaux toutes prêtes ; elle ne sait pas ce qu'est une fraction.

export type SignLabel = { kind: "stacked"; numerator: string; denominator: string } | { kind: "text"; text: string };

export type QuestionPart =
  | { kind: "number"; value: string }
  | { kind: "fraction"; numerator: string; denominator: string }
  | { kind: "operator"; symbol: "÷" | "+" | "=" }
  | { kind: "word"; key: "word.of" }
  | { kind: "unknown" }
  /** Fraction dont le numérateur est l'inconnue (2/3 = ?/9). */
  | { kind: "fraction-unknown-numerator"; denominator: string };

export function signLabelOf(written: Written): SignLabel {
  return written.kind === "integer"
    ? { kind: "text", text: String(written.value) }
    : { kind: "stacked", numerator: String(written.numerator), denominator: String(written.denominator) };
}

export function answerText(written: Written): string {
  return written.kind === "integer" ? String(written.value) : `${written.numerator}/${written.denominator}`;
}

const fractionPart = (numerator: number, denominator: number): QuestionPart => ({ kind: "fraction", numerator: String(numerator), denominator: String(denominator) });

export function questionParts(expression: Expression): QuestionPart[] {
  const equalsUnknown: QuestionPart[] = [{ kind: "operator", symbol: "=" }, { kind: "unknown" }];
  switch (expression.kind) {
    case "division":
      return [{ kind: "number", value: String(expression.dividend) }, { kind: "operator", symbol: "÷" }, { kind: "number", value: String(expression.divisor) }, ...equalsUnknown];
    case "fraction":
      return [fractionPart(expression.fraction.numerator, expression.fraction.denominator), ...equalsUnknown];
    case "equivalent":
      return [
        fractionPart(expression.left.numerator, expression.left.denominator),
        { kind: "operator", symbol: "=" },
        { kind: "fraction-unknown-numerator", denominator: String(expression.rightDenominator) },
      ];
    case "sum":
      return [
        fractionPart(expression.left.numerator, expression.left.denominator),
        { kind: "operator", symbol: "+" },
        fractionPart(expression.right.numerator, expression.right.denominator),
        ...equalsUnknown,
      ];
    case "fraction-of":
      return [fractionPart(expression.part.numerator, expression.part.denominator), { kind: "word", key: "word.of" }, { kind: "number", value: String(expression.quantity) }, ...equalsUnknown];
  }
}
